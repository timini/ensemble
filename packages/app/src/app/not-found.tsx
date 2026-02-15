"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Heading } from "@/components/atoms/Heading";
import { Text } from "@/components/atoms/Text";
import { Button } from "@/components/atoms/Button";

export default function NotFound() {
  const { t } = useTranslation("common");

  return (
    <div
      className="container mx-auto flex max-w-4xl flex-col items-center px-4 py-24 text-center"
      data-testid="not-found-page"
    >
      <Heading level={1} size="3xl" className="mb-4">
        {t("pages.notFound.title")}
      </Heading>
      <Text color="muted" className="mb-8 max-w-md">
        {t("pages.notFound.description")}
      </Text>
      <div className="flex flex-col gap-4 sm:flex-row">
        <Button asChild size="lg">
          <Link href="/config">
            {t("app.getStarted")}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link href="/features">{t("pages.notFound.exploreFeatures")}</Link>
        </Button>
      </div>
    </div>
  );
}
