"""Self-consistent ensemble module.

Mirrors the existing TypeScript eval: call the same model N times at
temperature > 0, then synthesise responses into a final answer.

This is the *unoptimised* version — DSPy optimizers can be applied to it
to discover better synthesis prompts and few-shot examples.
"""

from __future__ import annotations

import dspy


class SelfConsistentEnsemble(dspy.Module):
    """Generate N diverse responses and synthesise into one final answer."""

    def __init__(self, n: int = 5):
        super().__init__()
        self.n = n
        self.generate = dspy.ChainOfThought("question -> answer")
        self.synthesize = dspy.ChainOfThought(
            "question, responses -> answer"
        )

    def forward(self, question: str) -> dspy.Prediction:
        # Generate N candidate responses
        candidates = []
        for _ in range(self.n):
            result = self.generate(question=question)
            candidates.append(result.answer)

        # Format candidates for the synthesiser
        responses_text = "\n---\n".join(
            f"Response {i + 1}: {ans}" for i, ans in enumerate(candidates)
        )

        return self.synthesize(
            question=question,
            responses=responses_text,
        )
