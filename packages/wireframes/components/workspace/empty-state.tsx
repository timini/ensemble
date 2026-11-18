const examples = [
  "Is it safe to leave cooked rice out overnight?",
  "What does a break clause in a UK tenancy usually allow?",
  "Is a heat pump cheaper to run than a gas boiler in 2027?",
]

/** Heading shown above the composer before the first run. */
export function EmptyIntro() {
  return (
    <div className="space-y-2 pb-2 pt-6 text-center md:pt-12">
      <h1 className="font-display text-title font-normal">What do you want to check?</h1>
      <p className="text-label text-muted-foreground">
        Every model you pick answers. You see each answer and how much they agree.
      </p>
    </div>
  )
}

/** Example questions under the composer before the first run. */
export function ExampleQuestions() {
  return (
    <div className="space-y-2">
      <p className="text-caption font-medium uppercase tracking-wider text-muted-foreground">Try one</p>
      <ul className="flex flex-col gap-2">
        {examples.map((e) => (
          <li key={e}>
            <button type="button" className="focus-ring w-full rounded-xl border border-border bg-card px-4 py-3 text-left text-label hover:bg-muted">
              {e}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
