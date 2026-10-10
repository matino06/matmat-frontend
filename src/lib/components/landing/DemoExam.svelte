<script>
  import { renderMdInline } from "$lib/utils/markdownRenderer";
  import { handleLogIn } from "$lib/store/user.svelte";
  import MultipleChoiceInput from "$lib/components/mockExam/MultipleChoiceInput.svelte";
  import DemoView from "./DemoView.svelte";
  import { DEMO_EXAMS, DEMO_EXAM_QUESTIONS } from "./demoData";

  // /mock-exam in the landing page preview: the list of exams, then a short
  // attempt drawn like /mock-exam/[examId] (three questions with the real
  // multiple-choice input), then the score.
  let { level = "A", onScrollTop } = $props();

  let stage = $state("list"); // list | attempt | result
  let exam = $state(null);
  let answers = $state({});

  let answered = $derived(Object.keys(answers).length);
  let score = $derived(DEMO_EXAM_QUESTIONS.filter((q, i) => answers[i] === q.correct).length);

  function start(i) {
    exam = DEMO_EXAMS[i];
    answers = {};
    stage = "attempt";
    onScrollTop?.();
  }

  function submit() {
    stage = "result";
    onScrollTop?.();
  }

  function back() {
    stage = "list";
    onScrollTop?.();
  }
</script>

{#if stage === "list"}
  <DemoView part="exams" {level} withHead onStartExam={start} />
{:else}
  <header class="de-top">
    <button class="btn btn-quiet de-back" onclick={back}>← Sve mature</button>
    <h1>Matematika {level}, {exam.title} {exam.year}.</h1>
    <div class="sub">Isječak ispita · <span class="mono">{DEMO_EXAM_QUESTIONS.length} boda</span></div>
  </header>

  {#if stage === "attempt"}
    <div class="de-questions">
      {#each DEMO_EXAM_QUESTIONS as q, i (i)}
        <section class="de-q">
          <div class="de-q-head">
            <span class="de-q-num">{i + 1}.</span>
            <span class="badge badge-dim mono">1 bod</span>
          </div>
          <div class="de-q-text">{@html renderMdInline(q.text)}</div>
          <MultipleChoiceInput value={answers[i] ?? null} options={q.options} onChange={(l) => (answers[i] = l)} />
        </section>
      {/each}
    </div>

    <div class="de-submit">
      <span><span class="mono">{answered} / {DEMO_EXAM_QUESTIONS.length}</span> odgovoreno</span>
      <button class="btn btn-primary btn-lg" disabled={answered === 0} onclick={submit}>Predaj maturu</button>
    </div>
  {:else}
    <div class="card de-score">
      <div class="de-score-val mono">{score}<span>/{DEMO_EXAM_QUESTIONS.length}</span></div>
      <div>
        <div class="de-score-title">{score === DEMO_EXAM_QUESTIONS.length ? "Sve točno." : "Rezultat isječka"}</div>
        <div class="de-score-sub">Cijeli ispit, s pregledom svake greške i rješenjima zadataka, rješavaš u aplikaciji.</div>
      </div>
    </div>

    <div class="de-answers">
      {#each DEMO_EXAM_QUESTIONS as q, i (i)}
        {@const ok = answers[i] === q.correct}
        <div class="de-ans">
          <span class="de-ans-mark" class:ok>{ok ? "✓" : "✗"}</span>
          <span class="de-ans-q">{@html renderMdInline(q.text)}</span>
          <span class="de-ans-key">
            {#if ok}
              {q.correct}
            {:else}
              {answers[i] ?? "—"} → <b>{q.correct}</b>
            {/if}
          </span>
        </div>
      {/each}
    </div>

    <div class="de-cta">
      <button class="btn btn-primary btn-lg" onclick={handleLogIn}>Riješi cijeli ispit</button>
      <button class="btn btn-ghost btn-lg" onclick={() => start(DEMO_EXAMS.indexOf(exam))}>Pokušaj ponovno</button>
    </div>
  {/if}
{/if}

<style>
  .de-top { margin-bottom: 18px; }
  .de-back { padding: 4px 8px; margin: 0 0 8px -8px; }
  .de-top h1 { margin: 0; font-size: 22px; font-weight: 600; letter-spacing: -0.015em; }
  .de-top .sub { color: var(--text-faint); font-size: 13px; margin-top: 2px; }

  .de-questions { display: flex; flex-direction: column; gap: 12px; }
  .de-q {
    background: var(--bg-elev);
    border: 1px solid var(--border);
    border-radius: var(--r-xl);
    padding: 18px 20px;
  }
  .de-q-head { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
  .de-q-num { font-family: var(--font-mono); font-weight: 600; font-size: 13px; color: var(--text-faint); }
  .de-q-text { font-size: 15px; line-height: 1.6; margin-bottom: 14px; }

  .de-submit {
    position: sticky;
    bottom: 0;
    margin: 16px -28px -40px;
    padding: 12px 28px 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    border-top: 1px solid var(--border);
    background: var(--bg);
    font-size: 13px;
    color: var(--text-dim);
  }
  .de-submit .btn:disabled { opacity: 0.5; cursor: default; }

  .de-score { padding: 22px 24px; display: flex; align-items: center; gap: 24px; }
  .de-score-val { font-size: 44px; font-weight: 600; letter-spacing: -0.04em; line-height: 1; }
  .de-score-val span { font-size: 20px; color: var(--text-faint); }
  .de-score-title { font-size: 16px; font-weight: 600; }
  .de-score-sub { margin-top: 4px; font-size: 13px; color: var(--text-dim); line-height: 1.5; }

  .de-answers { margin-top: 14px; display: flex; flex-direction: column; }
  .de-ans {
    display: grid;
    grid-template-columns: 22px 1fr auto;
    gap: 12px;
    align-items: center;
    padding: 11px 14px;
    border: 1px solid var(--border);
    border-top-width: 0;
    background: var(--bg-elev);
    font-size: 14px;
  }
  .de-ans:first-child { border-top-width: 1px; border-radius: var(--r-lg) var(--r-lg) 0 0; }
  .de-ans:last-child { border-radius: 0 0 var(--r-lg) var(--r-lg); }
  .de-ans-mark { color: var(--danger); font-weight: 700; text-align: center; }
  .de-ans-mark.ok { color: var(--success); }
  .de-ans-key { font-family: var(--font-mono); font-size: 13px; color: var(--text-dim); }
  .de-ans-key b { color: var(--success); }

  .de-cta { margin-top: 18px; display: flex; gap: 10px; flex-wrap: wrap; }

  @media (max-width: 760px) {
    .de-submit { margin: 16px -14px -32px; padding: 12px 14px 14px; }
  }
</style>
