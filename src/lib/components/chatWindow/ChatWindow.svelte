<script>
  import { onMount, tick } from "svelte";
  import { slide } from "svelte/transition";
  import { userData } from "$lib/store/user.svelte";
  import { md } from "$lib/utils/markdownRenderer";
  import { ChevronDown, ChevronRight, Send, Bot, Trash2, Maximize2, Minimize2, X } from "@lucide/svelte/icons";

  let { task } = $props();

  let messages = $state([
    {
      id: 0,
      avatarUrl: "/images/AIAvatar.png",
      messages: [`### Bok! 👋 Tu sam ako ti nešto nije jasno u ovom zadatku.
      \n\n Ako ti nešto nije jasno, slobodno pitaj. Na primjer:\n\n - *Objasni mi kako
      doći do prvog koraka* \n\n - *Zašto se ovdje koristi ova formula?* \n\n- *Daj mi hint bez da mi odaš rješenje* \n\nSamo napiši što te muči. 🙂`],
      type: "ai",
      finalHtml: null,
    },
  ]);
  let newMessage = $state("");
  let isChatOpen = $state(true);
  let isTyping = $state(false);
  let isWaitingForAI = $state(false);
  let boardEl = $state(null);
  let boardElMobile = $state(null);
  let isMobileFullscreen = $state(false);

  // Progressive rendering state
  let streamingMsgId = $state(null);
  let stableHtml = $state("");
  let currentText = $state("");

  $effect(() => {
    document.body.style.overflow = isMobileFullscreen ? "hidden" : "";
    if (isMobileFullscreen) {
      setTimeout(() => {
        if (window.MathJax?.typesetPromise) window.MathJax.typesetPromise();
        if (boardElMobile) boardElMobile.scrollTop = boardElMobile.scrollHeight;
      }, 50);
    }
    return () => { document.body.style.overflow = ""; };
  });

  function normalizeMath(text) {
    if (!text) return "";
    return text.replace(/\\/g, "\\\\");
  }

  async function addMessage() {
    if (newMessage.trim() === "") return;

    messages = [
      ...messages,
      {
        id: Date.now(),
        avatarUrl: userData.user.photoURL,
        messages: [newMessage],
        type: "me",
      },
    ];

    const messageToSend = newMessage;
    newMessage = "";
    document.querySelectorAll("textarea").forEach((el) => { el.style.height = "auto"; });
    isTyping = true;
    isWaitingForAI = true;

    setTimeout(async () => {
      await addAIResponse(messageToSend);
    }, 800);
  }

  async function addAIResponse(userQuestion) {
    const aiMsgId = Date.now() + 1;
    let displayInterval = null;

    try {
      const conversationHistory = messages
        .slice(0, -1)
        .map((msg) => {
          const role = msg.type === "me" ? "Student" : "AI Assistant";
          return `${role}: ${msg.messages.join("\n")}`;
        })
        .join("\n\n");

      const systemPrompt = `You are MatMat AI Assistant, a mathematics expert. A student has sent you a task and has a question about the solution.
        Please answer their question and keep the response as brief as possible unless the student requests otherwise.
        The task and solution are written in LaTeX (MathJax). This is the conversation history:

        ${conversationHistory}

        Task and solution:
        ${JSON.stringify(task, null, 2)}

        Student's new question: ${userQuestion}

        Answer clearly and simply, taking into account the entire conversation context.
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
          ? "Asistent je trenutno preopterećen — pokušaj opet za koji trenutak."
          : "Došlo je do pogreške. Molim, pokušaj ponovo.";
        throw new Error(msg);
      }

      messages = [
        ...messages,
        { id: aiMsgId, avatarUrl: "/images/AIAvatar.png", messages: [""], type: "ai", finalHtml: null },
      ];
      isTyping = false;

      // Set up progressive rendering state
      streamingMsgId = aiMsgId;
      stableHtml = "";
      currentText = "";
      let stableRawText = ""; // tracks the raw text already frozen into stableHtml

      let pendingText = "";
      let displayedText = "";

      // Display ticker — reads from pendingText buffer at a fixed pace
      displayInterval = setInterval(() => {
        if (pendingText.length === 0) return;
        const batch = pendingText.slice(0, 2);
        pendingText = pendingText.slice(2);
        displayedText += batch;

        // Check for paragraph boundary (\n\n)
        const lastBoundary = displayedText.lastIndexOf("\n\n");
        if (lastBoundary >= 0 && lastBoundary >= stableRawText.length) {
          const newStableRaw = displayedText.slice(0, lastBoundary);
          if (newStableRaw !== stableRawText) {
            stableRawText = newStableRaw;
            stableHtml = md.render(normalizeMath(newStableRaw));
            // Typeset the stable paragraphs after DOM update; tex2jax_ignore on currentText div
            // prevents MathJax from touching the live-updating portion
            tick().then(() => {
              if (window.MathJax?.typesetPromise) window.MathJax.typesetPromise();
            });
          }
          currentText = displayedText.slice(lastBoundary + 2);
        } else {
          // Still inside the first paragraph — no stable content yet
          currentText = displayedText;
        }

        if (boardEl) boardEl.scrollTop = boardEl.scrollHeight;
        if (boardElMobile) boardElMobile.scrollTop = boardElMobile.scrollHeight;
      }, 22);

      // Read SSE stream as fast as possible
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (!data) continue;
          try {
            const parsed = JSON.parse(data);
            const chunk = parsed?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") ?? "";
            if (chunk) pendingText += chunk;
          } catch {
            // incomplete JSON chunk, skip
          }
        }
      }

      // Wait for display ticker to drain remaining pendingText
      await new Promise((resolve) => {
        const check = setInterval(() => {
          if (pendingText.length === 0) {
            clearInterval(check);
            resolve();
          }
        }, 50);
      });

      clearInterval(displayInterval);
      displayInterval = null;

      // Freeze the complete response as finalHtml so future renders are static
      const finalHtml = md.render(normalizeMath(displayedText));
      messages = messages.map((m) =>
        m.id === aiMsgId ? { ...m, messages: [displayedText], finalHtml } : m
      );

      // Clear streaming state — template switches to finalHtml branch
      streamingMsgId = null;
      stableHtml = "";
      currentText = "";

      // Final MathJax pass over the newly-frozen message
      await tick();
      if (window.MathJax?.typesetPromise) {
        await window.MathJax.typesetPromise();
      }
    } catch (error) {
      console.error("Error fetching AI response:", error);
      if (displayInterval) { clearInterval(displayInterval); displayInterval = null; }
      streamingMsgId = null;
      stableHtml = "";
      currentText = "";
      const errorMsg = error.message || "Došlo je do pogreške. Molim, pokušaj ponovo.";
      const hasPlaceholder = messages.some((m) => m.id === aiMsgId);
      if (hasPlaceholder) {
        messages = messages.map((m) =>
          m.id === aiMsgId ? { ...m, messages: [errorMsg], finalHtml: null } : m
        );
      } else {
        messages = [...messages, { id: aiMsgId, avatarUrl: "/images/AIAvatar.png", messages: [errorMsg], type: "ai", finalHtml: null }];
      }
    } finally {
      if (displayInterval) { clearInterval(displayInterval); displayInterval = null; }
      isTyping = false;
      isWaitingForAI = false;
    }
  }

  function autoResize(el) {
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  }

  function handleKeyPress(event) {
    if (event.key === "Enter" && !event.shiftKey && !isWaitingForAI) {
      event.preventDefault();
      addMessage();
    }
  }

  function toggleChat() {
    isChatOpen = !isChatOpen;
  }

  let panelWidth = $state(620);
  let isResizing = $state(false);

  function startResize(e) {
    e.preventDefault();
    isResizing = true;

    const onMouseMove = (e) => {
      const newWidth = window.innerWidth - e.clientX;
      panelWidth = Math.max(320, Math.min(860, newWidth));
    };

    document.body.style.cursor = "col-resize";

    const onMouseUp = () => {
      isResizing = false;
      document.body.style.cursor = "";
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }

  onMount(() => {
    if (!window.MathJax) {
      window.MathJax = {
        tex: {
          inlineMath: [["$", "$"], ["\\(", "\\)"]],
          displayMath: [["$$", "$$"], ["\\[", "\\]"]],
          processEscapes: true,
        },
        options: { skipHtmlTags: ["script", "noscript", "style", "textarea", "pre"] },
        startup: {
          typeset: false,
          ready: () => { window.MathJax.startup.defaultReady(); },
        },
      };
      const script = document.createElement("script");
      script.id = "MathJax-script";
      script.async = true;
      script.src = "https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js";
      document.head.appendChild(script);
    }
  });

  $effect(() => {
    // Only track length so this doesn't fire on every streaming chunk
    const len = messages.length;
    if (len === 0) return;

    setTimeout(() => {
      if (boardEl) boardEl.scrollTop = boardEl.scrollHeight;
      if (boardElMobile) boardElMobile.scrollTop = boardElMobile.scrollHeight;
    }, 50);
  });
</script>

<!-- ===================== DESKTOP TRIGGER ===================== -->
{#if !isChatOpen}
  <button
    onclick={toggleChat}
    class="mt-4 hidden w-full items-center justify-between rounded-lg border border-border/50 bg-muted/30 px-4 py-3 text-sm text-muted-foreground transition-all hover:border-primary/30 hover:bg-muted/50 hover:text-foreground lg:flex"
    aria-label="Otvori AI chat za pomoć"
  >
    <div class="flex items-center gap-2.5">
      <div class="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-primary">
        <Bot size={13} />
      </div>
      <span>Trebaš pomoć? Pitaj AI asistenta</span>
    </div>
    <span class="text-primary">→</span>
  </button>
{/if}

<!-- Sidebar panel -->
<div
  class="fixed right-0 top-[60px] z-40 hidden h-[calc(100vh-60px)] flex-col border-l border-border bg-background shadow-none dark:shadow-[0_0_24px_rgba(255,32,86,0.06)] transition-transform duration-300 lg:flex {isChatOpen
    ? 'translate-x-0'
    : 'translate-x-full'} {isResizing ? 'select-none' : ''}"
  style="width: {panelWidth}px"
>
  <!-- Resize handle -->
  <div
    class="absolute left-0 top-0 h-full w-1.5 cursor-col-resize transition-colors hover:bg-primary/20 {isResizing ? 'bg-primary/30' : ''}"
    onmousedown={startResize}
    role="separator"
    aria-label="Promijeni širinu"
  ></div>

  <!-- Header -->
  <div class="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
    <div class="flex items-center gap-3">
      <div class="relative">
        <div class="flex h-10 w-10 items-center justify-center rounded-full border border-primary/20 bg-muted text-primary">
          <Bot size={18} />
        </div>
        <div class="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-secondary dark:border-background bg-green-500"></div>
      </div>
      <div>
        <div class="text-sm font-black tracking-tight text-primary">MatMat AI</div>
        <div class="text-[10px] font-bold uppercase tracking-wider text-green-400">Online</div>
      </div>
    </div>
    <button
      onclick={toggleChat}
      class="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted"
      aria-label="Zatvori"
    >
      <ChevronRight size={16} />
    </button>
  </div>

  <!-- Messages -->
  <div bind:this={boardEl} class="flex-1 space-y-5 overflow-y-auto px-5 py-5">

    {#each messages as message (message.id)}
      {#if message.type === "me"}
        <div class="flex flex-col items-end gap-1.5">
          <div class="max-w-[85%] rounded-xl rounded-tr-none border-r-2 border-primary bg-primary/10 px-4 py-3 text-base">
            {message.messages[0]}
          </div>
        </div>
      {:else if message.id === streamingMsgId}
        <div class="prose prose-base min-w-0 w-full dark:prose-invert">
          {@html stableHtml}
          <span class="tex2jax_ignore">{@html md.render(normalizeMath(currentText))}</span>
        </div>
      {:else if message.finalHtml != null}
        <div class="prose prose-base min-w-0 w-full dark:prose-invert">
          {@html message.finalHtml}
        </div>
      {:else}
        <div class="prose prose-base min-w-0 w-full dark:prose-invert">
          {@html md.render(normalizeMath(message.messages[0]))}
        </div>
      {/if}
    {/each}

    {#if isTyping}
      <div class="typing-dots pt-1">
        <span></span><span></span><span></span>
      </div>
    {/if}
  </div>

  <!-- Input -->
  <div class="shrink-0 px-5 py-5">
    <div class="group relative">
      <textarea
        bind:value={newMessage}
        onkeypress={handleKeyPress}
        oninput={(e) => autoResize(e.currentTarget)}
        placeholder="Pitaj bilo što..."
        disabled={isWaitingForAI}
        rows="1"
        class="w-full resize-none overflow-hidden rounded-xl border border-border/30 bg-background dark:bg-muted/30 py-3.5 pl-4 pr-12 text-sm placeholder:text-muted-foreground/40 focus:border-primary/30 focus:outline-none disabled:opacity-50 transition-colors max-h-40"
      ></textarea>
      <div class="absolute bottom-0 left-0 h-[2px] w-full origin-left scale-x-0 rounded-b-xl bg-primary transition-transform group-focus-within:scale-x-100"></div>
      <button
        onclick={addMessage}
        disabled={isWaitingForAI}
        class="absolute right-3.5 top-1/2 -translate-y-1/2 text-primary transition-colors hover:text-primary/70 disabled:opacity-40"
        aria-label="Pošalji"
      >
        <Send size={16} />
      </button>
    </div>
    <div class="mt-3 flex items-center justify-between">
      <div class="flex gap-2">
        <button
          onclick={() => { messages = [{ id: 0, avatarUrl: "/images/AIAvatar.png", messages: [`### Bok! 👋 Tu sam ako ti nešto nije jasno u ovom zadatku.
      \n\n Ako ti nešto nije jasno, slobodno pitaj. Na primjer:\n\n - *Objasni mi kako
      doći do prvog koraka* \n\n - *Zašto se ovdje koristi ova formula?* \n\n- *Daj mi hint bez da mi odaš rješenje* \n\nSamo napiši što te muči. 🙂`], type: "ai", finalHtml: null }]; }}
          class="rounded-lg bg-muted p-2 text-muted-foreground transition-colors hover:bg-accent"
          title="Očisti povijest"
        >
          <Trash2 size={14} />
        </button>
      </div>
      <span class="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">MatMat AI</span>
    </div>
  </div>
</div>


<!-- ===================== MOBILE INLINE PANEL ===================== -->
<!-- ===================== MOBILE FULLSCREEN OVERLAY ===================== -->
{#if isMobileFullscreen}
  <div class="fixed inset-0 z-50 flex flex-col bg-background lg:hidden">
    <!-- Header -->
    <div class="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
      <div class="flex items-center gap-3">
        <div class="relative">
          <div class="flex h-8 w-8 items-center justify-center rounded-full border border-primary/20 bg-muted text-primary">
            <Bot size={15} />
          </div>
          <div class="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-background bg-green-500"></div>
        </div>
        <div>
          <p class="text-sm font-black tracking-tight text-primary">MatMat AI</p>
          <p class="text-[10px] font-bold uppercase tracking-wider text-green-400">Online</p>
        </div>
      </div>
      <div class="flex items-center gap-1">
        <button
          onclick={() => (isMobileFullscreen = false)}
          class="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted"
          aria-label="Smanji"
        >
          <Minimize2 size={16} />
        </button>
        <button
          onclick={() => { isMobileFullscreen = false; isChatOpen = false; }}
          class="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted"
          aria-label="Zatvori"
        >
          <X size={16} />
        </button>
      </div>
    </div>

    <!-- Messages -->
    <div bind:this={boardElMobile} class="flex-1 space-y-5 overflow-y-auto px-4 py-4">
      {#each messages as message (message.id)}
        {#if message.type === "me"}
          <div class="flex flex-col items-end gap-1.5">
            <div class="max-w-[85%] rounded-xl rounded-tr-none border-r-2 border-primary bg-primary/10 px-4 py-3 text-base">
              {message.messages[0]}
            </div>
          </div>
        {:else if message.id === streamingMsgId}
          <div class="prose prose-base min-w-0 w-full dark:prose-invert">
            {@html stableHtml}
            <span class="tex2jax_ignore">{@html md.render(normalizeMath(currentText))}</span>
          </div>
        {:else if message.finalHtml != null}
          <div class="prose prose-base min-w-0 w-full dark:prose-invert">
            {@html message.finalHtml}
          </div>
        {:else}
          <div class="prose prose-base min-w-0 w-full dark:prose-invert">
            {@html md.render(normalizeMath(message.messages[0]))}
          </div>
        {/if}
      {/each}
      {#if isTyping}
        <div class="typing-dots pt-1"><span></span><span></span><span></span></div>
      {/if}
    </div>

    <!-- Input -->
    <div class="shrink-0 border-t border-border px-4 py-4">
      <div class="group relative">
        <textarea
          bind:value={newMessage}
          onkeypress={handleKeyPress}
          oninput={(e) => autoResize(e.currentTarget)}
          placeholder="Pitaj bilo što..."
          disabled={isWaitingForAI}
          rows="1"
          class="w-full resize-none overflow-hidden rounded-xl border border-border/30 bg-background dark:bg-muted/30 py-3 pl-4 pr-11 text-sm placeholder:text-muted-foreground/40 focus:border-primary/30 focus:outline-none disabled:opacity-50 transition-colors max-h-40"
        ></textarea>
        <div class="absolute bottom-0 left-0 h-[2px] w-full origin-left scale-x-0 rounded-b-xl bg-primary transition-transform group-focus-within:scale-x-100"></div>
        <button onclick={addMessage} disabled={isWaitingForAI}
          class="absolute right-3 top-1/2 -translate-y-1/2 text-primary transition-colors hover:text-primary/70 disabled:opacity-40"
          aria-label="Pošalji"><Send size={15} /></button>
      </div>
    </div>
  </div>
{/if}

<!-- ===================== MOBILE INLINE PANEL ===================== -->
<div class="mb-8 overflow-hidden rounded-xl border border-border bg-background shadow-none dark:shadow-[0_0_16px_rgba(255,32,86,0.04)] lg:hidden">
  <!-- Header / trigger -->
  <div class="flex w-full items-center justify-between px-4 py-3">
    <button
      onclick={toggleChat}
      class="flex flex-1 items-center gap-3"
    >
      <div class="relative">
        <div class="flex h-8 w-8 items-center justify-center rounded-full border border-primary/20 bg-muted text-primary">
          <Bot size={15} />
        </div>
        <div class="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-secondary dark:border-background bg-green-500"></div>
      </div>
      <div class="text-left">
        <p class="text-sm font-black tracking-tight text-primary">MatMat AI</p>
        <p class="text-[10px] font-bold uppercase tracking-wider text-green-400">Online</p>
      </div>
    </button>
    <div class="flex items-center gap-1">
      {#if isChatOpen}
        <button
          onclick={() => (isMobileFullscreen = true)}
          class="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted"
          aria-label="Full screen"
        >
          <Maximize2 size={15} />
        </button>
      {/if}
      <button onclick={toggleChat} class="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted">
        <ChevronDown size={16} class="transition-transform duration-200 {isChatOpen ? 'rotate-180' : ''}" />
      </button>
    </div>
  </div>

  {#if isChatOpen}
    <div transition:slide={{ duration: 200 }} class="border-t border-border">
      <!-- Messages -->
      <div class="h-80 space-y-5 overflow-y-auto px-4 py-4">
        {#each messages as message (message.id)}
          {#if message.type === "me"}
            <div class="flex flex-col items-end gap-1.5">
              <div class="max-w-[85%] rounded-xl rounded-tr-none border-r-2 border-primary bg-primary/10 px-4 py-3 text-base">
                {message.messages[0]}
              </div>
            </div>
          {:else if message.id === streamingMsgId}
            <div class="prose prose-base min-w-0 w-full dark:prose-invert">
              {@html stableHtml}
              <span class="tex2jax_ignore">{@html md.render(normalizeMath(currentText))}</span>
            </div>
          {:else if message.finalHtml != null}
            <div class="prose prose-base min-w-0 w-full dark:prose-invert">
              {@html message.finalHtml}
            </div>
          {:else}
            <div class="prose prose-base min-w-0 w-full dark:prose-invert">
              {@html md.render(normalizeMath(message.messages[0]))}
            </div>
          {/if}
        {/each}

        {#if isTyping}
          <div class="typing-dots pt-1"><span></span><span></span><span></span></div>
        {/if}
      </div>

      <!-- Input -->
      <div class="border-t border-border px-4 py-4">
        <div class="group relative">
          <textarea
            bind:value={newMessage}
            onkeypress={handleKeyPress}
            oninput={(e) => autoResize(e.currentTarget)}
            placeholder="Pitaj bilo što..."
            disabled={isWaitingForAI}
            rows="1"
            class="w-full resize-none overflow-hidden rounded-xl border border-border/30 bg-background dark:bg-muted/30 py-3 pl-4 pr-11 text-sm placeholder:text-muted-foreground/40 focus:border-primary/30 focus:outline-none disabled:opacity-50 transition-colors max-h-40"
          ></textarea>
          <div class="absolute bottom-0 left-0 h-[2px] w-full origin-left scale-x-0 rounded-b-xl bg-primary transition-transform group-focus-within:scale-x-100"></div>
          <button
            onclick={addMessage}
            disabled={isWaitingForAI}
            class="absolute right-3 top-1/2 -translate-y-1/2 text-primary transition-colors hover:text-primary/70 disabled:opacity-40"
            aria-label="Pošalji"
          >
            <Send size={15} />
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .typing-dots {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .typing-dots span {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background-color: var(--muted-foreground);
    display: block;
    animation: bounce 1.4s infinite ease-in-out both;
  }

  .typing-dots span:nth-child(1) { animation-delay: -0.32s; }
  .typing-dots span:nth-child(2) { animation-delay: -0.16s; }

  @keyframes bounce {
    0%, 80%, 100% { transform: scale(0.7); opacity: 0.4; }
    40% { transform: scale(1); opacity: 1; }
  }

  :global(.prose p:first-child) { margin-top: 0; }
  :global(.prose p:last-child) { margin-bottom: 0; }
  :global(.mjx-chtml) { outline: none; }
</style>
