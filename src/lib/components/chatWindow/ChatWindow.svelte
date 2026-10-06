<script>
  import { onDestroy, tick } from "svelte";
  import { userData } from "$lib/store/user.svelte";
  import { currentTaskState } from "$lib/store/currentTask.svelte.js";
  import { aiQuoteState, clearAiQuote } from "$lib/store/aiQuote.svelte.js";
  import { apiClient } from "$lib/api/apiClient";
  import { renderMd } from "$lib/utils/markdownRenderer";

  // The backend attaches at most this many images per request.
  const MAX_IMAGES = 4;

  const GENERIC_ERROR = "Došlo je do pogreške. Pokušaj ponovo.";

  // An error whose message is written for the student. Anything else (a network
  // TypeError, an abort) is shown as GENERIC_ERROR instead of raw English text.
  class ChatError extends Error {}

  function greeting() {
    return {
      id: 0,
      role: "ai",
      content: `Bok! Tu sam ako ti nešto nije jasno. Pitaj bilo što o zadatku, rješenju ili matematičkom konceptu.`,
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

    let stableRawText = "";
    let pendingText = "";
    let displayedText = "";

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
        if (!pendingText.length) return;
        const batch = pendingText.slice(0, 2);
        pendingText = pendingText.slice(2);
        displayedText += batch;

        const lastBoundary = displayedText.lastIndexOf("\n\n");
        if (lastBoundary >= 0 && lastBoundary >= stableRawText.length) {
          const newStable = displayedText.slice(0, lastBoundary);
          if (newStable !== stableRawText) {
            stableRawText = newStable;
            stableHtml = renderMd(newStable);
          }
          currentText = displayedText.slice(lastBoundary + 2);
        } else {
          currentText = displayedText;
        }

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
          throw new ChatError("Dosegnut je dnevni limit od 30 pitanja. Pokušaj ponovo sutra.");
        }
        // The conversation doesn't exist or belongs to another task — start a
        // new one with the next question.
        if (response.status === 404) conversationId = null;
        throw new ChatError(GENERIC_ERROR);
      }

      let imagesAttached = 0;
      let messageId = null;

      await readSse(response, (event, data) => {
        if (event === "meta") {
          conversationId = data.conversationId ?? null;
          imagesAttached = Number(data.imagesAttached) || 0;
        } else if (event === "delta") {
          if (!data.text) return;
          if (!started) startTyping();
          pendingText += data.text;
        } else if (event === "done") {
          messageId = data.messageId ?? null;
        } else if (event === "error") {
          throw new ChatError(data.message || GENERIC_ERROR);
        }
      });

      if (!started) throw new ChatError(GENERIC_ERROR);

      // The stream is done; let the typing catch up with what's left.
      await new Promise(resolve => {
        const check = setInterval(() => {
          if (!pendingText.length || signal.aborted) { clearInterval(check); resolve(); }
        }, 50);
      });
      signal.throwIfAborted();

      clearInterval(displayInterval);
      displayInterval = null;

      // A dropped image used to be invisible: the model would answer as if there
      // were no figure and nothing said otherwise. Say so instead.
      const imagesLost =
        quote?.images?.length > 0 && imagesAttached < Math.min(quote.images.length, MAX_IMAGES);
      const finalHtml = renderMd(
        imagesLost
          ? `${displayedText}\n\n*Napomena: slika iz zadatka nije uspjela stići do asistenta, pa odgovor ne uzima u obzir što je na njoj.*`
          : displayedText,
      );
      // content stays the bare answer — it's what goes back as history.
      messages = messages.map(m =>
        m.id === aiMsgId ? { ...m, content: displayedText, finalHtml, messageId, rating: null } : m,
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

  function handleKey(e) {
    if (e.key === "Enter" && !e.shiftKey && !isWaiting) {
      e.preventDefault();
      sendMessage();
    }
  }

  function initials(name) {
    if (!name) return 'Ti';
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  }

  $effect(() => {
    const len = messages.length;
    if (!len) return;
    setTimeout(() => { if (boardEl) boardEl.scrollTop = boardEl.scrollHeight; }, 50);
  });
</script>

<!-- Messages board -->
<div bind:this={boardEl} class="chat-board">
  <div style="font-size:12px;color:var(--text-faint);margin-bottom:10px;display:flex;align-items:center;gap:6px">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
    MatMat AI
  </div>

  {#each messages as msg (msg.id)}
    <div class="chat-msg {msg.role}">
      <div class="ava">
        {#if msg.role === "user" && userData.user?.photoURL}
          <img src={userData.user.photoURL} alt="avatar"/>
        {:else if msg.role === "user"}
          {initials(userData.user?.displayName ?? '')}
        {:else}
          AI
        {/if}
      </div>
      <div class="bubble">
        <div class="role">{msg.role === "ai" ? "Asistent" : "Ti"}</div>
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
        {#if msg.id === streamingMsgId}
          <div class="prose-content">
            {@html stableHtml}
            {@html renderMd(currentText)}
          </div>
        {:else if msg.finalHtml}
          <div class="prose-content">{@html msg.finalHtml}</div>
        {:else}
          <div class="prose-content">{@html renderMd(msg.content)}</div>
        {/if}
        {#if msg.role === "ai" && msg.messageId != null}
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
    </div>
  {/each}

  {#if isTyping}
    <div style="display:flex;align-items:center;gap:4px;padding:10px 0">
      <div class="typing-dot"></div>
      <div class="typing-dot" style="animation-delay:.16s"></div>
      <div class="typing-dot" style="animation-delay:.32s"></div>
    </div>
  {/if}
</div>

<!-- Bottom: suggestions + input pinned to bottom of panel -->
<div class="chat-bottom">
  <div class="chat-suggestions">
    {#each SUGGESTIONS as s (s)}
      <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
      <div class="chip" onclick={() => { draft = s; sendMessage(); }}>{s}</div>
    {/each}
  </div>

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
    <button class="btn btn-primary" onclick={sendMessage} disabled={isWaiting} style="align-self:flex-end;padding:8px 10px">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
      </svg>
    </button>
  </div>
</div>

<style>
  .chat-board {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 0;
    min-height: 0;
  }

  .chat-bottom {
    flex-shrink: 0;
    margin-top: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
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

  /* The part of the task the student highlighted, shown above their message. */
  .msg-quote {
    border-left: 2px solid var(--primary);
    padding: 2px 0 2px 10px;
    margin: 0 0 8px;
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
    margin-top: 8px;
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

  .prose-content { font-size: 15.5px; line-height: 1.7; }
  .prose-content :global(p:first-child) { margin-top: 0; }
  .prose-content :global(p:last-child) { margin-bottom: 0; }
  .prose-content :global(mjx-container) { outline: none; font-size: 1.05em !important; }
  .prose-content :global(p) { margin: 0 0 .85em; font-size: 15.5px; line-height: 1.7; }
  .prose-content :global(ul), .prose-content :global(ol) { padding-left: 1.4em; margin: .55em 0; }
  .prose-content :global(li) { font-size: 15.5px; line-height: 1.65; margin: .25em 0; }
  .prose-content :global(h1) { font-size: 19px; font-weight: 600; margin: .5em 0 .4em; }
  .prose-content :global(h2) { font-size: 17px; font-weight: 600; margin: .5em 0 .4em; }
  .prose-content :global(h3) { font-size: 16px; font-weight: 600; margin: .5em 0 .35em; }
  .prose-content :global(code) { font-family: var(--font-mono); font-size: 13.5px; background: var(--bg-elev-2); padding: 1px 5px; border-radius: 4px; }
  .prose-content :global(pre) { background: var(--bg-elev-2); padding: 12px; border-radius: var(--r-md); overflow-x: auto; font-size: 13.5px; }
  .prose-content :global(strong) { font-weight: 600; color: var(--text); }
</style>
