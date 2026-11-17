"use client"

import { useRef, useState } from "react"
import { AnswerCard } from "@/components/workspace/answer-card"
import { answers } from "@/lib/sample-run"
import { cn } from "@/lib/utils"

/**
 * Individual answers. Swipeable tabs below 768 px (scroll snap, one answer per
 * screen), columns from 768 px up.
 */
export function Answers({ running = false }: { running?: boolean }) {
  const [active, setActive] = useState(0)
  const track = useRef<HTMLDivElement>(null)

  const show = (i: number) => {
    setActive(i)
    const el = track.current
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" })
  }

  const onScroll = () => {
    const el = track.current
    if (el && el.clientWidth) setActive(Math.round(el.scrollLeft / el.clientWidth))
  }

  return (
    <section aria-labelledby="answers-h" className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="answers-h" className="text-caption font-medium uppercase tracking-wider text-muted-foreground">Individual answers</h2>
        <p className="text-caption text-muted-foreground md:hidden">Swipe to compare</p>
      </div>

      <div role="tablist" aria-label="Answers" className="flex gap-1 rounded-xl bg-muted p-1 md:hidden">
        {answers.map((a, i) => (
          <button
            key={a.model.id}
            role="tab"
            type="button"
            aria-selected={active === i}
            aria-controls={`answer-${a.model.id}`}
            onClick={() => show(i)}
            className={cn(
              "focus-ring flex-1 truncate rounded-lg px-2 py-1.5 text-caption font-medium transition-colors duration-fast",
              active === i ? "bg-card text-foreground shadow-sm" : "text-muted-foreground",
            )}
          >
            {a.model.name.split(" ")[0]}
          </button>
        ))}
      </div>

      <div
        ref={track}
        onScroll={onScroll}
        className="scrollbar-none -mx-gutter flex snap-x snap-mandatory overflow-x-auto md:mx-0 md:grid md:snap-none md:grid-cols-[repeat(auto-fit,minmax(300px,1fr))] md:gap-4 md:overflow-visible"
      >
        {answers.map((a, i) => (
          <div key={a.model.id} className="w-full shrink-0 snap-center px-gutter md:px-0">
            <AnswerCard id={`answer-${a.model.id}`} answer={a} streaming={running && i !== 2} />
          </div>
        ))}
      </div>
    </section>
  )
}
