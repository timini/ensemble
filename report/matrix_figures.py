"""
Figures and a LaTeX table from a benchmark matrix run.

Reads the results format written by `npm run bench:matrix --workspace=packages/eval`
(packages/eval/results/<run-id>/summary.json, described in
packages/eval/docs/BENCHMARKS.md) and writes into the figures directory:

  matrix_accuracy.pdf/.png       accuracy per dataset per configuration, 95% Wilson intervals
  matrix_cost_accuracy.pdf/.png  mean accuracy against total cost per configuration
  matrix_table.tex               the numbers, with McNemar p-values against the best single model

A summary from a mock dry run (mode "mock") is refused unless allow_mock is
set (`--allow-mock` on generate_figures.py). With it, the table and figures
are marked MOCK DATA so they cannot pass for real results.

Needs only matplotlib.
"""

import json
from pathlib import Path

KIND_ORDER = {"single": 0, "ensemble": 1, "reference": 2}
DATASET_LABELS = {"gsm8k": "GSM8K", "mmlu_pro": "MMLU-Pro", "gpqa": "GPQA", "truthfulqa": "TruthfulQA"}
KIND_COLOURS = {"single": "#7f8c8d", "ensemble": "#2e86de", "reference": "#c0392b"}
MOCK_LABEL = "MOCK DATA: not real results"


def is_mock(summary):
    return summary.get("mode") == "mock"


def load_summary(run_dir):
    """Load summary.json from a run directory (or a path to the file itself)."""
    path = Path(run_dir)
    if path.is_dir():
        path = path / "summary.json"
    with open(path) as fh:
        summary = json.load(fh)
    if summary.get("schemaVersion") != 1:
        raise ValueError(f"{path}: unsupported schemaVersion {summary.get('schemaVersion')!r}")
    return summary


def configurations(summary):
    """Configuration ids and labels in display order (singles, ensembles, reference)."""
    seen = {}
    for dataset in summary.get("datasets", []):
        for row in dataset["rows"]:
            seen.setdefault(row["id"], row)
    rows = sorted(seen.values(), key=lambda r: KIND_ORDER.get(r["kind"], 9))
    return [(r["id"], r["label"], r["kind"]) for r in rows]


def format_p(value):
    if value is None:
        return "best"
    return "<0.001" if value < 0.001 else f"{value:.3f}"


def latex_escape(text):
    return str(text).replace("&", r"\&").replace("%", r"\%").replace("_", r"\_")


def matrix_table(summary):
    """A booktabs table: one block per dataset, one line per configuration."""
    lines = [
        r"\begin{tabular}{llrrrr}",
        r"\toprule",
        *([rf"\multicolumn{{6}}{{l}}{{\textbf{{{MOCK_LABEL}}}}} \\", r"\midrule"] if is_mock(summary) else []),
        r"Dataset & Configuration & n & Accuracy (95\% CI) & $p$ vs best single & Cost (USD) \\",
        r"\midrule",
    ]
    for dataset in summary.get("datasets", []):
        name = DATASET_LABELS.get(dataset["dataset"], dataset["dataset"])
        for row in sorted(dataset["rows"], key=lambda r: KIND_ORDER.get(r["kind"], 9)):
            test = row.get("vsBestSingle")
            cost = f"{row['costUsd']:.2f}" + ("+" if row.get("costIncomplete") else "")
            acc = f"{row['accuracy'] * 100:.1f} [{row['ciLower'] * 100:.1f}, {row['ciUpper'] * 100:.1f}]"
            lines.append(
                f"{latex_escape(name)} & {latex_escape(row['label'])} & {row['n']} & {acc} & "
                f"{format_p(test['pValue'] if test else None)} & {cost} \\\\"
            )
        lines.append(r"\midrule")
    if lines[-1] == r"\midrule":
        lines[-1] = r"\bottomrule"
    else:
        lines.append(r"\bottomrule")
    lines.append(r"\end{tabular}")
    return "\n".join(lines) + "\n"


def _save(fig, figures_dir, stem, summary):
    if is_mock(summary):
        fig.text(0.5, 0.5, MOCK_LABEL, ha="center", va="center", rotation=20,
                 fontsize=20, color="#c0392b", alpha=0.35)
    fig.savefig(figures_dir / f"{stem}.pdf")
    fig.savefig(figures_dir / f"{stem}.png")


def fig_accuracy(summary, figures_dir, plt):
    configs = configurations(summary)
    datasets = summary.get("datasets", [])
    width = 0.8 / max(1, len(configs))
    fig, ax = plt.subplots(figsize=(max(6, 2.2 * len(datasets)), 4))
    for index, (config_id, label, kind) in enumerate(configs):
        xs, ys, low, high = [], [], [], []
        for d_index, dataset in enumerate(datasets):
            row = next((r for r in dataset["rows"] if r["id"] == config_id), None)
            if not row or row["n"] == 0:
                continue
            xs.append(d_index - 0.4 + width * (index + 0.5))
            ys.append(row["accuracy"] * 100)
            low.append((row["accuracy"] - row["ciLower"]) * 100)
            high.append((row["ciUpper"] - row["accuracy"]) * 100)
        ax.bar(xs, ys, width, yerr=[low, high], capsize=2, label=label,
               color=KIND_COLOURS.get(kind, "#999999"), alpha=0.55 + 0.15 * (index % 3))
    ax.set_xticks(range(len(datasets)))
    ax.set_xticklabels([DATASET_LABELS.get(d["dataset"], d["dataset"]) for d in datasets])
    ax.set_ylabel("Accuracy (%) with 95% Wilson interval")
    ax.set_ylim(0, 100)
    ax.legend(fontsize=7, ncol=2)
    _save(fig, figures_dir, "matrix_accuracy", summary)
    plt.close(fig)


def fig_cost_accuracy(summary, figures_dir, plt):
    fig, ax = plt.subplots(figsize=(6, 4))
    for config_id, label, kind in configurations(summary):
        rows = [r for d in summary.get("datasets", []) for r in d["rows"] if r["id"] == config_id and r["n"] > 0]
        if not rows:
            continue
        cost = sum(r["costUsd"] for r in rows)
        accuracy = sum(r["accuracy"] for r in rows) / len(rows) * 100
        ax.scatter([cost], [accuracy], color=KIND_COLOURS.get(kind, "#999999"))
        ax.annotate(label, (cost, accuracy), fontsize=7, xytext=(4, 2), textcoords="offset points")
    ax.set_xlabel("Total cost over all datasets (USD)")
    ax.set_ylabel("Mean accuracy over datasets (%)")
    _save(fig, figures_dir, "matrix_cost_accuracy", summary)
    plt.close(fig)


def generate(run_dir, figures_dir, allow_mock=False):
    """Write the matrix figures and table. Returns the list of files written.

    Refuses a mock summary unless allow_mock is set; then the output is marked MOCK DATA.
    """
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    summary = load_summary(run_dir)
    figures_dir = Path(figures_dir)
    figures_dir.mkdir(parents=True, exist_ok=True)
    if summary.get("status") == "not-run" or not summary.get("datasets"):
        raise ValueError("This summary has no results yet (status not-run). Run the matrix first.")
    if is_mock(summary) and not allow_mock:
        raise ValueError("This summary is from a mock dry run (mode mock). Pass --allow-mock to draw it, marked MOCK DATA.")
    fig_accuracy(summary, figures_dir, plt)
    fig_cost_accuracy(summary, figures_dir, plt)
    (figures_dir / "matrix_table.tex").write_text(matrix_table(summary))
    return sorted(str(p.name) for p in figures_dir.glob("matrix_*"))
