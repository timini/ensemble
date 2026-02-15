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
  const boxedMatch = value.match(/\\boxed\{\s*([A-Z])\s*\}/i);
  if (boxedMatch) {
    return boxedMatch[1].toUpperCase();
  }

  const answerMatch = value.match(/\b(?:answer|option|choice)\s*[:\-]?\s*([A-Z])\b/i);
  if (answerMatch) {
    return answerMatch[1].toUpperCase();
  }

  const selectedChoice = findLastCapturedGroup(
    value,
    /\b(?:choose|chose|pick|picked|select|selected)\b(?:\s+option)?\s*\(?([A-Z])\)?\b/gi,
  );
  if (selectedChoice) {
    return selectedChoice.toUpperCase();
  }

  const directChoiceMatch = value.trim().match(/^\(?\s*([A-Z])\s*\)?[.)]?\s*$/i);
  if (directChoiceMatch) {
    return directChoiceMatch[1].toUpperCase();
  }

  return null;
}
