export function extractNumericAnswer(value: string): string | null {
  const markerMatch = value.match(/####\s*([-+]?\d[\d,]*(?:\.\d+)?)/);
  if (markerMatch) {
    return markerMatch[1].replaceAll(',', '');
  }

  const matches = [...value.matchAll(/[-+]?\d[\d,]*(?:\.\d+)?/g)];
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

  const standalone = [...value.toUpperCase().matchAll(/\b([A-Z])\b/g)];
  if (standalone.length > 0) {
    return standalone[standalone.length - 1][1];
  }

  return null;
}
