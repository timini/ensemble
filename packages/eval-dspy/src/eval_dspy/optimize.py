"""DSPy optimizer wrappers for ensemble consensus tuning."""

from __future__ import annotations

from typing import Callable

import dspy


def bootstrap_optimize(
    module: dspy.Module,
    trainset: list[dspy.Example],
    metric: Callable,
    max_bootstrapped_demos: int = 4,
    max_labeled_demos: int = 4,
) -> dspy.Module:
    """Apply BootstrapFewShot to find effective few-shot examples.

    This is the fast, cheap first pass. Good for discovering concrete
    examples of successful consensus that teach the model what 'good
    synthesis' looks like.
    """
    optimizer = dspy.BootstrapFewShot(
        metric=metric,
        max_bootstrapped_demos=max_bootstrapped_demos,
        max_labeled_demos=max_labeled_demos,
    )
    return optimizer.compile(module, trainset=trainset)


def mipro_optimize(
    module: dspy.Module,
    trainset: list[dspy.Example],
    metric: Callable,
    auto: str = "medium",
) -> dspy.Module:
    """Apply MIPROv2 for full pipeline optimisation.

    Jointly optimises instructions and few-shot demonstrations across
    all sub-modules. More expensive but discovers better prompts.

    auto: 'light', 'medium', or 'heavy' — controls how many trials to run.
    """
    optimizer = dspy.MIPROv2(
        metric=metric,
        auto=auto,
    )
    return optimizer.compile(
        module,
        trainset=trainset,
    )
