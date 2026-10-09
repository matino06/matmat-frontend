<script>
  import { renderMath, renderMathInline } from "$lib/utils/mockExamRenderer";
  import { imageUrl } from "$lib/utils/imageUrl";
  import { updateMockExamQuestion } from "$lib/api/mockExam";
  import MultipleChoiceInput from "./MultipleChoiceInput.svelte";
  import MathField from "./MathField.svelte";
  import Self from "./EditableQuestion.svelte";

  // Admin view of one exam question: renders it like Question.svelte plus its
  // solution, and swaps to an editor with live previews on "Uredi".
  // `onSaved(updated)` hands the saved question back so the page can update its tree.
  let { question, onSaved, depth = 0 } = $props();

  // Every field PUT /admin/mock-exams/questions/{id} replaces.
  const FIELDS = [
    "questionText",
    "optionA",
    "optionB",
    "optionC",
    "optionD",
    "correctOption",
    "correctAnswer",
    "answerNotes",
    "solutionExplanation",
  ];
  const LETTERS = ["A", "B", "C", "D"];

  let editing = $state(false);
  let form = $state(null);
  let saving = $state(false);
  let saveError = $state("");

  const isMc = $derived(question.questionType === "multiple_choice");
  // Short answers are shown inline on the results page; everything else as blocks.
  const answerInline = $derived(question.questionType === "short_answer");

  const questionImages = $derived(
    (question.images ?? []).filter((i) => i.imageContext === "question"),
  );
  const answerImages = $derived(
    (question.images ?? []).filter((i) => i.imageContext === "answer"),
  );
  const optionImages = $derived(
    (question.images ?? []).reduce((acc, img) => {
      if (img.imageContext?.startsWith("option_")) acc[img.imageContext] = img;
      return acc;
    }, {}),
  );
  const mcOptions = $derived([
    question.optionA,
    question.optionB,
    question.optionC,
    question.optionD,
  ]);

  const hasSolution = $derived(
    !!(
      question.correctOption ||
      question.correctAnswer ||
      question.solutionExplanation ||
      question.answerNotes ||
      answerImages.length
    ),
  );

  function snapshot() {
    const f = {};
    for (const key of FIELDS) f[key] = question[key] ?? "";
    return f;
  }

  const dirty = $derived(
    !!form && FIELDS.some((key) => (form[key] ?? "") !== (question[key] ?? "")),
  );
  const canSave = $derived(!!form && !saving && dirty && !!form.questionText.trim());

  function startEdit() {
    form = snapshot();
    saveError = "";
    editing = true;
  }

  function cancel() {
    if (dirty && !confirm("Odbaciti nespremljene izmjene?")) return;
    editing = false;
    form = null;
    saveError = "";
  }

  async function save() {
    if (!canSave) return;
    saving = true;
    saveError = "";
    try {
      const body = {};
      for (const key of FIELDS) body[key] = form[key] === "" ? null : form[key];
      const updated = await updateMockExamQuestion(question.questionId, body);
      onSaved?.(updated);
      editing = false;
      form = null;
    } catch (e) {
      saveError = e?.message ?? String(e);
    }
    saving = false;
  }
</script>

<section
  id="q-{question.questionId}"
  class="q {depth > 0 ? 'q-sub' : ''}"
  class:q-editing={editing}
>
  <div class="q-head">
    <span class="q-num">{question.questionNumber}.</span>
    {#if question.points > 0}
      <span class="badge badge-dim mono">{question.points} {question.points === 1 ? "bod" : "boda"}</span>
    {/if}
    {#if !editing}
      <button class="btn btn-ghost q-edit" type="button" onclick={startEdit}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 20h9"/>
          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>
        </svg>
        Uredi
      </button>
    {/if}
  </div>

  {#if editing && form}
    <div class="editor">
      <MathField
        id="qt-{question.questionId}"
        label="Tekst pitanja"
        rows={4}
        bind:value={form.questionText}
        disabled={saving}
      />

      {#if questionImages.length}
        <div class="q-images">
          {#each questionImages as img (img.imageUrl)}
            <img src={imageUrl(img.imageUrl)} alt={img.altText ?? ""} />
          {/each}
        </div>
      {/if}

      {#if isMc}
        <div class="editor-grid">
          {#each LETTERS as letter (letter)}
            <MathField
              id="opt{letter}-{question.questionId}"
              label="Opcija {letter}"
              inline
              rows={1}
              bind:value={form[`option${letter}`]}
              disabled={saving}
            />
          {/each}
        </div>
        <div class="select-field">
          <label for="co-{question.questionId}">Točna opcija</label>
          <select id="co-{question.questionId}" bind:value={form.correctOption} disabled={saving}>
            <option value="">—</option>
            {#each LETTERS as letter (letter)}
              <option value={letter}>{letter}</option>
            {/each}
          </select>
        </div>
      {:else if question.questionType}
        <MathField
          id="ca-{question.questionId}"
          label="Točan odgovor"
          inline={answerInline}
          rows={answerInline ? 1 : 3}
          bind:value={form.correctAnswer}
          disabled={saving}
        />
      {/if}

      {#if question.questionType}
        <MathField
          id="se-{question.questionId}"
          label="Obrazloženje rješenja"
          rows={6}
          bind:value={form.solutionExplanation}
          disabled={saving}
        />
        <MathField
          id="an-{question.questionId}"
          label="Napomene uz odgovor"
          rows={2}
          bind:value={form.answerNotes}
          disabled={saving}
        />
      {/if}

      <div class="editor-actions">
        <button class="btn btn-primary" type="button" onclick={save} disabled={!canSave}>
          {saving ? "Spremanje…" : "Spremi"}
        </button>
        <button class="btn btn-ghost" type="button" onclick={cancel} disabled={saving}>Odustani</button>
        {#if !form.questionText.trim()}
          <span class="editor-error">Tekst pitanja ne smije biti prazan.</span>
        {:else if saveError}
          <span class="editor-error">{saveError}</span>
        {/if}
      </div>
    </div>
  {:else}
    <div class="q-text">{@html renderMath(question.questionText ?? "")}</div>

    {#if questionImages.length}
      <div class="q-images">
        {#each questionImages as img (img.imageUrl)}
          <img src={imageUrl(img.imageUrl)} alt={img.altText ?? ""} />
        {/each}
      </div>
    {/if}

    {#if isMc}
      <MultipleChoiceInput
        value={question.correctOption}
        options={mcOptions}
        {optionImages}
        readonly
      />
    {/if}

    {#if question.questionType}
      <div class="solution">
        <div class="solution-label">Rješenje</div>
        {#if !hasSolution}
          <div class="solution-empty">Nema upisanog rješenja.</div>
        {/if}
        {#if isMc && question.correctOption}
          <div class="solution-row">
            <span class="solution-key">Točna opcija</span>
            <span class="mono">{question.correctOption}</span>
          </div>
        {/if}
        {#if !isMc && question.correctAnswer}
          <div class="solution-row">
            <span class="solution-key">Točan odgovor</span>
            <div class="solution-value">
              {@html answerInline ? renderMathInline(question.correctAnswer) : renderMath(question.correctAnswer)}
            </div>
          </div>
        {/if}
        {#if answerImages.length}
          <div class="q-images">
            {#each answerImages as img (img.imageUrl)}
              <img src={imageUrl(img.imageUrl)} alt={img.altText ?? ""} />
            {/each}
          </div>
        {/if}
        {#if question.solutionExplanation}
          <div class="solution-row">
            <span class="solution-key">Obrazloženje</span>
            <div class="solution-value">{@html renderMath(question.solutionExplanation)}</div>
          </div>
        {/if}
        {#if question.answerNotes}
          <div class="solution-row">
            <span class="solution-key">Napomene</span>
            <div class="solution-value">{@html renderMath(question.answerNotes)}</div>
          </div>
        {/if}
      </div>
    {/if}
  {/if}

  {#if question.subQuestions?.length}
    <div class="q-subs">
      {#each question.subQuestions as sub (sub.questionId)}
        <Self question={sub} {onSaved} depth={depth + 1} />
      {/each}
    </div>
  {/if}
</section>

<style>
  .q {
    background: var(--bg-elev);
    border: 1px solid var(--border);
    border-radius: var(--r-xl);
    padding: 20px 22px;
    scroll-margin-top: 20px;
  }
  .q-sub {
    background: transparent;
    border: 1px dashed var(--border);
    border-radius: var(--r-md);
    padding: 14px 16px;
  }
  .q-editing {
    border-color: var(--primary-border);
  }
  .q-head {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 10px;
  }
  .q-num {
    font-family: var(--font-mono);
    font-weight: 600;
    font-size: 13px;
    color: var(--text-faint);
  }
  .q-edit {
    margin-left: auto;
    padding: 6px 10px;
    font-size: 12px;
  }
  .q-text {
    color: var(--text);
    font-size: 15px;
    line-height: 1.6;
    margin-bottom: 14px;
  }
  .q-text :global(p) { margin: 0 0 8px; }
  .q-text :global(p:last-child) { margin-bottom: 0; }
  .q-images {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin-bottom: 14px;
  }
  .q-images img {
    max-width: 100%;
    height: auto;
    border-radius: var(--r-md);
    background: #fff;
  }
  .q-subs {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-top: 14px;
  }

  .solution {
    margin-top: 14px;
    padding: 12px 14px;
    border-radius: var(--r-md);
    border: 1px solid var(--border);
    background: var(--bg-elev-2);
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .solution-label,
  .solution-key {
    font-size: 11px;
    color: var(--text-faint);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-weight: 500;
  }
  .solution-empty {
    font-size: 13px;
    color: var(--text-faint);
  }
  .solution-row {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }
  .solution-value {
    color: var(--text);
    font-size: 14px;
    line-height: 1.6;
    overflow-x: auto;
  }
  .solution-value :global(p) { margin: 0 0 8px; }
  .solution-value :global(p:last-child) { margin-bottom: 0; }

  .editor {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .editor-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
  }
  @media (max-width: 720px) {
    .editor-grid { grid-template-columns: 1fr; }
  }
  .select-field {
    display: flex;
    flex-direction: column;
    gap: 6px;
    max-width: 160px;
  }
  .select-field label {
    font-size: 11px;
    color: var(--text-faint);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-weight: 500;
  }
  .select-field select {
    padding: 9px 12px;
    border-radius: var(--r-md);
    border: 1px solid var(--border);
    background: var(--bg-elev);
    color: var(--text);
    font-size: 13px;
    font-family: var(--font-mono);
    cursor: pointer;
    outline: none;
  }
  .select-field select:focus {
    border-color: var(--primary);
  }
  .editor-actions {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
  }
  .editor-actions .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .editor-error {
    font-size: 13px;
    color: var(--danger);
  }

  @media (max-width: 767px) {
    .q { padding: 14px 16px; }
    .q-sub { padding: 10px 12px; }
  }
</style>
