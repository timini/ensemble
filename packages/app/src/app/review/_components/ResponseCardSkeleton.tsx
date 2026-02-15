/**
 * ResponseCardSkeleton — Placeholder shown for models that haven't started streaming yet.
 * Matches the visual structure of ResponseCard with pulse animations.
 */

import { Card, CardHeader, CardContent } from "@/components/atoms/Card";

interface ResponseCardSkeletonProps {
  modelName: string;
  provider: string;
  testId?: string;
}

const PROVIDER_NAMES: Record<string, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  google: "Google",
  xai: "XAI",
};

export function ResponseCardSkeleton({
  modelName,
  provider,
  testId,
}: ResponseCardSkeletonProps) {
  return (
    <Card
      className="w-full"
      data-testid={testId}
      role="article"
      aria-busy="true"
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="rounded-full border px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
              {PROVIDER_NAMES[provider] ?? provider}
            </span>
            <span className="text-base font-semibold text-muted-foreground">
              {modelName}
            </span>
          </div>
          <div className="h-5 w-16 animate-pulse rounded bg-muted" />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="animate-pulse space-y-2">
          <div className="h-4 w-3/4 rounded bg-muted" />
          <div className="h-4 w-full rounded bg-muted" />
          <div className="h-4 w-5/6 rounded bg-muted" />
        </div>
      </CardContent>
    </Card>
  );
}
