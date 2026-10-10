<script>
  import { onDestroy, tick } from "svelte";
  import { renderChatMd } from "$lib/utils/markdownRenderer";
  import { handleLogIn } from "$lib/store/user.svelte";

  // The AI panel of the landing page preview, drawn like ChatWindow.svelte. The
  // replies are written in advance for each demo task: the three suggestions, and
  // an explanation for any step of the solution the visitor highlights. Anything
  // typed freely gets a pointer to the real assistant.
  // `scripted` shows a finished hint exchange without any interaction.
  let { task, scripted = false, quote = null, onClearQuote, onClose } = $props();

  const ASKS = {
    first: "Objasni mi prvi korak",
    hint: "Daj hint bez rješenja",
    why: "Zašto se koristi ova formula?",
  };
  const TYPED_REPLY =
    "U aplikaciji ti ovdje odgovara pravi AI asistent, na hrvatskom i za zadatak koji upravo rješavaš. Prijavi se i pitaj ga što god te zanima.";
  const QUOTE_ASK = "Objasni mi ovaj dio.";

  let nextId = 0;
  // The chat is re-created for every task (keyed in AppDemo), so reading the
  // props once here is enough.
  const opening = () =>
    scripted
      ? [
          { id: nextId++, role: "user", text: ASKS.hint },
          { id: nextId++, role: "ai", text: task.hint },
        ]
      : [];
  let messages = $state(opening());
  let typing = $state(false);
  let streaming = $state(false);
  let draft = $state("");
  let boardEl = $state();
  let inputEl = $state();
  let timers = [];

  let busy = $derived(typing || streaming);
  let asked = $derived(new Set(messages.filter((m) => m.role === "user").map((m) => m.text)));
  let suggestions = $derived(Object.values(ASKS).filter((s) => !asked.has(s)));
  let canSend = $derived(!busy && (draft.trim().length > 0 || !!quote));

  const reduceMotion = () =>
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function later(fn, ms) {
    timers.push(setTimeout(fn, ms));
  }

  async function toBottom() {
    await tick();
    boardEl?.scrollTo({ top: boardEl.scrollHeight, behavior: reduceMotion() ? "auto" : "smooth" });
  }

  // Typing dots first, then the reply word by word like the real SSE stream. A
  // $…$ formula comes in whole, so half-typed LaTeX never shows up.
  function reply(text, extra = {}) {
    if (reduceMotion()) {
      messages.push({ id: nextId++, role: "ai", text, ...extra });
      toBottom();
      return;
    }
    typing = true;
    toBottom();
    later(() => {
      typing = false;
      streaming = true;
      messages.push({ id: nextId++, role: "ai", text: "", ...extra });
      const live = messages[messages.length - 1];
      const tokens = text.split(/(\$[^$]+\$|\s+)/).filter(Boolean);
      let i = 0;
      const iv = setInterval(() => {
        live.text += tokens[i++];
        boardEl?.scrollTo({ top: boardEl.scrollHeight });
        if (i >= tokens.length) {
          clearInterval(iv);
          streaming = false;
        }
      }, 26);
      timers.push(iv);
    }, 700);
  }

  function ask(text) {
    if (busy) return;
    messages.push({ id: nextId++, role: "user", text });
    if (text === ASKS.first) reply(task.explain[0]);
    else if (text === ASKS.hint) reply(task.hint);
    else if (text === ASKS.why) reply(task.why);
    else reply(TYPED_REPLY, { signIn: true });
  }

  function send() {
    if (!canSend) return;
    const text = draft.trim();
    draft = "";
    if (quote) {
      const q = quote;
      onClearQuote?.();
      messages.push({ id: nextId++, role: "user", text: text || QUOTE_ASK, quote: q });
      // A highlighted step gets that step explained; the task text gets the hint.
      reply(text ? TYPED_REPLY : q.step != null ? task.explain[q.step] : task.hint, { signIn: !!text });
      return;
    }
    ask(text);
  }

  function onKey(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  function reset() {
    timers.forEach(clearTimeout);
    timers = [];
    typing = streaming = false;
    messages = [];
    draft = "";
  }

  function rate(m, v) {
    m.rating = m.rating === v ? 0 : v;
  }

  // A fresh quote from the task card: put the cursor in the box under it.
  $effect(() => {
    if (quote) tick().then(() => inputEl?.focus({ preventScroll: true }));
  });

  onDestroy(() => timers.forEach(clearTimeout));
</script>

<div class="dc">
  <div class="dc-head">
    <div class="dc-ico" aria-hidden="true">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.9 5.8L20 10l-5 3.6L16.5 20 12 16.4 7.5 20 9 13.6 4 10l6.1-1.2z"/></svg>
    </div>
    <span class="dc-name">AI asistent</span>
    <span class="dc-ctx mono">#{task.id}</span>
    {#if !scripted}
      <button class="dc-btn" onclick={reset} title="Novi razgovor" aria-label="Novi razgovor">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
      </button>
    {/if}
    {#if onClose}
      <button class="dc-btn" onclick={onClose} title="Zatvori" aria-label="Zatvori AI asistenta">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
      </button>
    {/if}
  </div>

  <div class="dc-board" bind:this={boardEl}>
    {#if messages.length === 0}
      <p class="dc-empty">Asistent vidi zadatak koji rješavaš. Pitaj ga za hint prije nego otvoriš rješenje, ili označi dio zadatka i pitaj baš za njega.</p>
    {/if}
    {#each messages as m (m.id)}
      {#if m.role === "user"}
        <div class="dc-user">
          {#if m.quote}
            <div class="dc-quote">{@html renderChatMd(m.quote.text)}</div>
          {/if}
          <div class="dc-bubble">{m.text}</div>
        </div>
      {:else}
        {@const live = streaming && m.id === messages[messages.length - 1].id}
        <div class="dc-ai">
          <div class="dc-ai-text">{@html renderChatMd(m.text)}</div>
          {#if m.signIn && !live}
            <button class="btn btn-primary dc-signin" onclick={handleLogIn}>Prijavi se i pitaj</button>
          {/if}
          {#if !scripted && !live}
            <div class="dc-rate">
              <button class="btn btn-quiet" class:selected={m.rating === 1} aria-pressed={m.rating === 1} title="Koristan odgovor" aria-label="Koristan odgovor" onclick={() => rate(m, 1)}>👍</button>
              <button class="btn btn-quiet" class:selected={m.rating === -1} aria-pressed={m.rating === -1} title="Nije koristan odgovor" aria-label="Nije koristan odgovor" onclick={() => rate(m, -1)}>👎</button>
            </div>
          {/if}
        </div>
      {/if}
    {/each}
    {#if typing}
      <div class="dc-typing" aria-label="Asistent piše"><span></span><span></span><span></span></div>
    {/if}
  </div>

  {#if !scripted}
    <div class="dc-bottom">
      {#if suggestions.length && !quote}
        <div class="dc-chips">
          {#each suggestions as s (s)}
            <button class="dc-chip" disabled={busy} onclick={() => ask(s)}>{s}</button>
          {/each}
        </div>
      {/if}
      {#if quote}
        <div class="dc-pending">
          <div class="dc-pending-body">
            <span class="dc-pending-label">{quote.source === "solution" ? "Iz rješenja" : "Iz zadatka"}</span>
            <span class="dc-pending-text">{@html renderChatMd(quote.text)}</span>
          </div>
          <button class="dc-pending-x" onclick={onClearQuote} title="Makni citat" aria-label="Makni citat">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      {/if}
      <div class="dc-input">
        <textarea
          bind:this={inputEl}
          bind:value={draft}
          onkeydown={onKey}
          rows="1"
          placeholder={quote ? "Pošalji ili dopiši pitanje…" : "Pitaj o zadatku…"}
          aria-label="Poruka AI asistentu"
        ></textarea>
        <button class="dc-send" class:ready={canSend} disabled={!canSend} onclick={send} title="Pošalji" aria-label="Pošalji">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></svg>
        </button>
      </div>
    </div>
  {/if}
</div>

<style>
  .dc {
    height: 100%;
    display: flex;
    flex-direction: column;
    min-height: 0;
    background: var(--bg-elev);
  }
  .dc-head {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 12px 12px 16px;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }
  .dc-ico {
    width: 28px;
    height: 28px;
    display: grid;
    place-items: center;
    border-radius: 8px;
    background: var(--primary-dim);
    color: var(--primary);
  }
  .dc-name { font-size: 14px; font-weight: 600; }
  .dc-ctx { font-size: 11px; color: var(--text-faint); margin-right: auto; }
  .dc-btn {
    width: 30px;
    height: 30px;
    display: grid;
    place-items: center;
    border-radius: var(--r-md);
    color: var(--text-dim);
  }
  .dc-btn:hover { background: var(--bg-hover); color: var(--text); }

  .dc-board {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 18px 16px;
  }
  .dc-empty {
    margin: auto 0 0;
    font-size: 13px;
    line-height: 1.55;
    color: var(--text-faint);
  }

  /* The assistant writes on the page; the student's messages are bubbles. */
  .dc-user {
    align-self: flex-end;
    max-width: 88%;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 6px;
    animation: dc-in 0.18s ease-out;
  }
  .dc-bubble {
    padding: 9px 13px;
    border-radius: 16px 16px 4px 16px;
    background: var(--primary);
    color: var(--on-primary);
    font-size: 14px;
    font-weight: 500;
    line-height: 1.45;
  }
  .dc-quote {
    align-self: stretch;
    border-left: 2px solid var(--primary);
    padding: 2px 0 2px 10px;
    color: var(--text-dim);
    font-size: 13px;
    line-height: 1.5;
  }
  .dc-quote :global(p), .dc-pending-text :global(p) { margin: 0; }
  .dc-ai { max-width: 96%; display: flex; flex-direction: column; align-items: flex-start; gap: 6px; }
  .dc-ai-text { font-size: 14.5px; font-weight: 500; line-height: 1.65; color: var(--text); }
  .dc-ai-text :global(p) { margin: 0 0 0.6em; }
  .dc-ai-text :global(p:last-child) { margin-bottom: 0; }
  .dc-signin { margin-top: 4px; }
  .dc-rate { display: flex; gap: 4px; }
  .dc-rate .btn { padding: 4px 7px; font-size: 12px; opacity: 0.5; }
  .dc-rate .btn:hover { opacity: 1; }
  .dc-rate .btn.selected { opacity: 1; background: var(--primary-dim); border-color: var(--primary); }

  .dc-typing { display: flex; gap: 4px; padding: 6px 0; }
  .dc-typing span {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--text-faint);
    animation: dc-bounce 1.4s infinite ease-in-out both;
  }
  .dc-typing span:nth-child(2) { animation-delay: 0.16s; }
  .dc-typing span:nth-child(3) { animation-delay: 0.32s; }
  @keyframes dc-bounce {
    0%, 80%, 100% { transform: scale(0.7); opacity: 0.4; }
    40% { transform: scale(1); opacity: 1; }
  }
  @keyframes dc-in { from { opacity: 0; transform: translateY(6px); } }

  .dc-bottom {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 10px 14px 14px;
    flex-shrink: 0;
  }
  .dc-chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .dc-chip {
    height: 30px;
    padding: 0 12px;
    border: 1px solid var(--border);
    border-radius: var(--r-pill);
    background: var(--bg);
    color: var(--text-dim);
    font-size: 12.5px;
    white-space: nowrap;
    transition: background 0.12s, border-color 0.12s, color 0.12s;
  }
  .dc-chip:hover:not(:disabled) { color: var(--text); border-color: var(--primary-border); background: var(--bg-hover); }
  .dc-chip:disabled { opacity: 0.5; cursor: default; }

  .dc-pending {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 8px 10px;
    border: 1px solid var(--border);
    border-left: 2px solid var(--primary);
    border-radius: var(--r-md);
    background: var(--bg-elev-2);
    animation: dc-in 0.18s ease-out;
  }
  .dc-pending-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
  .dc-pending-label { font-size: 11px; color: var(--primary); font-weight: 500; }
  .dc-pending-text { font-size: 12.5px; color: var(--text-dim); line-height: 1.45; max-height: 60px; overflow: hidden; }
  .dc-pending-x { padding: 3px; border-radius: var(--r-sm); color: var(--text-faint); }
  .dc-pending-x:hover { background: var(--bg-hover); color: var(--text); }

  .dc-input {
    display: flex;
    align-items: flex-end;
    gap: 8px;
    padding: 6px 6px 6px 14px;
    border: 1px solid var(--border-strong);
    border-radius: 14px;
    background: var(--bg);
    transition: border-color 0.12s;
  }
  .dc-input:focus-within { border-color: var(--primary-border); }
  .dc-input textarea {
    flex: 1;
    min-width: 0;
    padding: 6px 0;
    border: 0;
    outline: 0;
    resize: none;
    background: none;
    font-size: 14px;
    line-height: 1.5;
  }
  .dc-input textarea::placeholder { color: var(--text-faint); }
  .dc-send {
    width: 32px;
    height: 32px;
    flex-shrink: 0;
    display: grid;
    place-items: center;
    border-radius: 10px;
    background: var(--bg-elev-2);
    color: var(--text-faint);
    transition: background 0.12s, color 0.12s;
  }
  .dc-send.ready { background: var(--primary); color: var(--on-primary); }
  .dc-send:disabled { cursor: default; }

  @media (prefers-reduced-motion: reduce) {
    .dc-user, .dc-pending { animation: none; }
  }
</style>
