"""Configuration for DSPy ensemble evaluation."""

import os

import dspy

# Default model for all calls (cheap enough for ensemble experiments)
DEFAULT_MODEL = "gemini/gemini-3.1-flash-lite-preview"

# Ensemble defaults
DEFAULT_ENSEMBLE_SIZE = 5
DEFAULT_TEMPERATURE = 0.7
DEFAULT_SAMPLE_SIZE = 30
DEFAULT_SEED = 42


def configure_lm(
    model: str = DEFAULT_MODEL,
    temperature: float = DEFAULT_TEMPERATURE,
) -> dspy.LM:
    """Configure and return a DSPy language model.

    Reads GOOGLE_API_KEY from environment (or falls back to TEST_GOOGLE_API_KEY
    for compatibility with the monorepo's .env.local convention).
    """
    api_key = os.environ.get("GOOGLE_API_KEY") or os.environ.get(
        "TEST_GOOGLE_API_KEY"
    )
    if not api_key:
        raise EnvironmentError(
            "Set GOOGLE_API_KEY or TEST_GOOGLE_API_KEY in your environment."
        )

    lm = dspy.LM(model, api_key=api_key, temperature=temperature)
    dspy.configure(lm=lm)
    return lm
