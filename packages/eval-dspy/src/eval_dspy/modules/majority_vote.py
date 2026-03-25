"""Majority voting ensemble module.

Implements the self-consistency approach from Wang et al. (2022):
generate N chain-of-thought responses, extract the answer from each,
and pick the most common answer. No LLM synthesis step.

This is the strategy shown to work in the literature.
"""

from __future__ import annotations

from collections import Counter

import dspy


class MajorityVoteEnsemble(dspy.Module):
    """Generate N responses and pick the most common answer by majority vote."""

    def __init__(self, n: int = 5):
        super().__init__()
        self.n = n
        self.generate = dspy.ChainOfThought("question -> answer")

    def forward(self, question: str) -> dspy.Prediction:
        # Generate N candidate answers
        answers = []
        for _ in range(self.n):
            result = self.generate(question=question)
            answers.append(result.answer.strip())

        # Majority vote — pick the most common answer
        # Normalise: lowercase, strip whitespace/punctuation for comparison
        normalised = [a.lower().strip().rstrip(".") for a in answers]
        counter = Counter(normalised)
        winner_normalised = counter.most_common(1)[0][0]

        # Return the original (non-normalised) version of the winning answer
        for ans, norm in zip(answers, normalised):
            if norm == winner_normalised:
                return dspy.Prediction(answer=ans)

        return dspy.Prediction(answer=answers[0])
