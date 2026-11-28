"""Evaluation metrics matching the TypeScript eval's evaluators.

These replicate the logic from packages/eval/src/lib/parsers.ts and
packages/eval/src/lib/evaluators.ts.
"""

from __future__ import annotations

import re


def extract_numeric_answer(text: str) -> str | None:
    """Extract a numeric answer from model output.

    Mirrors extractNumericAnswer() from packages/eval/src/lib/parsers.ts.
    Priority: #### marker > explicit 'answer is' > last number in text.
    """
    # #### N marker (GSM8K ground truth format)
    m = re.search(r"####\s*([-+]?\d[\d,]*(?:\.\d+)?)", text)
    if m:
        return m.group(1).replace(",", "")

    # Explicit "answer/result is N"
    matches = list(
        re.finditer(
            r"\b(?:final answer|answer|result)\b(?:\s+is|\s*[:=-])?\s*([-+]?\d[\d,]*(?:\.\d+)?)(?!\s*%)",
            text,
            re.IGNORECASE,
        )
    )
    if matches:
        return matches[-1].group(1).replace(",", "")

    # Last bare number (excluding percentages)
    all_nums = list(re.finditer(r"[-+]?\d[\d,]*(?:\.\d+)?", text))
    for m in reversed(all_nums):
        suffix_start = m.end()
        if not re.match(r"\s*%", text[suffix_start:]):
            return m.group(0).replace(",", "")

    return None


def extract_choice_letter(text: str) -> str | None:
    """Extract a multiple-choice letter (A-J) from model output.

    Mirrors extractChoiceLetter() from packages/eval/src/lib/parsers.ts.
    """
    # Strip markdown bold/italic
    cleaned = re.sub(r"\*{1,2}([^*]+)\*{1,2}", r"\1", text)
    cleaned = re.sub(r"_{1,2}([^_]+)_{1,2}", r"\1", cleaned)

    # \\boxed{A}
    m = re.search(r"\\boxed\{\s*([A-Z])\s*\}", cleaned, re.IGNORECASE)
    if m:
        return m.group(1).upper()

    # "answer: A", "option A", "choice A"
    m = re.search(r"\b(?:answer|option|choice)\s*[:\-]?\s*([A-Z])\b", cleaned, re.IGNORECASE)
    if m:
        return m.group(1).upper()

    # "The correct/best answer is A"
    m = re.search(
        r"\bthe\s+(?:(?:correct|best)\s+)?(?:answer|option)\s+is\s+\(?([A-Z])\)?(?!\w)",
        cleaned,
        re.IGNORECASE,
    )
    if m:
        return m.group(1).upper()

    # "(A) is correct"
    m = re.search(
        r"\b(?:option\s+)?(\(?[A-Z]\)?)\s+is\s+correct\b", cleaned, re.IGNORECASE
    )
    if m:
        return m.group(1).replace("(", "").replace(")", "").upper()

    # "A. Some text" at start
    stripped = cleaned.strip()
    m = re.match(r"^([A-Z])\.\s+\S", stripped, re.IGNORECASE)
    if m:
        return m.group(1).upper()

    # Bare "(A)" or "A" at start
    m = re.match(r"^\(?\s*([A-Z])\s*\)?[.)]?\s*$", stripped, re.IGNORECASE)
    if m:
        return m.group(1).upper()

    # Bare letter on last line
    last_line = stripped.split("\n")[-1].strip()
    if re.match(r"^[A-Z]$", last_line, re.IGNORECASE):
        return last_line.upper()

    return None


def numeric_match(example, prediction, trace=None) -> bool:
    """DSPy metric: does the predicted answer match the numeric ground truth?"""
    predicted = extract_numeric_answer(prediction.answer or "")
    expected = example.answer
    if predicted is None:
        return False
    try:
        return abs(float(predicted) - float(expected)) < 1e-6
    except ValueError:
        return predicted == expected


def mcq_match(example, prediction, trace=None) -> bool:
    """DSPy metric: does the predicted choice letter match the ground truth?"""
    predicted = extract_choice_letter(prediction.answer or "")
    expected = example.answer.strip().upper()
    if predicted is None:
        return False
    return predicted == expected


def yesno_match(example, prediction, trace=None) -> bool:
    """DSPy metric: does the predicted yes/no match the ground truth?"""
    text = (prediction.answer or "").strip().lower()
    # Extract first yes or no from the response
    if "yes" in text and "no" not in text.split("yes")[0]:
        predicted = "yes"
    elif "no" in text and "yes" not in text.split("no")[0]:
        predicted = "no"
    else:
        # Ambiguous — check which appears first
        yes_pos = text.find("yes")
        no_pos = text.find("no")
        if yes_pos == -1 and no_pos == -1:
            return False
        if yes_pos == -1:
            predicted = "no"
        elif no_pos == -1:
            predicted = "yes"
        else:
            predicted = "yes" if yes_pos < no_pos else "no"
    return predicted == example.answer.strip().lower()
