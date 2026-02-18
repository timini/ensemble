function findLastCapturedGroup(value: string, pattern: RegExp): string | null {
  let lastMatch: string | null = null;
  for (const match of value.matchAll(pattern)) {
    lastMatch = match[1];
  }
  return lastMatch;
}

export function extractNumericAnswer(value: string): string | null {
  const markerMatch = value.match(/####\s*([-+]?\d[\d,]*(?:\.\d+)?)/);
  if (markerMatch) {
    return markerMatch[1].replaceAll(',', '');
  }

  const explicitAnswer = findLastCapturedGroup(
    value,
    /\b(?:final answer|answer|result)\b(?:\s+is|\s*[:=-])?\s*([-+]?\d[\d,]*(?:\.\d+)?)(?!\s*%)/gi,
  );
  if (explicitAnswer) {
    return explicitAnswer.replaceAll(',', '');
  }

  const matches = [...value.matchAll(/[-+]?\d[\d,]*(?:\.\d+)?/g)].filter((match) => {
    const suffixStart = (match.index ?? 0) + match[0].length;
    return !/^\s*%/.test(value.slice(suffixStart));
  });
  if (matches.length === 0) {
    return null;
  }

  return matches[matches.length - 1][0].replaceAll(',', '');
}

export function extractChoiceLetter(value: string): string | null {
  // Strip markdown bold/italic markers before all pattern matching
  const cleaned = value
    .replace(/\*{1,2}([^*]+)\*{1,2}/g, '$1')
    .replace(/_{1,2}([^_]+)_{1,2}/g, '$1');

  // \boxed{A}
  const boxedMatch = cleaned.match(/\\boxed\{\s*([A-Z])\s*\}/i);
  if (boxedMatch) {
    return boxedMatch[1].toUpperCase();
  }

  // "answer: A", "option A", "choice A"
  const answerMatch = cleaned.match(/\b(?:answer|option|choice)\s*[:\-]?\s*([A-Z])\b/i);
  if (answerMatch) {
    return answerMatch[1].toUpperCase();
  }

  // "The correct/best answer/option is A", "The answer is (A)"
  const correctAnswerMatch = cleaned.match(
    /\bthe\s+(?:(?:correct|best)\s+)?(?:answer|option)\s+is\s+\(?([A-Z])\)?(?!\w)/i,
  );
  if (correctAnswerMatch) {
    return correctAnswerMatch[1].toUpperCase();
  }

  // "(A) is correct", "Option A is correct"
  const isCorrectMatch = cleaned.match(
    /\b(?:option\s+)?(\(?[A-Z]\)?)\s+is\s+correct\b/i,
  );
  if (isCorrectMatch) {
    const letter = isCorrectMatch[1].replace(/[()]/g, '');
    return letter.toUpperCase();
  }

  // "choose A", "chose B", "pick C", "selected D"
  const selectedChoice = findLastCapturedGroup(
    cleaned,
    /\b(?:choose|chose|pick|picked|select|selected)\b(?:\s+option)?\s*\(?([A-Z])\)?\b/gi,
  );
  if (selectedChoice) {
    return selectedChoice.toUpperCase();
  }

  // "A. Some text" at start of response (MCQ format)
  const mcqFormatMatch = cleaned.trim().match(/^([A-Z])\.\s+\S/i);
  if (mcqFormatMatch) {
    return mcqFormatMatch[1].toUpperCase();
  }

  // Bare "A." or "(A)" at start of response
  const directChoiceMatch = cleaned.trim().match(/^\(?\s*([A-Z])\s*\)?[.)]?\s*$/i);
  if (directChoiceMatch) {
    return directChoiceMatch[1].toUpperCase();
  }

  // Bare letter on last line
  const lastLine = cleaned.trim().split('\n').pop()?.trim();
  if (lastLine && /^[A-Z]$/i.test(lastLine)) {
    return lastLine.toUpperCase();
  }

  return null;
}
