"use client";

import { Button } from "@/components/atoms/Button";

export function TestComponentsGallery() {
  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-8 text-3xl font-bold">Component Library Test Page</h1>

      <section className="mb-12">
        <h2 className="mb-6 text-2xl font-semibold">Button Component</h2>

        <div className="space-y-8 rounded-lg bg-card p-8 shadow">
          <div>
            <h3 className="mb-4 text-lg font-medium">Variants</h3>
            <div className="flex flex-wrap gap-4">
              <Button variant="default">Default</Button>
              <Button variant="destructive">Destructive</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="link">Link</Button>
            </div>
          </div>

          <div>
            <h3 className="mb-4 text-lg font-medium">Sizes</h3>
            <div className="flex flex-wrap items-center gap-4">
              <Button size="sm">Small</Button>
              <Button size="default">Default</Button>
              <Button size="lg">Large</Button>
              <Button size="icon">🎨</Button>
            </div>
          </div>

          <div>
            <h3 className="mb-4 text-lg font-medium">States</h3>
            <div className="flex flex-wrap gap-4">
              <Button>Normal</Button>
              <Button disabled>Disabled</Button>
            </div>
          </div>

          <div>
            <h3 className="mb-4 text-lg font-medium">
              All Variants Grid (for screenshot comparison)
            </h3>
            <div className="flex flex-col gap-4">
              <div className="flex gap-4">
                <Button variant="default">Default</Button>
                <Button variant="destructive">Destructive</Button>
                <Button variant="outline">Outline</Button>
              </div>
              <div className="flex gap-4">
                <Button variant="secondary">Secondary</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="link">Link</Button>
              </div>
              <div className="flex items-center gap-4">
                <Button size="sm">Small</Button>
                <Button size="default">Default</Button>
                <Button size="lg">Large</Button>
                <Button size="icon">🎨</Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
