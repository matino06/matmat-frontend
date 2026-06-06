<script>
  import { renderMath } from "$lib/utils/mockExamRenderer";
  import { imageUrl } from "$lib/utils/imageUrl";
  import MultipleChoiceInput from "./MultipleChoiceInput.svelte";
  import ShortAnswerInput from "./ShortAnswerInput.svelte";
  import PhotoUploadInput from "./PhotoUploadInput.svelte";
  import Self from "./Question.svelte";

  let { question, answers = {}, onAnswer, depth = 0 } = $props();

  const myAnswer = $derived(answers[question.questionId]?.value ?? null);

  const questionImages = $derived(
    (question.images ?? []).filter((i) => i.imageContext === "question"),
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

  console.log(question);

  function set(value) {
    onAnswer?.(question.questionId, {
      type: question.questionType,
      value,
    });
  }
</script>

<section
  id="q-{question.questionId}"
  class="q {depth > 0 ? 'q-sub' : ''}"
>
  <div class="q-head">
    <span class="q-num">{question.questionNumber}.</span>
    {#if question.points > 0}
      <span class="badge badge-dim mono">{question.points} {question.points === 1 ? "bod" : "boda"}</span>
    {/if}
  </div>

  <div class="q-text">{@html renderMath(question.questionText ?? "")}</div>

  {#if questionImages.length}
    <div class="q-images">
      {#each questionImages as img (img.imageUrl)}
        <img src={imageUrl(img.imageUrl)} alt={img.altText ?? ""} />
      {/each}
    </div>
  {/if}

  {#if question.questionType === "multiple_choice"}
    <MultipleChoiceInput
      value={myAnswer}
      options={mcOptions}
      {optionImages}
      onChange={set}
    />
  {:else if question.questionType === "short_answer"}
    <ShortAnswerInput value={myAnswer ?? ""} onChange={set} />
  {:else if question.questionType === "short_answer_graph" || question.questionType === "extended_answer"}
    <PhotoUploadInput value={myAnswer ?? ""} onChange={set} />
  {/if}

  {#if question.subQuestions?.length}
    <div class="q-subs">
      {#each question.subQuestions as sub (sub.questionId)}
        <Self question={sub} {answers} {onAnswer} depth={depth + 1} />
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
  @media (max-width: 767px) {
    .q { padding: 14px 16px; }
    .q-sub { padding: 10px 12px; }
  }
</style>
