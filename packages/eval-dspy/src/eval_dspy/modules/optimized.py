"""Optimised consensus module.

Same ensemble structure as SelfConsistentEnsemble, but with an additional
confidence-scoring step that helps the synthesiser weight candidates.

Designed to be compiled with DSPy optimisers (BootstrapFewShot, MIPRO)
which will discover effective instructions and few-shot examples for each
sub-module.
"""

from __future__ import annotations

import dspy


class OptimizedConsensus(dspy.Module):
    """Generate N responses, score confidence, synthesise with weighting."""

    def __init__(self, n: int = 5):
        super().__init__()
        self.n = n
        # ChainOfThought adds reasoning automatically, so only declare answer
        self.generate = dspy.ChainOfThought("question -> answer")
        self.score = dspy.ChainOfThought(
            "question, candidate_answer, candidate_rationale -> confidence"
        )
        self.synthesize = dspy.ChainOfThought(
            "question, candidates -> answer"
        )

    def forward(self, question: str) -> dspy.Prediction:
        # Generate N candidate responses with reasoning
        entries = []
        for _ in range(self.n):
            result = self.generate(question=question)
            conf = self.score(
                question=question,
                candidate_answer=result.answer,
                candidate_rationale=result.reasoning,
            )
            entries.append(
                f"Answer: {result.answer}\n"
                f"Rationale: {result.reasoning}\n"
                f"Confidence: {conf.confidence}"
            )

        candidates_text = "\n---\n".join(entries)

        return self.synthesize(
            question=question,
            candidates=candidates_text,
        )
