'use client';

import { Button } from '@/components/atoms/Button';

export default function TestComponentsPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <h1 className="text-3xl font-bold mb-8">Component Library Test Page</h1>

      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-6">Button Component</h2>

        <div className="space-y-8 bg-card p-8 rounded-lg shadow">
          <div>
            <h3 className="text-lg font-medium mb-4">Variants</h3>
            <div className="flex gap-4 flex-wrap">
              <Button variant="default">Default</Button>
              <Button variant="destructive">Destructive</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="link">Link</Button>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Sizes</h3>
            <div className="flex gap-4 items-center flex-wrap">
              <Button size="sm">Small</Button>
              <Button size="default">Default</Button>
              <Button size="lg">Large</Button>
              <Button size="icon">🎨</Button>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">States</h3>
            <div className="flex gap-4 flex-wrap">
              <Button>Normal</Button>
              <Button disabled>Disabled</Button>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">All Variants Grid (for screenshot comparison)</h3>
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
              <div className="flex gap-4 items-center">
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
