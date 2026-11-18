import type { ModelPickerOption } from "@/components/molecules/ModelPicker";

/** Most models in the ensemble picked for a first run. */
export const STARTER_SIZE = 3;

/**
 * Models a first run starts with, best first. Fast, low-cost models from
 * each provider come before the flagships, so a first question costs
 * little. The OpenRouter names are the models of the recorded example run
 * on the landing page. Endpoint models match on their name on the server.
 */
const PREFERRED = [
  "gpt-6-luna",
  "claude-haiku-5-5",
  "gemini-3.5-flash-lite",
  "deepseek-flash",
  "grok-4.3",
  "gpt-6-astra",
  "claude-sonnet-5-5",
  "gemini-4-hydrogen",
  "grok-4.7",
  "meta-llama/llama-3.3-70b-instruct",
  "mistralai/mistral-small-3.2-24b-instruct",
  "google/gemini-2.5-flash-lite",
];

/** A list this long is a catalogue (OpenRouter, Together): never guess in it. */
const CATALOGUE_SIZE = 12;

/** Embedding models a local server lists beside its chat models. */
const EMBEDDING = /embed/i;

const rank = (o: ModelPickerOption) => {
  const index = PREFERRED.indexOf(o.name);
  return index === -1 ? PREFERRED.indexOf(o.id) : index;
};

/**
 * The ensemble a first run starts with, as model ids: one preferred model
 * from each provider or endpoint, then more preferred models, up to three.
 * When fewer than two preferred models are offered, the first models of a
 * short list (a local server) fill in, leaving out embedding models. Large
 * catalogues are only used for models on the preferred list. Empty while
 * nothing is offered.
 */
export function pickStarterModels(
  options: readonly ModelPickerOption[],
  size = STARTER_SIZE,
): string[] {
  const preferred = options
    .filter((o) => rank(o) !== -1)
    .sort((a, b) => rank(a) - rank(b));
  const picked: ModelPickerOption[] = [];
  const take = (o: ModelPickerOption) => {
    if (picked.length < size && !picked.includes(o)) picked.push(o);
  };

  for (const o of preferred) {
    if (!picked.some((p) => p.group === o.group)) take(o);
  }
  preferred.forEach(take);

  if (picked.length < 2) {
    const sizes = new Map<string, number>();
    for (const o of options) sizes.set(o.group, (sizes.get(o.group) ?? 0) + 1);
    options
      .filter((o) => (sizes.get(o.group) ?? 0) <= CATALOGUE_SIZE)
      .filter((o) => !EMBEDDING.test(o.name))
      .forEach(take);
  }
  return picked.map((o) => o.id);
}
