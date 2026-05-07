<script>
  import { onMount, tick } from "svelte";
  import { userData } from "$lib/store/user.svelte";
  import { currentTaskState } from "$lib/store/currentTask.svelte.js";
  import { md } from "$lib/utils/markdownRenderer";

  let messages = $state([
    {
      id: 0,
      role: "ai",
      content: `Bok! Tu sam ako ti nešto nije jasno. Pitaj bilo što o zadatku, rješenju ili matematičkom konceptu.`,
      finalHtml: null,
    },
  ]);
  let draft = $state("");
  let isTyping = $state(false);
  let isWaiting = $state(false);
  let boardEl = $state(null);

  let streamingMsgId = $state(null);
  let stableHtml = $state("");
  let currentText = $state("");

  const SUGGESTIONS = [
    "Objasni mi prvi korak",
    "Daj hint bez rješenja",
    "Zašto se koristi ova formula?",
  ];

  function normalizeMath(text) {
    if (!text) return "";
    return text.replace(/\\/g, "\\\\");
  }

  function autoResize(el) {
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  }

  async function sendMessage() {
    if (!draft.trim() || isWaiting) return;

    const userMsg = draft.trim();
    draft = "";
    document.querySelectorAll("textarea").forEach(el => { el.style.height = "auto"; });

    messages = [...messages, { id: Date.now(), role: "user", content: userMsg, finalHtml: null }];
    isTyping = true;
    isWaiting = true;

    setTimeout(async () => {
      await fetchAIResponse(userMsg);
    }, 400);
  }

  async function fetchAIResponse(userQuestion) {
    const aiMsgId = Date.now() + 1;
    let displayInterval = null;

    try {
      const history = messages
        .slice(0, -1)
        .map(m => `${m.role === "user" ? "Student" : "AI Assistant"}: ${m.content}`)
        .join("\n\n");

      const task = currentTaskState.task;
      const taskBlock = task
        ? `Task and solution:\n${JSON.stringify(task, null, 2)}`
        : `The student is not currently solving a specific task — answer general math questions.`;

      const systemPrompt = `You are MatMat AI Assistant, a mathematics expert. A student has sent you a task and has a question about the solution.
Please answer their question and keep the response as brief as possible unless the student requests otherwise.
The task and solution are written in LaTeX (MathJax). This is the conversation history:

${history}

${taskBlock}

Student's new question: ${userQuestion}

Answer clearly and simply in Croatian, taking into account the entire conversation context.
Format your response using Markdown: use **bold**, bullet lists, numbered lists, and headings where appropriate.
When responding with mathematical equations, use LaTeX format with \\( and \\) for inline mathematical expressions.
Do not use single dollar signs $ for mathematical expressions, but you can use double dollar signs $$ $$.`;

      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ systemPrompt }),
      });

      if (!response.ok) {
        const msg = response.status === 429
          ? "Asistent je preopterećen — pokušaj za koji trenutak."
          : "Došlo je do pogreške. Pokušaj ponovo.";
        throw new Error(msg);
      }

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
            stableHtml = md.render(normalizeMath(newStable));
            tick().then(() => { if (window.MathJax?.typesetPromise) window.MathJax.typesetPromise(); });
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

      const finalHtml = md.render(normalizeMath(displayedText));
      messages = messages.map(m => m.id === aiMsgId ? { ...m, content: displayedText, finalHtml } : m);

      streamingMsgId = null;
      stableHtml = "";
      currentText = "";

      await tick();
      if (window.MathJax?.typesetPromise) await window.MathJax.typesetPromise();

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
        {#if msg.id === streamingMsgId}
          <div class="prose-content">
            {@html stableHtml}
            <span class="tex2jax_ignore">{@html md.render(normalizeMath(currentText))}</span>
          </div>
        {:else if msg.finalHtml}
          <div class="prose-content">{@html msg.finalHtml}</div>
        {:else}
          <div class="prose-content">{@html md.render(normalizeMath(msg.content))}</div>
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

  <div class="chat-input-wrap">
    <textarea
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
