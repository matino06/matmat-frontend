<script>
  import { onDestroy, tick } from "svelte";
  import { closeAI } from "$lib/store/panels.svelte.js";
  import { currentTaskState } from "$lib/store/currentTask.svelte.js";
  import { aiQuoteState, clearAiQuote } from "$lib/store/aiQuote.svelte.js";
  import { apiClient } from "$lib/api/apiClient";
  import { renderMd } from "$lib/utils/markdownRenderer";
  import { splitSketches, sketchSrc, nextShown, stableEnd } from "$lib/utils/aiSketch.js";

  // The backend attaches at most this many images per request.
  const MAX_IMAGES = 4;

  const GENERIC_ERROR = "Došlo je do pogreške. Pokušaj ponovo.";
  // A thinking model can spend the whole token limit thinking and write nothing.
  const NO_ANSWER_ERROR =
    "AI je predugo razmišljao i nije stigao odgovoriti. Pokušaj ponovo ili postavi jednostavnije pitanje.";

  const RETRY_SKETCH = "Skica se prekinula. Nacrtaj je ponovo, jednostavniju i kraću.";

  const PENCIL_ICON = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>`;
  const SKETCH_PENDING = `<div class="ai-sketch ai-sketch-pending">${PENCIL_ICON}<span>Crtam skicu…</span></div>`;
  const SKETCH_FAILED = `<div class="ai-sketch ai-sketch-failed">${PENCIL_ICON}<span>Skica se nije uspjela dovršiti.</span><button type="button" class="btn btn-ghost" data-sketch-retry>Nacrtaj ponovo</button></div>`;

  // An AI answer as HTML: markdown as usual, each SVG sketch as an image. A
  // sketch still streaming in shows the "drawing" card; one that never finished
  // (or is broken) shows the fallback card with a retry button.
  function renderAnswer(text, { final = false } = {}) {
    return splitSketches(text)
      .map(seg => {
        if (seg.type === "md") return renderMd(seg.text);
        const src = seg.complete ? sketchSrc(seg.svg) : null;
        if (src) return `<figure class="ai-sketch"><img alt="Skica" src="${src}"/></figure>`;
        return final || seg.complete ? SKETCH_FAILED : SKETCH_PENDING;
      })
      .join("");
  }

  // An error whose message is written for the student. Anything else (a network
  // TypeError, an abort) is shown as GENERIC_ERROR instead of raw English text.
  class ChatError extends Error {}

  function greeting() {
    return {
      id: 0,
      role: "ai",
      content: `Bok! Tu sam ako ti nešto nije jasno. Pitaj bilo što o zadatku, rješenju ili konceptu iza njega.`,
      finalHtml: null,
      quote: null,
    };
  }

  let messages = $state([greeting()]);
  let draft = $state("");
  let isTyping = $state(false);
  let isWaiting = $state(false);
  let boardEl = $state(null);
  let inputEl = $state(null);

  let streamingMsgId = $state(null);
  let stableHtml = $state("");
  let currentText = $state("");

  // The backend's stored conversation for this chat, set from the `meta` event.
  // It's tied to one task — the backend 404s if the two don't match.
  let conversationId = null;
  // AbortController of the reply currently being fetched or typed out.
  let activeRun = null;

  const SUGGESTIONS = [
    "Objasni mi prvi korak",
    "Daj hint bez rješenja",
    "Zašto se koristi ova formula?",
  ];

  // Suggestions are a way to start, so they only show before the first question.
  let showSuggestions = $derived(messages.length <= 1);
  let canSend = $derived(!isWaiting && (draft.trim().length > 0 || !!aiQuoteState.quote));

  function autoResize(el) {
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  }

  // The student quoted a part of the task from the page — pin it above the input
  // and put the cursor there so they only have to type the question.
  $effect(() => {
    if (!aiQuoteState.quote) return;
    tick().then(() => {
      inputEl?.focus();
    });
  });

  function resetChat() {
    activeRun?.abort();
    activeRun = null;
    messages = [greeting()];
    conversationId = null;
    streamingMsgId = null;
    stableHtml = "";
    currentText = "";
    isTyping = false;
    isWaiting = false;
  }

  // A chat is about one task: moving to another task (or leaving the task page)
  // starts a fresh one. Closing and reopening the panel keeps it.
  let chatTaskId = currentTaskState.task?.id ?? null;
  $effect(() => {
    const id = currentTaskState.task?.id ?? null;
    if (id === chatTaskId) return;
    chatTaskId = id;
    resetChat();
  });

  onDestroy(() => activeRun?.abort());

  function truncate(text, max = 120) {
    if (!text) return "";
    return text.length > max ? text.slice(0, max).trimEnd() + "…" : text;
  }

  async function sendMessage() {
    const quote = aiQuoteState.quote;
    if ((!draft.trim() && !quote) || isWaiting) return;

    // A quote on its own is a complete request — the highlight says what it's about.
    const userMsg = draft.trim() || "Objasni mi ovaj dio.";
    draft = "";
    clearAiQuote();
    document.querySelectorAll("textarea").forEach(el => { el.style.height = "auto"; });

    messages = [...messages, { id: Date.now(), role: "user", content: userMsg, finalHtml: null, quote }];
    isTyping = true;
    isWaiting = true;

    const run = new AbortController();
    activeRun = run;
    setTimeout(() => {
      if (!run.signal.aborted) fetchAIResponse(userMsg, quote, run);
    }, 400);
  }

  // Reads the backend's SSE stream, calling onEvent(name, data) for each event.
  // Spring writes "data:{...}" with no space after the colon; one space is
  // accepted too. An event can be split across chunks, hence the buffer.
  async function readSse(response, onEvent) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let event = "message";
    let data = [];

    function dispatch() {
      if (data.length) {
        let parsed = null;
        try {
          parsed = JSON.parse(data.join("\n"));
        } catch {
          // malformed event, skip it
        }
        if (parsed) onEvent(event, parsed);
      }
      event = "message";
      data = [];
    }

    function feed(line) {
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (!line) return dispatch();
      if (line.startsWith(":")) return;
      const colon = line.indexOf(":");
      const field = colon === -1 ? line : line.slice(0, colon);
      let value = colon === -1 ? "" : line.slice(colon + 1);
      if (value.startsWith(" ")) value = value.slice(1);
      if (field === "event") event = value;
      else if (field === "data") data.push(value);
    }

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let idx;
        while ((idx = buffer.indexOf("\n")) !== -1) {
          feed(buffer.slice(0, idx));
          buffer = buffer.slice(idx + 1);
        }
      }
      buffer += decoder.decode();
      if (buffer) feed(buffer);
      dispatch();
    } catch (err) {
      reader.cancel().catch(() => {});
      throw err;
    }
  }

  async function fetchAIResponse(question, quote, run) {
    const { signal } = run;
    const aiMsgId = Date.now() + 1;
    let displayInterval = null;
    let started = false;

    // Typing works on positions: `received` is everything streamed in so far,
    // `shown` how much of it is on screen.
    let received = "";
    let shown = 0;
    let streaming = true;
    let stableRawText = "";

    // Called on the first delta: the bubble appears and starts typing while the
    // rest of the answer is still streaming in.
    function startTyping() {
      started = true;
      messages = [...messages, { id: aiMsgId, role: "ai", content: "", finalHtml: null }];
      isTyping = false;

      streamingMsgId = aiMsgId;
      stableHtml = "";
      currentText = "";

      displayInterval = setInterval(() => {
        const next = nextShown(received, shown, streaming);
        if (next === shown) return;
        shown = next;

        // Everything before the last paragraph break or finished sketch is
        // rendered once; only the tail is re-rendered on each tick.
        const text = received.slice(0, shown);
        const cut = stableEnd(text);
        const newStable = text.slice(0, cut);
        if (newStable !== stableRawText) {
          stableRawText = newStable;
          stableHtml = renderAnswer(newStable);
        }
        currentText = text.slice(cut);

        if (boardEl) boardEl.scrollTop = boardEl.scrollHeight;
      }, 22);
    }

    try {
      // An exam quote is about a past exam question, not about any open task.
      const taskId = quote?.source === "exam" ? null : (currentTaskState.task?.id ?? null);

      // The backend only reads this for chats without a task — task conversations
      // are stored on its side. The last message is the question itself.
      const history = messages
        .slice(0, -1)
        .filter(m => m.id !== 0 && !m.error)
        .map(m => ({ role: m.role === "user" ? "user" : "assistant", content: m.content }));

      const response = await apiClient("/ai/chat", {
        method: "POST",
        signal,
        body: JSON.stringify({
          conversationId: taskId === null ? null : conversationId,
          taskId,
          question,
          quote: quote
            ? {
                source: quote.source,
                // The pinned text is a short label for exam questions; the model
                // gets the full question, answer and marking instead.
                text: quote.context ?? quote.text,
                imageUrls: quote.images.map(i => i.src),
              }
            : null,
          history,
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          // The limit is set on the admin AI settings page, so no number here.
          throw new ChatError("Dosegnut je dnevni limit pitanja za AI asistenta. Pokušaj ponovo sutra.");
        }
        // The conversation doesn't exist or belongs to another task — start a
        // new one with the next question.
        if (response.status === 404) conversationId = null;
        throw new ChatError(GENERIC_ERROR);
      }

      let imagesAttached = 0;
      let messageId = null;
      let truncated = false;

      await readSse(response, (event, data) => {
        if (event === "meta") {
          conversationId = data.conversationId ?? null;
          imagesAttached = Number(data.imagesAttached) || 0;
        } else if (event === "delta") {
          if (!data.text) return;
          if (!started) startTyping();
          received += data.text;
        } else if (event === "done") {
          messageId = data.messageId ?? null;
          truncated = data.truncated === true;
        } else if (event === "error") {
          throw new ChatError(data.message || GENERIC_ERROR);
        }
      });

      if (!started) throw new ChatError(truncated ? NO_ANSWER_ERROR : GENERIC_ERROR);

      // The stream is done; let the typing catch up with what's left.
      streaming = false;
      await new Promise(resolve => {
        const check = setInterval(() => {
          if (shown >= received.length || signal.aborted) { clearInterval(check); resolve(); }
        }, 50);
      });
      signal.throwIfAborted();

      clearInterval(displayInterval);
      displayInterval = null;

      const notes = [];
      // A dropped image used to be invisible: the model would answer as if there
      // were no figure and nothing said otherwise. Say so instead.
      if (quote?.images?.length > 0 && imagesAttached < Math.min(quote.images.length, MAX_IMAGES)) {
        notes.push("*Napomena: slika iz zadatka nije uspjela stići do asistenta, pa odgovor ne uzima u obzir što je na njoj.*");
      }
      if (truncated) {
        notes.push("*Odgovor je prekinut jer je bio predug. Napiši „nastavi” ili postavi kraće pitanje.*");
      }
      // Notes are rendered apart: appended to the text they'd disappear into a
      // sketch that was cut off.
      const finalHtml = renderAnswer(received, { final: true }) + renderMd(notes.join("\n\n"));
      // content stays the bare answer — it's what goes back as history.
      messages = messages.map(m =>
        m.id === aiMsgId ? { ...m, content: received, finalHtml, messageId, rating: null } : m,
      );

      streamingMsgId = null;
      stableHtml = "";
      currentText = "";

    } catch (error) {
      if (displayInterval) { clearInterval(displayInterval); displayInterval = null; }
      // The chat was reset under this reply; resetChat already cleaned up.
      if (signal.aborted) return;
      streamingMsgId = null; stableHtml = ""; currentText = "";
      const errMsg = {
        id: aiMsgId,
        role: "ai",
        content: error instanceof ChatError ? error.message : GENERIC_ERROR,
        finalHtml: null,
        error: true,
      };
      messages = started
        ? messages.map(m => (m.id === aiMsgId ? errMsg : m))
        : [...messages, errMsg];
    } finally {
      // An aborted run must not unlock the input for a newer one.
      if (activeRun === run) {
        activeRun = null;
        isTyping = false;
        isWaiting = false;
      }
    }
  }

  async function rate(msg, rating) {
    if (msg.rating === rating) return;
    const { id, messageId } = msg;
    const previous = msg.rating ?? null;
    messages = messages.map(m => (m.id === id ? { ...m, rating } : m));

    let ok = false;
    try {
      const res = await apiClient(`/ai/message/${messageId}/rating`, {
        method: "POST",
        body: JSON.stringify({ rating }),
      });
      ok = res.ok;
    } catch {
      // handled below
    }
    // Undo — unless a later click has already replaced this rating.
    if (!ok) {
      messages = messages.map(m => (m.id === id && m.rating === rating ? { ...m, rating: previous } : m));
    }
  }

  // The fallback card comes in through {@html}, so its button is handled here.
  function onBoardClick(e) {
    if (!e.target.closest?.("[data-sketch-retry]") || isWaiting) return;
    draft = RETRY_SKETCH;
    sendMessage();
  }

  function handleKey(e) {
    if (e.key === "Enter" && !e.shiftKey && !isWaiting) {
      e.preventDefault();
      sendMessage();
    }
  }

  $effect(() => {
    const len = messages.length;
    if (!len) return;
    setTimeout(() => { if (boardEl) boardEl.scrollTop = boardEl.scrollHeight; }, 50);
  });
</script>

<div class="chat">
  <header class="chat-head">
    <div class="chat-head-ico" aria-hidden="true">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.9 5.8L20 10l-5 3.6L16.5 20 12 16.4 7.5 20 9 13.6 4 10l6.1-1.2z"/></svg>
    </div>
    <div class="chat-head-title">
      <span class="chat-head-name">AI asistent</span>
    </div>
    <button class="chat-head-btn" onclick={resetChat} title="Novi razgovor" aria-label="Novi razgovor">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
    </button>
    <button class="chat-head-btn" onclick={closeAI} title="Zatvori" aria-label="Zatvori">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
    </button>
  </header>

  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
  <div bind:this={boardEl} class="chat-board" onclick={onBoardClick}>
    {#each messages as msg (msg.id)}
      {#if msg.role === "user"}
        <div class="msg-user">
          {#if msg.quote}
            <div class="msg-quote">
              {#if msg.quote.images.length}
                <div class="quote-thumbs">
                  {#each msg.quote.images as img (img.src)}
                    <img src={img.src} alt={img.alt || "označena slika"}/>
                  {/each}
                </div>
              {/if}
              {#if msg.quote.text}
                <div class="quote-text">{@html renderMd(msg.quote.text)}</div>
              {/if}
            </div>
          {/if}
          <div class="msg-user-bubble">{@html renderMd(msg.content)}</div>
        </div>
      {:else}
        <div class="msg-ai">
          {#if msg.id === streamingMsgId}
            <div class="prose-content">
              {@html stableHtml}
              {@html renderAnswer(currentText)}
            </div>
          {:else if msg.finalHtml}
            <div class="prose-content">{@html msg.finalHtml}</div>
          {:else}
            <div class="prose-content">{@html renderMd(msg.content)}</div>
          {/if}
          {#if msg.messageId != null}
            <div class="msg-rating">
              <button
                class="btn btn-quiet"
                class:selected={msg.rating === 1}
                aria-pressed={msg.rating === 1}
                title="Koristan odgovor"
                aria-label="Koristan odgovor"
                onclick={() => rate(msg, 1)}
              >👍</button>
              <button
                class="btn btn-quiet"
                class:selected={msg.rating === -1}
                aria-pressed={msg.rating === -1}
                title="Nije koristan odgovor"
                aria-label="Nije koristan odgovor"
                onclick={() => rate(msg, -1)}
              >👎</button>
            </div>
          {/if}
        </div>
      {/if}
    {/each}

    {#if isTyping}
      <div class="msg-ai">
        <div class="typing" aria-label="Asistent piše">
          <div class="typing-dot"></div>
          <div class="typing-dot" style="animation-delay:.16s"></div>
          <div class="typing-dot" style="animation-delay:.32s"></div>
        </div>
      </div>
    {/if}
  </div>

  <!-- Bottom: suggestions + input pinned to bottom of panel -->
  <div class="chat-bottom">
    {#if showSuggestions}
      <div class="chat-suggestions">
        {#each SUGGESTIONS as s (s)}
          <button type="button" class="chat-chip" disabled={isWaiting} onclick={() => { draft = s; sendMessage(); }}>{s}</button>
        {/each}
      </div>
    {/if}

    {#if aiQuoteState.quote}
      <div class="pending-quote">
        {#if aiQuoteState.quote.images.length}
          <div class="quote-thumbs">
            {#each aiQuoteState.quote.images as img (img.src)}
              <img src={img.src} alt={img.alt || "označena slika"}/>
            {/each}
          </div>
        {/if}
        <div class="pending-quote-body">
          <span class="pending-quote-label">
            {aiQuoteState.quote.source === "exam"
              ? "Iz probne mature"
              : aiQuoteState.quote.source === "solution"
                ? "Iz rješenja"
                : "Iz zadatka"}
          </span>
          <span class="pending-quote-text">
            {aiQuoteState.quote.text
              ? truncate(aiQuoteState.quote.text)
              : `${aiQuoteState.quote.images.length > 1 ? "Slike" : "Slika"} iz zadatka`}
          </span>
        </div>
        <button class="pending-quote-x" onclick={clearAiQuote} title="Makni citat" aria-label="Makni citat">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    {/if}

    <div class="chat-input-wrap">
      <textarea
        bind:this={inputEl}
        bind:value={draft}
        onkeydown={handleKey}
        oninput={(e) => autoResize(e.currentTarget)}
        placeholder="Pitaj o zadatku…"
        disabled={isWaiting}
        rows="1"
        class="chat-input"
      ></textarea>
      <button class="chat-send" class:ready={canSend} onclick={sendMessage} disabled={isWaiting} title="Pošalji" aria-label="Pošalji">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></svg>
      </button>
    </div>
  </div>
</div>

<style>
  .chat {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }

  /* Header: a fresh start, close. Same height as the page's .topbar beside it in
     split view — same vertical padding, and 32px buttons like the topbar's —
     so the two bottom borders line up. */
  .chat-head {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: var(--pad-3) 12px var(--pad-3) 16px;
    border-bottom: 1px solid var(--border);
  }
  .chat-head-ico {
    width: 28px;
    height: 28px;
    flex-shrink: 0;
    display: grid;
    place-items: center;
    border-radius: 8px;
    background: var(--primary-dim);
    color: var(--primary);
  }
  .chat-head-title {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .chat-head-name {
    font-size: 14px;
    font-weight: 600;
    white-space: nowrap;
  }
  .chat-head-btn {
    width: 32px;
    height: 32px;
    flex-shrink: 0;
    display: grid;
    place-items: center;
    border: none;
    border-radius: var(--r-md);
    background: transparent;
    color: var(--text-dim);
    cursor: pointer;
  }
  .chat-head-btn:hover {
    background: var(--bg-hover);
    color: var(--text);
  }

  .chat-board {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 20px 16px;
  }

  /* The assistant writes on the page; the student's messages are bubbles. */
  .msg-ai {
    max-width: 92%;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .msg-user {
    align-self: flex-end;
    max-width: 85%;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 6px;
  }
  .msg-user-bubble {
    padding: 10px 14px;
    border-radius: 16px 16px 4px 16px;
    background: var(--primary);
    color: var(--on-primary);
    font-size: 15px;
    font-weight: 500;
    line-height: 1.5;
    overflow-wrap: anywhere;
  }
  .msg-user-bubble :global(p) { margin: 0 0 .5em; }
  .msg-user-bubble :global(p:last-child) { margin-bottom: 0; }
  .msg-user-bubble :global(strong) { color: inherit; }

  .typing {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 6px 0;
  }
  .typing-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--text-faint);
    animation: bounce 1.4s infinite ease-in-out both;
  }
  @keyframes bounce {
    0%, 80%, 100% { transform: scale(0.7); opacity: 0.4; }
    40% { transform: scale(1); opacity: 1; }
  }

  .chat-bottom {
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 12px 16px 16px;
  }
  .chat-suggestions {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .chat-chip {
    height: 30px;
    padding: 0 12px;
    border: 1px solid var(--border);
    border-radius: var(--r-pill);
    background: var(--bg);
    color: var(--text-dim);
    font: inherit;
    font-size: 12.5px;
    white-space: nowrap;
    cursor: pointer;
    transition: background .12s, border-color .12s, color .12s;
  }
  .chat-chip:hover:not(:disabled) {
    background: var(--bg-hover);
    border-color: var(--primary-border);
    color: var(--text);
  }
  .chat-chip:disabled { opacity: .5; cursor: default; }

  .chat-input-wrap {
    display: flex;
    align-items: flex-end;
    gap: 8px;
    padding: 6px 6px 6px 14px;
    border: 1px solid var(--border-strong);
    border-radius: 14px;
    background: var(--bg);
    transition: border-color .12s;
  }
  .chat-input-wrap:focus-within { border-color: var(--primary-border); }
  .chat-input {
    flex: 1;
    min-width: 0;
    max-height: 120px;
    padding: 7px 0;
    border: none;
    outline: none;
    resize: none;
    background: transparent;
    color: var(--text);
    font: inherit;
    font-size: 14px;
    line-height: 1.5;
    overflow-y: auto;
  }
  .chat-send {
    width: 34px;
    height: 34px;
    flex-shrink: 0;
    display: grid;
    place-items: center;
    border: none;
    border-radius: 10px;
    background: var(--bg-elev-2);
    color: var(--text-faint);
    cursor: pointer;
    transition: background .12s, color .12s;
  }
  .chat-send.ready {
    background: var(--primary);
    color: var(--on-primary);
  }
  .chat-send:disabled { cursor: default; }

  /* The part of the task the student highlighted, shown above their message. */
  .msg-quote {
    align-self: stretch;
    border-left: 2px solid var(--primary);
    padding: 2px 0 2px 10px;
    margin: 0;
    color: var(--text-dim);
    font-size: 13.5px;
    line-height: 1.55;
    max-height: 180px;
    overflow: auto;
  }
  .msg-quote :global(p) { margin: 0 0 .4em; }
  .msg-quote :global(p:last-child) { margin-bottom: 0; }

  .quote-thumbs {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    margin-bottom: 6px;
  }
  .quote-thumbs img {
    max-height: 56px;
    max-width: 96px;
    border-radius: var(--r-sm);
    border: 1px solid var(--border);
    background: #fff;
    object-fit: contain;
  }

  /* Pinned quote sitting above the input, waiting to be sent. */
  .pending-quote {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 8px 10px;
    border: 1px solid var(--border);
    border-left: 2px solid var(--primary);
    border-radius: var(--r-md);
    background: var(--bg-elev-2);
  }
  .pending-quote .quote-thumbs { margin-bottom: 0; }
  .pending-quote-body {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .pending-quote-label {
    font-size: 11px;
    color: var(--primary);
    font-weight: 500;
  }
  .pending-quote-text {
    font-size: 12.5px;
    color: var(--text-dim);
    line-height: 1.45;
    overflow-wrap: anywhere;
  }
  .pending-quote-x {
    flex-shrink: 0;
    display: inline-flex;
    padding: 3px;
    border-radius: var(--r-sm);
    color: var(--text-faint);
    cursor: pointer;
  }
  .pending-quote-x:hover {
    background: var(--bg-hover);
    color: var(--text);
  }

  /* Thumbs up/down under a stored answer. */
  .msg-rating {
    display: flex;
    gap: 4px;
    margin-top: 2px;
  }
  .msg-rating .btn {
    padding: 4px 7px;
    font-size: 13px;
    opacity: 0.55;
  }
  .msg-rating .btn:hover { opacity: 1; }
  .msg-rating .btn.selected {
    opacity: 1;
    background: var(--primary-dim);
    border-color: var(--primary);
  }

  /* SVG sketches in answers — the markup comes through {@html}, hence :global. */
  .prose-content :global(.ai-sketch) {
    max-width: 520px;
    margin: 0.6em 0 0.9em;
    border: 1px solid var(--border);
    border-radius: var(--r-md);
  }
  /* White paper in both themes: the model draws in black. */
  .prose-content :global(figure.ai-sketch) {
    padding: 10px;
    background: #fff;
  }
  .prose-content :global(.ai-sketch img) {
    display: block;
    width: 100%;
    height: auto;
  }
  .prose-content :global(.ai-sketch-pending),
  .prose-content :global(.ai-sketch-failed) {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 14px 16px;
    color: var(--text-dim);
    font-size: 14px;
  }
  .prose-content :global(.ai-sketch-pending) {
    position: relative;
    overflow: hidden;
    background: var(--bg-elev-2);
  }
  .prose-content :global(.ai-sketch-pending::after) {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent, var(--primary-dim), transparent);
    transform: translateX(-100%);
    animation: ai-sketch-shimmer 1.4s ease-in-out infinite;
  }
  @keyframes -global-ai-sketch-shimmer {
    to { transform: translateX(100%); }
  }
  .prose-content :global(.ai-sketch-failed) {
    flex-wrap: wrap;
    border-style: dashed;
  }
  .prose-content :global(.ai-sketch-failed .btn) {
    margin-left: auto;
    padding: 6px 12px;
  }

  .prose-content { font-size: 15.5px; font-weight: 500; line-height: 1.65; color: var(--text); }
  .prose-content :global(p:first-child) { margin-top: 0; }
  .prose-content :global(p:last-child) { margin-bottom: 0; }
  .prose-content :global(mjx-container) { outline: none; font-size: 1.05em !important; }
  .prose-content :global(p) { margin: 0 0 .75em; font-size: 15.5px; line-height: 1.65; }
  .prose-content :global(ul), .prose-content :global(ol) { padding-left: 1.4em; margin: .55em 0; }
  .prose-content :global(li) { font-size: 15.5px; line-height: 1.65; margin: .25em 0; }
  .prose-content :global(h1) { font-size: 18px; font-weight: 600; margin: .5em 0 .4em; }
  .prose-content :global(h2) { font-size: 17px; font-weight: 600; margin: .5em 0 .4em; }
  .prose-content :global(h3) { font-size: 16px; font-weight: 600; margin: .5em 0 .35em; }
  .prose-content :global(code) { font-family: var(--font-mono); font-size: 13.5px; background: var(--bg-elev-2); padding: 1px 5px; border-radius: 4px; }
  .prose-content :global(pre) { background: var(--bg-elev-2); padding: 12px; border-radius: var(--r-md); overflow-x: auto; font-size: 13.5px; }
  .prose-content :global(strong) { font-weight: 600; color: var(--text); }
</style>
