<script>
  import { onMount, tick } from "svelte";
  import { userData } from "$lib/store/user.svelte";
  import { currentTaskState } from "$lib/store/currentTask.svelte.js";
  import { aiQuoteState, clearAiQuote } from "$lib/store/aiQuote.svelte.js";
  import { taskImages, mergeImages } from "$lib/utils/taskImages.js";
  import { renderMd } from "$lib/utils/markdownRenderer";

  // Kept in step with MAX_IMAGES in src/routes/api/ai/+server.js.
  const MAX_IMAGES = 4;

  let messages = $state([
    {
      id: 0,
      role: "ai",
      content: `Bok! Tu sam ako ti nešto nije jasno. Pitaj bilo što o zadatku, rješenju ili matematičkom konceptu.`,
      finalHtml: null,
      quote: null,
    },
  ]);
  let draft = $state("");
  let isTyping = $state(false);
  let isWaiting = $state(false);
  let boardEl = $state(null);
  let inputEl = $state(null);

  let streamingMsgId = $state(null);
  let stableHtml = $state("");
  let currentText = $state("");

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

    setTimeout(async () => {
      await fetchAIResponse(userMsg, quote);
    }, 400);
  }

  async function fetchAIResponse(userQuestion, quote = null) {
    const aiMsgId = Date.now() + 1;
    let displayInterval = null;

    try {
      const history = messages
        .slice(0, -1)
        .map(m => {
          const who = m.role === "user" ? "Student" : "AI Assistant";
          // Keep past highlights in the transcript so follow-up questions like
          // "and the next step?" still know what was being pointed at.
          const q = m.quote?.text ? `[highlighted: ${truncate(m.quote.text, 300)}] ` : "";
          return `${who}: ${q}${m.content}`;
        })
        .join("\n\n");

      const task = currentTaskState.task;
      const taskBlock = task
        ? `Task and solution:\n${JSON.stringify(task, null, 2)}`
        : `The student is not currently solving a specific task — answer general math questions.`;

      const where = quote?.source === "solution" ? "solution" : "task";

      // Attach the task's own figures too, not just anything the student happened
      // to highlight — otherwise a question about a graph reaches the model as the
      // <img> tag inside the task JSON, and it answers by reciting the URL.
      const images = mergeImages(quote?.images ?? [], taskImages(task), MAX_IMAGES);

      const quoteBlock = quote?.text
        ? `\nThe student highlighted this specific part of the ${where} and their question is about it:\n"""\n${quote.text}\n"""\n`
        : "";

      // Only claimed once the server has actually attached the bytes — otherwise a
      // failed fetch would leave the model describing an image it never received.
      const many = images.length > 1;
      const imageNote = images.length
        ? `The task JSON above contains raw <img> tags. The image${many ? "s" : ""} ${many ? "they" : "it"} reference${many ? "" : "s"} ${many ? "are" : "is"} attached to this message as ${many ? "actual images" : "an actual image"} — look at ${many ? "them" : "it"} directly instead of describing the URL${many ? "s" : ""}.${
            quote?.images?.length
              ? ` The student specifically highlighted the first ${quote.images.length > 1 ? "ones" : "one"} in the ${where}.`
              : ""
          }`
        : "";

      const systemPrompt = `You are MatMat AI Assistant, a mathematics expert. A student has sent you a task and has a question about the solution.
Please answer their question and keep the response as brief as possible unless the student requests otherwise.
The task and solution are written in LaTeX (MathJax). This is the conversation history:

${history}

${taskBlock}
${quoteBlock}
Student's new question: ${userQuestion}

Answer clearly and simply in Croatian, taking into account the entire conversation context.
Format your response using Markdown: use **bold**, bullet lists, numbered lists, and headings where appropriate.
When responding with mathematical equations, use LaTeX format with \\( and \\) for inline mathematical expressions.
Do not use single dollar signs $ for mathematical expressions, but you can use double dollar signs $$ $$.`;

      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemPrompt,
          imageNote,
          // Only the current message's images — resending the whole history's
          // attachments on every turn would blow up the request.
          images: images.map(i => ({ url: i.src })),
        }),
      });

      if (!response.ok) {
        const msg = response.status === 429
          ? "Asistent je preopterećen — pokušaj za koji trenutak."
          : "Došlo je do pogreške. Pokušaj ponovo.";
        throw new Error(msg);
      }

      // A dropped image used to be invisible: the model would answer as if there
      // were no figure and nothing said otherwise. Say so instead.
      const attachedCount = Number(response.headers.get("X-Images-Attached") ?? 0);
      const imagesLost = images.length > 0 && attachedCount < images.length;

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let idx;
        while ((idx = buffer.indexOf("\n")) !== -1) {
          const line = buffer.slice(0, idx).trim();
          buffer = buffer.slice(idx + 1);
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (!data) continue;
          try {
            const parsed = JSON.parse(data);
            const chunk = parsed?.candidates?.[0]?.content?.parts?.map(p => p.text).join("") ?? "";
            if (chunk) fullText += chunk;
          } catch {}
        }
      }

      buffer += decoder.decode();
      if (buffer.trim()) {
        for (const line of buffer.split("\n")) {
          const t = line.trim();
          if (!t.startsWith("data: ")) continue;
          try {
            const parsed = JSON.parse(t.slice(6).trim());
            const chunk = parsed?.candidates?.[0]?.content?.parts?.map(p => p.text).join("") ?? "";
            if (chunk) fullText += chunk;
          } catch {}
        }
      }

      messages = [...messages, { id: aiMsgId, role: "ai", content: "", finalHtml: null }];
      isTyping = false;

      streamingMsgId = aiMsgId;
      stableHtml = "";
      currentText = "";
      let stableRawText = "";
      let pendingText = fullText;
      let displayedText = "";

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

      await new Promise(resolve => {
        const check = setInterval(() => {
          if (!pendingText.length) { clearInterval(check); resolve(); }
        }, 50);
      });

      clearInterval(displayInterval);
      displayInterval = null;

      const finalText = imagesLost
        ? `${displayedText}\n\n*Napomena: slika iz zadatka nije uspjela stići do asistenta, pa odgovor ne uzima u obzir što je na njoj.*`
        : displayedText;
      const finalHtml = renderMd(finalText);
      messages = messages.map(m => m.id === aiMsgId ? { ...m, content: finalText, finalHtml } : m);

      streamingMsgId = null;
      stableHtml = "";
      currentText = "";

    } catch (error) {
      if (displayInterval) { clearInterval(displayInterval); displayInterval = null; }
      streamingMsgId = null; stableHtml = ""; currentText = "";
      const errMsg = error.message || "Greška. Pokušaj ponovo.";
      const has = messages.some(m => m.id === aiMsgId);
      if (has) {
        messages = messages.map(m => m.id === aiMsgId ? { ...m, content: errMsg } : m);
      } else {
        messages = [...messages, { id: aiMsgId, role: "ai", content: errMsg, finalHtml: null }];
      }
    } finally {
      isTyping = false;
      isWaiting = false;
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
    Gemini · kontekst: Matematika
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
          Iz {aiQuoteState.quote.source === "solution" ? "rješenja" : "zadatka"}
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
