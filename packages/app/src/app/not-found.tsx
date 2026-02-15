import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Heading } from "@/components/atoms/Heading";
import { Text } from "@/components/atoms/Text";
import { Button } from "@/components/atoms/Button";

export default function NotFound() {
  return (
    <div
      className="container mx-auto flex max-w-4xl flex-col items-center px-4 py-24 text-center"
      data-testid="not-found-page"
    >
      <Heading level={1} size="3xl" className="mb-4">
        Page Not Found
      </Heading>
      <Text color="muted" className="mb-8 max-w-md">
        The page you are looking for does not exist or has been moved. Head back
        to the start to configure your AI ensemble.
      </Text>
      <div className="flex flex-col gap-4 sm:flex-row">
        <Button asChild size="lg">
          <Link href="/config">
            Get Started
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link href="/features">Explore Features</Link>
        </Button>
      </div>
    </div>
  );
}
