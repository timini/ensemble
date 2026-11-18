"use client";

import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { buttonVariants } from "@/components/atoms/Button";
import type { FeatureGridItem } from "@/components/molecules/FeatureGrid";

/** Width and gutters shared by the public pages. */
export const PUBLIC_CONTAINER = "mx-auto max-w-6xl px-gutter";

/** A list of `{ id, title, body }` items from the `common` namespace. */
export function useItems(key: string): FeatureGridItem[] {
  const { t } = useTranslation("common");
  const items = t(key, { returnObjects: true });
  return Array.isArray(items) ? (items as FeatureGridItem[]) : [];
}

/** A link styled as a button. */
export function ButtonLink({
  href,
  variant = "default",
  testId,
  children,
}: {
  href: string;
  variant?: "default" | "outline";
  testId?: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      data-testid={testId}
      className={buttonVariants({ size: "lg", variant })}
    >
      {children}
    </a>
  );
}
