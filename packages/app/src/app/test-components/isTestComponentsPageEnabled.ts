/**
 * The component gallery is a development aid. It is hidden in production
 * builds unless NEXT_PUBLIC_MOCK_MODE is "true".
 */
export function isTestComponentsPageEnabled(env: {
  NODE_ENV?: string;
  NEXT_PUBLIC_MOCK_MODE?: string;
}): boolean {
  if (env.NODE_ENV !== "production") return true;
  return env.NEXT_PUBLIC_MOCK_MODE === "true";
}
