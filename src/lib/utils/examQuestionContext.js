import { imageUrl } from "./imageUrl.js";

// Builds the AI context for one graded mock-exam question.
//
// The attempt endpoint returns a flat list whose images live in structured arrays
// (questionImages / correctAnswerImages), not as <img> inside the text — so
// taskImages() from the /tasks path doesn't apply here and we assemble both the
// prose context and the image list ourselves.

function questionImagesOf(answer) {
  return (answer?.questionImages ?? []).filter((i) => i.imageContext === "question");
}

function optionImagesOf(answer) {
  return (answer?.questionImages ?? []).filter((i) => i.imageContext?.startsWith("option_"));
}

function pushImages(into, seen, list, altFallback) {
  for (const img of list ?? []) {
    const src = imageUrl(img?.imageUrl);
    if (!src || seen.has(src)) continue;
    seen.add(src);
    into.push({ src, alt: img.altText || altFallback });
  }
}

function examLabel(examMeta) {
  if (!examMeta) return "";
  const parts = [examMeta.title, examMeta.year, examMeta.term].filter(Boolean);
  return parts.join(" ");
}

/**
 * @param {object} answer the graded answer for one question
 * @param {object|null} parent the container question, when this is a sub-question —
 *   its shared intro text and images are needed for the sub-question to make sense
 * @param {{title?: string, year?: number|string, term?: string}|null} examMeta
 * @returns {{ text: string, context: string, images: {src: string, alt: string}[] }}
 */
export function buildExamQuestionContext(answer, parent = null, examMeta = null) {
  const num = answer?.questionNumber ?? "?";
  const score = answer?.scoreAwarded ?? 0;
  const max = answer?.maxPoints ?? 0;

  // Short label — this is what the student sees in the pill and their message.
  const textParts = [`Pitanje ${num}`, `${score}/${max} ${max === 1 ? "bod" : "boda"}`];
  const label = examLabel(examMeta);
  if (label) textParts.push(label);
  const text = textParts.join(" · ");

  // Full context — this is what the model gets.
  const lines = [];
  if (label) lines.push(`Exam: ${label}`);

  if (parent) {
    lines.push(
      `This is sub-question ${num} of question ${parent.questionNumber}. Shared introduction for the whole question:`,
      parent.questionText ?? "(no text)",
      "",
    );
  }

  lines.push(`Question ${num} (${max} ${max === 1 ? "point" : "points"}):`, answer?.questionText ?? "(no text)");

  if (answer?.questionType === "multiple_choice") {
    const opts = [
      ["A", answer.optionA],
      ["B", answer.optionB],
      ["C", answer.optionC],
      ["D", answer.optionD],
    ].filter(([, t]) => t);
    if (opts.length) {
      lines.push("", "Options:", ...opts.map(([letter, t]) => `${letter}) ${t}`));
    }
    lines.push(
      "",
      `Student picked: ${answer.selectedOption ?? "nothing"}`,
      `Correct option: ${answer.correctOption ?? "unknown"}`,
    );
  } else if (answer?.answerText) {
    // Displayed as LaTeX in the UI, so hand it over the same way.
    lines.push("", `Student's answer: \\(${answer.answerText}\\)`);
  } else if (answer?.answerImageUrl) {
    lines.push("", "Student's answer: submitted as a photo of their handwritten work (attached).");
  } else {
    lines.push("", "Student's answer: left blank.");
  }

  if (answer?.correctAnswer) lines.push(`Correct answer: ${answer.correctAnswer}`);
  lines.push(`Score: ${score} out of ${max}.`);

  if (answer?.solutionExplanation) {
    lines.push("", "Official solution:", answer.solutionExplanation);
  }
  if (answer?.aiFeedback) {
    lines.push("", "Grader's feedback on this answer:", answer.aiFeedback);
  }
  if (answer?.criterionScores?.length) {
    lines.push("", "Marking criteria:");
    for (const c of answer.criterionScores) {
      const fb = c.aiFeedback ? ` — ${c.aiFeedback}` : "";
      lines.push(`- ${c.description ?? "criterion"}: ${c.pointsAwarded}/${c.maxPoints}${fb}`);
    }
  }

  const images = [];
  const seen = new Set();
  pushImages(images, seen, questionImagesOf(parent), "slika uz zadatak");
  pushImages(images, seen, questionImagesOf(answer), "slika uz pitanje");
  pushImages(images, seen, optionImagesOf(answer), "slika uz ponuđeni odgovor");
  pushImages(images, seen, answer?.correctAnswerImages, "slika točnog odgovora");

  return { text, context: lines.join("\n"), images };
}
