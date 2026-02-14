const NON_TEXT_MODALITY_PATTERN =
  /(?:^|[-_])(audio|video|vision|image|imagine|embedding|tts|speech|dall-e|whisper)(?:$|[-_])/i;

/**
 * Returns true when a model identifier indicates a non-text modality.
 */
export function hasNonTextModality(modelId: string): boolean {
  return NON_TEXT_MODALITY_PATTERN.test(modelId);
}

