import { notFound } from "next/navigation";
import { TestComponentsGallery } from "./TestComponentsGallery";
import { isTestComponentsPageEnabled } from "./isTestComponentsPageEnabled";

export default function TestComponentsPage() {
  if (
    !isTestComponentsPageEnabled({
      NODE_ENV: process.env.NODE_ENV,
      NEXT_PUBLIC_MOCK_MODE: process.env.NEXT_PUBLIC_MOCK_MODE,
    })
  ) {
    notFound();
  }

  return <TestComponentsGallery />;
}
