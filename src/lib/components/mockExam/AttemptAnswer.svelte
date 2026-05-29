<script>
  import { renderMath, renderMathInline } from "$lib/utils/mockExamRenderer";
  import { imageUrl } from "$lib/utils/imageUrl";
  import { fitMath } from "$lib/utils/fitMath";

  let { answer, onRefresh } = $props();

  let imgFailed = $state(false);
  let imgSrc = $state(null);
  let converting = $state(false);
  let explanationOpen = $state(false);

  $effect(() => {
    const url = answer.answerImageUrl;
    imgFailed = false;
    if (!url) { imgSrc = null; return; }
    const path = url.split("?")[0];
    if (/\.(heic|heif)$/i.test(path)) {
      convertHeic(url);
    } else {
      imgSrc = url;
    }
  });

  async function convertHeic(url) {
    converting = true;
    imgSrc = null;
    try {
      const { default: heic2any } = await import("heic2any");
      const resp = await fetch(url);
      const blob = await resp.blob();
      const jpeg = await heic2any({ blob, toType: "image/jpeg", quality: 0.9 });
      imgSrc = URL.createObjectURL(Array.isArray(jpeg) ? jpeg[0] : jpeg);
    } catch {
      imgFailed = true;
    } finally {
      converting = false;
    }
  }

  const questionImages = $derived(
    (answer.questionImages ?? []).filter((i) => i.imageContext === "question"),
  );

  const optionImages = $derived(
    (answer.questionImages ?? []).reduce((acc, img) => {
      if (img.imageContext?.startsWith("option_")) acc[img.imageContext] = img;
      return acc;
    }, {}),
  );

  const mcOptions = $derived([
    { letter: "A", text: answer.optionA },
    { letter: "B", text: answer.optionB },
    { letter: "C", text: answer.optionC },
    { letter: "D", text: answer.optionD },
  ]);

  const scoreClass = $derived(
    answer.aiGradingStatus === "FAILED"
      ? "score-failed"
      : answer.isCorrect
        ? "score-correct"
        : answer.scoreAwarded > 0 && answer.scoreAwarded < answer.maxPoints
          ? "score-partial"
          : "score-wrong",
  );

  const isImageType =
    answer.questionType === "extended_answer" ||
    answer.questionType === "short_answer_graph";
</script>

<section class="ans">
  <header class="ans-head">
    <div class="ans-meta">
      <span class="ans-num mono">{answer.questionNumber}.</span>
      <span class="ans-score mono {scoreClass}">
        {answer.scoreAwarded ?? 0} / {answer.maxPoints}
      </span>
      {#if answer.aiGradingStatus === "PENDING"}
        <span class="ai-pending">
          <span class="spinner"></span>
          AI ocjenjuje
        </span>
      {:else if answer.aiGradingStatus === "FAILED"}
        <span class="ai-failed">AI ocjenjivanje nije uspjelo</span>
      {/if}
    </div>
  </header>

  <div class="ans-q">{@html renderMath(answer.questionText ?? "")}</div>

  {#if questionImages.length}
    <div class="ans-q-images">
      {#each questionImages as img (img.imageUrl)}
        <img src={imageUrl(img.imageUrl)} alt={img.altText ?? ""} />
      {/each}
    </div>
  {/if}

  {#if answer.questionType === "multiple_choice"}
    <div class="mc-options">
      {#each mcOptions as opt (opt.letter)}
        {@const img = optionImages[`option_${opt.letter.toLowerCase()}`]}
        {@const isCorrect = opt.letter === answer.correctOption}
        {@const isWrongSelected = opt.letter === answer.selectedOption && !answer.isCorrect}
        <div class="mc-option {isCorrect ? 'mc-correct' : isWrongSelected ? 'mc-wrong' : ''}">
          <span class="mc-letter">{opt.letter}</span>
          <div class="mc-body">
            {#if img}
              <img src={imageUrl(img.imageUrl)} alt={img.altText ?? `Opcija ${opt.letter}`} />
              {#if opt.text}
                <div class="mc-caption">{@html renderMathInline(opt.text)}</div>
              {/if}
            {:else}
              <div class="mc-text">{@html renderMathInline(opt.text ?? "")}</div>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {:else if answer.questionType === "short_answer"}
    <div class="sa-block">
      <div class="sa-label">Tvoj odgovor</div>
      <div class="sa-value">{@html renderMathInline(answer.answerText ? "$" + answer.answerText + "$" : "—")}</div>
    </div>
    {#if answer.correctAnswerImages?.length}
      <div class="sa-block sa-block-ref">
        <div class="sa-label">Očekivano</div>
        <div class="sa-value">
          {#each answer.correctAnswerImages as img}
            <img src={imageUrl(img.imageUrl)} alt={img.altText ?? ""} />
          {/each}
        </div>
      </div>
    {:else if answer.correctAnswer}
      <div class="sa-block sa-block-ref">
        <div class="sa-label">Očekivano</div>
        <div class="sa-value">{@html renderMathInline(answer.correctAnswer)}</div>
      </div>
    {/if}
  {:else if isImageType}
    <div class="img-block">
      {#if converting}
        <div class="img-expired">
          <span class="spinner" style="width:16px;height:16px"></span>
          Konvertiranje HEIC slike…
        </div>
      {:else if imgSrc && !imgFailed}
        <img
          src={imgSrc}
          alt="Tvoje rješenje"
          onerror={() => (imgFailed = true)}
        />
      {:else}
        <div class="img-expired">
          Slika je istekla.
          {#if onRefresh}
            <button class="btn btn-ghost" type="button" onclick={onRefresh}>Osvježi</button>
          {/if}
        </div>
      {/if}
    </div>
    {#if (answer.scoreAwarded ?? 0) < (answer.maxPoints ?? 0)}
      {#if answer.correctAnswerImages && answer.correctAnswerImages.length > 0}
        <div class="sa-block sa-block-ref">
          <div class="sa-label">Ispravan odgovor</div>
          <div class="q-images">
            {#each answer.correctAnswerImages as img}
              <img src={imageUrl(img.imageUrl)} alt={img.altText ?? ""} />
            {/each}
          </div>
        </div>
      {:else if answer.correctAnswer}
        <div class="sa-block sa-block-ref">
          <div class="sa-label">Ispravan odgovor</div>
          <div class="sa-value">{@html renderMath(answer.correctAnswer)}</div>
        </div>
      {/if}
    {/if}
  {/if}

  {#if answer.solutionExplanation}
    <div class="explanation">
      <button
        class="explanation-toggle"
        type="button"
        onclick={() => (explanationOpen = !explanationOpen)}
        aria-expanded={explanationOpen}
      >
        <svg
          class="explanation-chevron {explanationOpen ? 'open' : ''}"
          width="14" height="14" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" stroke-width="2.5"
        >
          <polyline points="6 9 12 15 18 9"/>
        </svg>
        Obrazloženje rješenja
      </button>
      {#if explanationOpen}
        <div class="explanation-body" use:fitMath>
          {@html renderMath(answer.solutionExplanation)}
        </div>
      {/if}
    </div>
  {/if}

  {#if answer.aiFeedback}
    <div class="feedback {answer.aiGradingStatus === 'FAILED' ? 'feedback-err' : ''}">
      <div class="feedback-label">AI komentar</div>
      <div class="feedback-body">{@html renderMath(answer.aiFeedback)}</div>
    </div>
  {/if}

  {#if answer.criterionScores?.length}
    <table class="crit">
      <thead>
        <tr>
          <th>Kriterij</th>
          <th class="num">Bodovi</th>
          <th>Komentar</th>
        </tr>
      </thead>
      <tbody>
        {#each answer.criterionScores as c (c.criterionId)}
          <tr>
            <td>{@html renderMathInline(c.description ?? "")}</td>
            <td class="num mono">{c.pointsAwarded} / {c.maxPoints}</td>
            <td class="crit-fb">{@html renderMathInline(c.aiFeedback ?? "")}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}
</section>

<style>
  .ans {
    background: var(--bg-elev);
    border: 1px solid var(--border);
    border-radius: var(--r-xl);
    padding: 18px 20px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-width: 0;
  }
  .ans-head { display: flex; align-items: center; }
  .ans-meta { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .ans-num { color: var(--text-faint); font-weight: 600; font-size: 13px; }
  .ans-score {
    font-weight: 700;
    font-size: 13px;
    padding: 3px 10px;
    border-radius: var(--r-pill);
    border: 1px solid var(--border);
  }
  .score-correct {
    background: color-mix(in oklab, var(--success) 15%, transparent);
    color: var(--success);
    border-color: color-mix(in oklab, var(--success) 35%, transparent);
  }
  .score-partial {
    background: color-mix(in oklab, var(--warn) 15%, transparent);
    color: var(--warn);
    border-color: color-mix(in oklab, var(--warn) 35%, transparent);
  }
  .score-wrong {
    background: color-mix(in oklab, var(--danger) 15%, transparent);
    color: var(--danger);
    border-color: color-mix(in oklab, var(--danger) 35%, transparent);
  }
  .score-failed {
    background: var(--bg-elev-2);
    color: var(--text-faint);
  }
  .ai-pending {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: var(--text-faint);
    font-size: 12px;
  }
  .ai-failed { color: var(--danger); font-size: 12px; }

  .ans-q { color: var(--text); font-size: 14px; line-height: 1.55; }
  .ans-q :global(p) { margin: 0 0 4px; }

  .ans-q-images {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }
  .ans-q-images img {
    max-width: 100%;
    height: auto;
    border-radius: var(--r-md);
    background: #fff;
  }

  .mc-body {
    flex: 1;
    min-width: 0;
  }
  .mc-body img {
    max-width: 100%;
    height: auto;
    border-radius: var(--r-sm);
    background: #fff;
  }
  .mc-caption {
    margin-top: 6px;
    color: var(--text-dim);
    font-size: 12px;
  }
  .mc-text {
    color: var(--text);
    font-size: 14px;
    line-height: 1.45;
  }

  .mc-options {
    display: grid;
    grid-template-columns: 1fr;
    gap: 6px;
  }
  .mc-option {
    display: flex;
    align-items: baseline;
    gap: 10px;
    padding: 8px 12px;
    border-radius: var(--r-md);
    border: 1px solid var(--border);
    background: var(--bg);
    font-size: 14px;
    color: var(--text-dim);
  }
  @media (min-width: 640px) {
    .mc-options {
      grid-template-columns: 1fr 1fr;
    }
  }
  .mc-correct {
    background: color-mix(in oklab, var(--success) 12%, transparent);
    border-color: color-mix(in oklab, var(--success) 40%, transparent);
    color: var(--text);
  }
  .mc-wrong {
    background: color-mix(in oklab, var(--danger) 12%, transparent);
    border-color: color-mix(in oklab, var(--danger) 40%, transparent);
    color: var(--text);
  }
  .mc-letter {
    font-family: var(--font-mono);
    font-weight: 700;
    font-size: 13px;
    flex-shrink: 0;
    width: 18px;
  }
  .mc-correct .mc-letter { color: var(--success); }
  .mc-wrong .mc-letter { color: var(--danger); }
  .mc-text { flex: 1; line-height: 1.45; }

  .sa-block {
    border: 1px solid var(--border);
    border-radius: var(--r-md);
    padding: 10px 14px;
    background: var(--bg);
  }
  .sa-block-ref { background: var(--bg-elev-2); }
  .sa-label { color: var(--text-faint); font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 4px; }
  .sa-value { color: var(--text); font-size: 15px; }

  .img-block {
    border: 1px solid var(--border);
    border-radius: var(--r-md);
    overflow: hidden;
  }
  .img-block img {
    display: block;
    width: 100%;
    max-height: 540px;
    object-fit: contain;
    background: #000;
  }
  .img-expired {
    padding: 16px;
    color: var(--text-faint);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    font-size: 13px;
  }

  .explanation {
    border: 1px solid var(--border);
    border-radius: var(--r-md);
    overflow: hidden;
  }
  .explanation-toggle {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 10px 14px;
    background: var(--bg);
    color: var(--text-dim);
    font-size: 12px;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    cursor: pointer;
    border: none;
    text-align: left;
    transition: color 0.15s;
  }
  .explanation-toggle:hover { color: var(--text); }
  .explanation-chevron {
    flex-shrink: 0;
    transition: transform 0.2s;
    color: var(--text-faint);
  }
  .explanation-chevron.open { transform: rotate(180deg); }
  .explanation-body {
    padding: 10px 14px 12px;
    border-top: 1px solid var(--border);
    background: var(--bg);
    color: var(--text);
    font-size: 13px;
    line-height: 1.55;
    overflow-x: auto;
  }
  .explanation-body :global(p) { margin: 0 0 6px; }
  .explanation-body :global(p:last-child) { margin-bottom: 0; }

  .feedback {
    background: var(--bg);
    border: 1px solid var(--border);
    border-left: 3px solid var(--primary);
    border-radius: var(--r-md);
    padding: 10px 14px;
  }
  .feedback-err { border-left-color: var(--danger); }
  .feedback-label {
    color: var(--text-faint);
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin-bottom: 4px;
  }
  .feedback-body { color: var(--text); font-size: 13px; line-height: 1.5; }
  .feedback-body :global(p) { margin: 0 0 4px; }

  .crit {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }
  .crit th, .crit td {
    text-align: left;
    padding: 8px 10px;
    border-bottom: 1px solid var(--border);
    vertical-align: top;
  }
  .crit th {
    color: var(--text-faint);
    font-weight: 500;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .num { text-align: right; white-space: nowrap; }
  .crit-fb { color: var(--text-dim); font-size: 12px; }

  .spinner {
    width: 12px;
    height: 12px;
    border: 2px solid var(--border);
    border-top-color: var(--primary);
    border-radius: 50%;
    display: inline-block;
    animation: spin .8s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
</style>
