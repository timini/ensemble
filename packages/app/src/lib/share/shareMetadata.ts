import type { SharedRun } from "./sharedRun";

/** Text cut to `max` characters on a word boundary, with an ellipsis. */
export function truncate(text: string, max: number): string {
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > max / 2 ? cut.slice(0, space) : cut).trimEnd()}…`;
}

/** Agreement level words for metadata, which is rendered in English. */
const LEVEL = { high: "High", medium: "Medium", low: "Low" } as const;

/** Agreement level of a shared run's score, with the uncalibrated cut-offs by default. */
export function sharedLevel(run: SharedRun): keyof typeof LEVEL | null {
  if (!run.agreement) return null;
  const { score, thresholds = { high: 0.8, medium: 0.5 } } = run.agreement;
  if (score > thresholds.high) return "high";
  if (score >= thresholds.medium) return "medium";
  return "low";
}

/** Title and description of a shared run's page and preview. */
export function sharedRunSummary(run: SharedRun): {
  title: string;
  description: string;
} {
  const level = sharedLevel(run);
  const answers = `${run.answers.length} AI answers compared`;
  return {
    title: truncate(run.prompt, 70),
    description: level
      ? `${answers}. ${LEVEL[level]} agreement (${Math.round(run.agreement!.score * 100)}%). Read every answer and the consensus.`
      : `${answers}. Read every answer and the consensus.`,
  };
}
