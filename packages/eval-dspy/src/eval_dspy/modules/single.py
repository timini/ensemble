"""Single model baseline module.

A simple DSPy program that answers a question with one LLM call.
This establishes the baseline that ensemble modules must beat.
"""

import dspy


class SingleModelQA(dspy.Module):
    """Answer a question with a single chain-of-thought call."""

    def __init__(self):
        super().__init__()
        self.generate = dspy.ChainOfThought("question -> answer")

    def forward(self, question: str) -> dspy.Prediction:
        return self.generate(question=question)
