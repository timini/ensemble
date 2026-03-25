"""Benchmark dataset loaders.

Mirrors the TypeScript loaders in packages/eval/src/lib/benchmarkDatasetLoaders.ts
to ensure identical question sets and ground truth extraction.
"""

from __future__ import annotations

import random
import re
from typing import Literal

import dspy
from datasets import load_dataset


DatasetName = Literal["gsm8k", "arc", "gpqa", "mmlu_pro", "truthfulqa", "hellaswag", "hallumix"]

DATASET_REGISTRY: dict[DatasetName, dict] = {
    "gsm8k": {
        "path": "openai/gsm8k",
        "name": "main",
        "split": "test",
    },
    "arc": {
        "path": "allenai/ai2_arc",
        "name": "ARC-Challenge",
        "split": "test",
    },
    "gpqa": {
        "path": "hendrydong/gpqa_diamond_mc",
        "name": "default",
        "split": "test",
    },
    "mmlu_pro": {
        "path": "TIGER-Lab/MMLU-Pro",
        "name": "default",
        "split": "test",
    },
    "truthfulqa": {
        "path": "truthfulqa/truthful_qa",
        "name": "multiple_choice",
        "split": "validation",
    },
    "hellaswag": {
        "path": "Rowan/hellaswag",
        "name": "default",
        "split": "validation",
    },
    "hallumix": {
        "path": "quotientai/HalluMix",
        "name": "default",
        "split": "train",
    },
}


def _to_choice_letter(index: int) -> str:
    """Convert 0-based index to uppercase letter (A, B, C, ...)."""
    return chr(ord("A") + index)


# ---------------------------------------------------------------------------
# GSM8K
# ---------------------------------------------------------------------------

def _extract_gsm8k_answer(answer_text: str) -> str:
    """Extract numeric answer from GSM8K '#### N' format."""
    match = re.search(r"####\s*([-+]?\d[\d,]*(?:\.\d+)?)", answer_text)
    if match:
        return match.group(1).replace(",", "")
    raise ValueError(f"Cannot extract GSM8K answer from: {answer_text!r}")


def _map_gsm8k_row(row: dict, idx: int) -> dspy.Example:
    answer = _extract_gsm8k_answer(row["answer"])
    return dspy.Example(
        question=row["question"].strip(),
        answer=answer,
        dataset="gsm8k",
        id=f"gsm8k-{idx}",
    ).with_inputs("question")


# ---------------------------------------------------------------------------
# ARC
# ---------------------------------------------------------------------------

def _map_arc_row(row: dict, idx: int) -> dspy.Example:
    labels = row["choices"]["label"]
    texts = row["choices"]["text"]
    label_to_letter = {label: _to_choice_letter(i) for i, label in enumerate(labels)}
    options = "\n".join(
        f"{_to_choice_letter(i)}. {texts[i]}" for i in range(len(labels))
    )
    normalised_key = label_to_letter.get(row["answerKey"], row["answerKey"])
    prompt = (
        f"{row['question'].strip()}\n\n"
        f"Options:\n{options}\n\n"
        f"Respond with the single best option letter."
    )
    return dspy.Example(
        question=prompt, answer=normalised_key, dataset="arc", id=f"arc-{idx}",
    ).with_inputs("question")


# ---------------------------------------------------------------------------
# GPQA (PhD-level science MCQ)
# ---------------------------------------------------------------------------

def _extract_choice_letter(text: str) -> str | None:
    """Extract choice letter from GPQA solution text."""
    cleaned = re.sub(r"\*{1,2}([^*]+)\*{1,2}", r"\1", text)
    cleaned = re.sub(r"_{1,2}([^_]+)_{1,2}", r"\1", cleaned)

    m = re.search(r"\\boxed\{\s*([A-Z])\s*\}", cleaned, re.IGNORECASE)
    if m:
        return m.group(1).upper()
    m = re.search(r"\b(?:answer|option|choice)\s*[:\-]?\s*([A-Z])\b", cleaned, re.IGNORECASE)
    if m:
        return m.group(1).upper()
    m = re.search(
        r"\bthe\s+(?:(?:correct|best)\s+)?(?:answer|option)\s+is\s+\(?([A-Z])\)?(?!\w)",
        cleaned, re.IGNORECASE,
    )
    if m:
        return m.group(1).upper()

    stripped = cleaned.strip()
    m = re.match(r"^\(?\s*([A-Z])\s*\)?[.)]?\s*$", stripped, re.IGNORECASE)
    if m:
        return m.group(1).upper()
    return None


def _map_gpqa_row(row: dict, idx: int) -> dspy.Example:
    ground_truth = _extract_choice_letter(row.get("solution", "") or "")
    if not ground_truth:
        return None  # will be filtered out
    return dspy.Example(
        question=row["problem"].strip(),
        answer=ground_truth,
        dataset="gpqa",
        id=f"gpqa-{idx}",
    ).with_inputs("question")


# ---------------------------------------------------------------------------
# MMLU-Pro (10-choice MCQ)
# ---------------------------------------------------------------------------

def _map_mmlu_pro_row(row: dict, idx: int) -> dspy.Example:
    opts = row.get("options", [])
    options = "\n".join(
        f"{_to_choice_letter(i)}. {choice}" for i, choice in enumerate(opts)
    )
    prompt = (
        f"{row['question'].strip()}\n\n"
        f"Options:\n{options}\n\n"
        f"Respond with the single best option letter."
    )
    return dspy.Example(
        question=prompt,
        answer=row["answer"].strip().upper(),
        dataset="mmlu_pro",
        id=f"mmlu_pro-{idx}",
    ).with_inputs("question")


# ---------------------------------------------------------------------------
# TruthfulQA (MCQ)
# ---------------------------------------------------------------------------

def _map_truthfulqa_row(row: dict, idx: int) -> dspy.Example:
    targets = row.get("mc1_targets", {})
    choices = targets.get("choices", [])
    labels = targets.get("labels", [])
    try:
        correct_idx = labels.index(1)
    except ValueError:
        return None
    if not choices or correct_idx >= len(choices):
        return None

    options = "\n".join(
        f"{_to_choice_letter(i)}. {choice}" for i, choice in enumerate(choices)
    )
    prompt = (
        f"{row['question'].strip()}\n\n"
        f"Options:\n{options}\n\n"
        f"Respond with the single best option letter."
    )
    return dspy.Example(
        question=prompt,
        answer=_to_choice_letter(correct_idx),
        dataset="truthfulqa",
        id=f"truthfulqa-{idx}",
    ).with_inputs("question")


# ---------------------------------------------------------------------------
# HellaSwag (commonsense completion MCQ)
# ---------------------------------------------------------------------------

def _map_hellaswag_row(row: dict, idx: int) -> dspy.Example:
    endings = row.get("endings", [])
    correct_idx = int(row.get("label", -1))
    if correct_idx < 0 or correct_idx >= len(endings):
        return None

    options = "\n".join(
        f"{_to_choice_letter(i)}. {ending}" for i, ending in enumerate(endings)
    )
    prompt = (
        f"Complete the following:\n\n"
        f"{row['ctx'].strip()}\n\n"
        f"Options:\n{options}\n\n"
        f"Respond with the single best option letter."
    )
    return dspy.Example(
        question=prompt,
        answer=_to_choice_letter(correct_idx),
        dataset="hellaswag",
        id=f"hellaswag-{idx}",
    ).with_inputs("question")


# ---------------------------------------------------------------------------
# HalluMix (hallucination detection — yes/no)
# ---------------------------------------------------------------------------

def _map_hallumix_row(row: dict, idx: int) -> dspy.Example:
    docs = row.get("documents", [])
    docs_text = "\n\n".join(
        f"[Document {i + 1}]\n{doc}" for i, doc in enumerate(docs)
    )
    is_hallucinated = row.get("hallucination_label", 0) == 1

    prompt = (
        f"Given the following documents and a proposed answer, determine if "
        f"the answer is supported by the documents or is a hallucination.\n\n"
        f"Documents:\n{docs_text}\n\n"
        f"Proposed answer: {row['answer']}\n\n"
        f"Is this answer a hallucination? Respond with only \"yes\" or \"no\"."
    )

    return dspy.Example(
        question=prompt,
        answer="yes" if is_hallucinated else "no",
        dataset="hallumix",
        id=f"hallumix-{idx}",
    ).with_inputs("question")


# ---------------------------------------------------------------------------
# Registry
# ---------------------------------------------------------------------------

_ROW_MAPPERS = {
    "gsm8k": _map_gsm8k_row,
    "arc": _map_arc_row,
    "gpqa": _map_gpqa_row,
    "mmlu_pro": _map_mmlu_pro_row,
    "truthfulqa": _map_truthfulqa_row,
    "hellaswag": _map_hellaswag_row,
    "hallumix": _map_hallumix_row,
}

# Which metric to use per dataset
DATASET_METRIC_TYPE: dict[DatasetName, str] = {
    "gsm8k": "numeric",
    "arc": "mcq",
    "gpqa": "mcq",
    "mmlu_pro": "mcq",
    "truthfulqa": "mcq",
    "hellaswag": "mcq",
    "hallumix": "yesno",
}


def load_benchmark(
    name: DatasetName,
    sample: int | None = None,
    seed: int = 42,
) -> list[dspy.Example]:
    """Load a benchmark dataset and return DSPy Examples.

    Args:
        name: Dataset identifier.
        sample: Number of questions to sample. None = all.
        seed: Random seed for reproducible sampling.

    Returns:
        List of dspy.Example with 'question' as input and 'answer' as label.
    """
    cfg = DATASET_REGISTRY[name]
    ds = load_dataset(cfg["path"], cfg["name"], split=cfg["split"])

    mapper = _ROW_MAPPERS[name]
    examples = [mapper(row, idx) for idx, row in enumerate(ds)]
    # Filter out None entries (failed parsing)
    examples = [e for e in examples if e is not None]

    if sample is not None and sample < len(examples):
        rng = random.Random(seed)
        examples = rng.sample(examples, sample)

    return examples
