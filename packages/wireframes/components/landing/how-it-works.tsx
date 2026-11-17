const steps = [
  { title: "Ask once", body: "Pick two to six models, from cloud providers or your own machine, and write one question." },
  { title: "Compare side by side", body: "Every answer streams in next to the others, with its time and cost." },
  { title: "Read the agreement", body: "A score from semantic embeddings shows how closely the answers match, and one merged answer sits on top." },
]

/** Three numbered steps. */
export function HowItWorks() {
  return (
    <section id="how" className="mx-auto max-w-6xl px-gutter py-section">
      <h2 className="font-display text-title font-normal">How it works</h2>
      <ol className="mt-8 grid gap-6 md:grid-cols-3">
        {steps.map((step, i) => (
          <li key={step.title} className="border-t border-border pt-5">
            <span className="font-mono text-caption text-primary">0{i + 1}</span>
            <h3 className="mt-2 text-heading">{step.title}</h3>
            <p className="mt-2 text-label text-muted-foreground">{step.body}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}
