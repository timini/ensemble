#!/usr/bin/env python3
"""
Generate all figures for the Ensemble AI evaluation report.
Reads data from artifacts/eval/issue-114/ and outputs to report/figures/.
"""

import json
import os
import sys
from pathlib import Path
from collections import Counter, defaultdict
import re

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import numpy as np
import seaborn as sns
import pandas as pd

# Paths
SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent
ARTIFACTS = PROJECT_ROOT / "artifacts" / "eval" / "issue-114"
CENSUS_DIR = ARTIFACTS / "census"
ENSEMBLES_DIR = ARTIFACTS / "ensembles"
SC_DIR = ARTIFACTS / "self-consistency"
FIGURES_DIR = SCRIPT_DIR / "figures"
FIGURES_DIR.mkdir(exist_ok=True)

DATASETS = ["gsm8k", "truthfulqa", "gpqa"]
DATASET_LABELS = {"gsm8k": "GSM8K", "truthfulqa": "TruthfulQA", "gpqa": "GPQA"}

# Color palette
PROVIDER_COLORS = {
    "openai": "#10a37f",
    "anthropic": "#d4a574",
    "google": "#4285f4",
    "xai": "#1da1f2",
}
STRATEGY_COLORS = {
    "standard": "#e74c3c",
    "majority": "#2ecc71",
    "elo": "#9b59b6",
    "mechanical": "#3498db",
}

sns.set_theme(style="whitegrid", font_scale=1.1)
plt.rcParams['figure.dpi'] = 150
plt.rcParams['savefig.dpi'] = 150
plt.rcParams['savefig.bbox'] = 'tight'


def short_model_name(name: str) -> str:
    """Shorten model names for display."""
    return name.split(":")[-1] if ":" in name else name


def get_provider(name: str) -> str:
    return name.split(":")[0] if ":" in name else "unknown"


# ==========================
# Census data loading
# ==========================
def load_census():
    """Load census results into a dict: {model: {dataset: accuracy}}"""
    results = defaultdict(dict)
    for f in sorted(CENSUS_DIR.glob("*.json")):
        with open(f) as fh:
            data = json.load(fh)
        model = data.get("model", "unknown")
        dataset = data.get("dataset", "unknown")
        runs = data.get("runs", [])
        if not runs:
            continue
        correct = sum(
            1 for r in runs
            if r.get("evaluation", {}).get("results", {}).get(model, {}).get("correct", False)
        )
        results[model][dataset] = correct / len(runs) * 100
    return dict(results)


# ==========================
# Ensemble data loading
# ==========================
def extract_numeric(text):
    if not text:
        return None
    patterns = [
        r'(?:final answer|answer is|equals|=)\s*\$?\s*([+-]?\d[\d,]*\.?\d*)',
        r'\*\*\$?([+-]?\d[\d,]*\.?\d*)\*\*',
        r'\$([+-]?\d[\d,]*\.?\d*)',
    ]
    for pattern in patterns:
        m = re.search(pattern, text, re.IGNORECASE)
        if m:
            return float(m.group(1).replace(',', ''))
    nums = re.findall(r'[+-]?\d[\d,]*\.?\d*', text)
    if nums:
        return float(nums[-1].replace(',', ''))
    return None


def extract_mcq(text):
    if not text:
        return None
    patterns = [
        r'(?:answer is|correct answer is|answer:)\s*\(?([A-Da-d])\)?',
        r'\b([A-Da-d])\)',
        r'\*\*([A-Da-d])\*\*',
    ]
    for pattern in patterns:
        m = re.search(pattern, text, re.IGNORECASE)
        if m:
            return m.group(1).upper()
    text = text.strip()
    if len(text) == 1 and text.upper() in 'ABCD':
        return text.upper()
    return None


def evaluate_answer(evaluator, answer, ground_truth):
    if not answer or not ground_truth:
        return False
    if evaluator == 'numeric':
        predicted = extract_numeric(answer)
        try:
            expected = float(str(ground_truth).replace(',', ''))
        except (ValueError, TypeError):
            return False
        if predicted is None:
            return False
        return abs(predicted - expected) < 1e-6
    if evaluator == 'mcq':
        predicted = extract_mcq(answer)
        if predicted is None:
            return False
        return predicted.upper() == str(ground_truth).upper()
    return False


def model_correct_for_run(r, m, evaluator_type):
    eval_result = r.get('evaluation', {}).get('results', {}).get(m, {})
    if eval_result.get('correct'):
        return True
    if eval_result.get('correct') is False and eval_result.get('predicted') is None:
        short_name = m.split(':')[-1] if ':' in m else m
        for resp in r.get('responses', []):
            resp_model = resp.get('model', '')
            if (resp_model == m or resp_model == short_name) and not resp.get('error'):
                gt = r.get('groundTruth', '')
                return evaluate_answer(evaluator_type, resp.get('content', ''), gt)
    if eval_result.get('correct') is not None:
        return eval_result['correct']
    short_name = m.split(':')[-1] if ':' in m else m
    for resp in r.get('responses', []):
        resp_model = resp.get('model', '')
        if (resp_model == m or resp_model == short_name) and not resp.get('error'):
            gt = r.get('groundTruth', '')
            return evaluate_answer(evaluator_type, resp.get('content', ''), gt)
    return False


def load_ensemble(filepath):
    with open(filepath) as f:
        data = json.load(f)
    runs = data.get('runs', [])
    models = data.get('models', [])
    strategies = data.get('strategies', [])
    dataset = data.get('dataset', 'unknown')
    n = len(runs)
    if n == 0:
        return None

    # Check error rate
    total_responses = sum(len(r.get('responses', [])) for r in runs)
    error_responses = sum(1 for r in runs for resp in r.get('responses', []) if resp.get('error'))
    if total_responses > 0 and error_responses / total_responses > 0.15:
        return None
    if n < 30:
        return None

    evaluator_type = 'numeric' if 'gsm8k' in dataset else 'mcq'
    model_acc = {}
    for m in models:
        correct = sum(1 for r in runs if model_correct_for_run(r, m, evaluator_type))
        model_acc[m] = correct / n * 100

    strategy_acc = {}
    for s in strategies:
        correct = 0
        for r in runs:
            consensus_answer = r.get('consensus', {}).get(s, '')
            gt = r.get('groundTruth', '')
            if evaluate_answer(evaluator_type, consensus_answer, gt):
                correct += 1
        strategy_acc[s] = correct / n * 100

    oracle_correct = 0
    for r in runs:
        if any(model_correct_for_run(r, m, evaluator_type) for m in models):
            oracle_correct += 1

    # Mechanical majority
    mech_correct = 0
    for r in runs:
        gt = r.get('groundTruth', '')
        answers = []
        for resp in r.get('responses', []):
            if not resp.get('error'):
                if evaluator_type == 'numeric':
                    val = extract_numeric(resp.get('content', ''))
                    if val is not None:
                        answers.append(str(val))
                elif evaluator_type == 'mcq':
                    val = extract_mcq(resp.get('content', ''))
                    if val:
                        answers.append(val)
        if answers:
            vote = Counter(answers).most_common(1)[0][0]
            if evaluate_answer(evaluator_type, vote, gt):
                mech_correct += 1

    best_model = max(model_acc, key=model_acc.get)
    return {
        'dataset': dataset, 'n': n, 'models': models, 'strategies': strategies,
        'model_acc': model_acc, 'strategy_acc': strategy_acc,
        'oracle_acc': oracle_correct / n * 100,
        'mechanical_majority_acc': mech_correct / n * 100,
        'best_model': best_model, 'best_model_acc': model_acc[best_model],
    }


ENSEMBLE_NAMES = {
    "band-a-3": "Band-A (3)",
    "band-a-4": "Band-A (4)",
    "openai-3": "OpenAI (3)",
    "cross-provider": "Cross-Prov.",
    "band-b-3": "Band-B (3)",
}


def load_all_ensembles():
    results = {}
    for slug, name in ENSEMBLE_NAMES.items():
        results[slug] = {}
        for dataset in DATASETS:
            fp = ENSEMBLES_DIR / f"{dataset}-{slug}.json"
            if fp.exists():
                r = load_ensemble(fp)
                if r:
                    results[slug][dataset] = r
    return results


# ==========================
# SC data loading
# ==========================
def load_sc():
    results = []
    if not SC_DIR.exists():
        return results
    for f in sorted(SC_DIR.glob("*.json")):
        with open(f) as fh:
            data = json.load(fh)
        runs = data.get('runs', [])
        model = data.get('model', 'unknown')
        dataset = data.get('dataset', 'unknown')
        n = len(runs)
        if n == 0:
            continue
        single_correct = sum(1 for r in runs
                             if r.get('evaluation', {}).get('results', {}).get(model, {}).get('correct', False))
        sc_correct = sum(1 for r in runs if r.get('selfConsistency', {}).get('correct', False))
        k = runs[0].get('selfConsistency', {}).get('runs', 1) if runs else 1
        results.append({
            'dataset': dataset, 'model': model, 'n': n, 'k': k,
            'single_acc': single_correct / n * 100,
            'sc_acc': sc_correct / n * 100,
            'delta': (sc_correct - single_correct) / n * 100,
        })
    return results


# ==========================
# FIGURE 1: Census Heatmap
# ==========================
def fig_census_heatmap(census):
    models = sorted(census.keys(), key=lambda m: np.mean([census[m].get(d, 0) for d in DATASETS]), reverse=True)
    data = []
    for m in models:
        row = [census[m].get(d, 0) for d in DATASETS]
        row.append(np.mean(row))
        data.append(row)
    df = pd.DataFrame(data, index=[short_model_name(m) for m in models],
                      columns=[DATASET_LABELS[d] for d in DATASETS] + ["Average"])

    colors = [PROVIDER_COLORS.get(get_provider(m), "#888") for m in models]

    fig, ax = plt.subplots(figsize=(8, 10))
    sns.heatmap(df, annot=True, fmt=".0f", cmap="RdYlGn", center=60,
                vmin=0, vmax=100, ax=ax, cbar_kws={'label': 'Accuracy (%)'})

    for i, c in enumerate(colors):
        ax.get_yticklabels()[i].set_color(c)
        ax.get_yticklabels()[i].set_fontweight('bold')

    ax.set_title("Model Census: Accuracy by Dataset (n=20)", fontsize=14, fontweight='bold')
    ax.set_ylabel("")

    legend_patches = [mpatches.Patch(color=c, label=p.title()) for p, c in PROVIDER_COLORS.items()]
    ax.legend(handles=legend_patches, loc='lower right', fontsize=9, title="Provider")

    fig.savefig(FIGURES_DIR / "fig1_census_heatmap.pdf")
    fig.savefig(FIGURES_DIR / "fig1_census_heatmap.png")
    plt.close(fig)
    print("  [OK] fig1_census_heatmap")


# ==========================
# FIGURE 2: Strength Bands
# ==========================
def fig_strength_bands(census):
    models = sorted(census.keys(), key=lambda m: np.mean([census[m].get(d, 0) for d in DATASETS]), reverse=True)
    avgs = [np.mean([census[m].get(d, 0) for d in DATASETS]) for m in models]
    colors = [PROVIDER_COLORS.get(get_provider(m), "#888") for m in models]

    fig, ax = plt.subplots(figsize=(10, 6))
    bars = ax.barh(range(len(models)), avgs, color=colors, edgecolor='white', linewidth=0.5)
    ax.set_yticks(range(len(models)))
    ax.set_yticklabels([short_model_name(m) for m in models], fontsize=9)
    ax.invert_yaxis()
    ax.set_xlabel("Average Accuracy (%)")
    ax.set_title("Model Ranking by Average Accuracy Across 3 Datasets", fontsize=13, fontweight='bold')

    # Band lines
    ax.axvline(x=75, color='red', linestyle='--', alpha=0.5, label='Band A (75%+)')
    ax.axvline(x=55, color='orange', linestyle='--', alpha=0.5, label='Band B (55-75%)')
    ax.axvline(x=35, color='gray', linestyle='--', alpha=0.5, label='Band C (35-55%)')

    for bar, val in zip(bars, avgs):
        ax.text(val + 0.5, bar.get_y() + bar.get_height()/2, f'{val:.1f}%', va='center', fontsize=8)

    legend_patches = [mpatches.Patch(color=c, label=p.title()) for p, c in PROVIDER_COLORS.items()]
    ax.legend(handles=legend_patches, loc='lower right', fontsize=9, title="Provider")

    fig.savefig(FIGURES_DIR / "fig2_strength_bands.pdf")
    fig.savefig(FIGURES_DIR / "fig2_strength_bands.png")
    plt.close(fig)
    print("  [OK] fig2_strength_bands")


# ==========================
# FIGURE 3: Ensemble Delta Chart
# ==========================
def fig_ensemble_deltas(ensembles):
    rows = []
    for slug, name in ENSEMBLE_NAMES.items():
        for dataset in DATASETS:
            r = ensembles.get(slug, {}).get(dataset)
            if r:
                best_consensus = max(r['strategy_acc'].values()) if r['strategy_acc'] else 0
                delta = best_consensus - r['best_model_acc']
                rows.append({
                    'ensemble': name,
                    'dataset': DATASET_LABELS[dataset],
                    'delta': delta,
                    'oracle_gap': r['oracle_acc'] - r['best_model_acc'],
                })

    if not rows:
        print("  [SKIP] fig3_ensemble_deltas - no data")
        return

    df = pd.DataFrame(rows)

    fig, ax = plt.subplots(figsize=(10, 6))
    datasets_present = df['dataset'].unique()
    x = np.arange(len(df['ensemble'].unique()))
    width = 0.25
    ensembles_list = list(dict.fromkeys(df['ensemble']))

    dataset_colors = {"GSM8K": "#e74c3c", "TruthfulQA": "#2ecc71", "GPQA": "#3498db"}
    for i, ds in enumerate(datasets_present):
        subset = df[df['dataset'] == ds]
        deltas = []
        for ens in ensembles_list:
            row = subset[subset['ensemble'] == ens]
            deltas.append(row['delta'].values[0] if len(row) > 0 else 0)
        offset = (i - len(datasets_present)/2 + 0.5) * width
        bars = ax.bar(x + offset, deltas, width, label=ds,
                       color=dataset_colors.get(ds, '#888'), edgecolor='white')

    ax.set_xticks(x)
    ax.set_xticklabels(ensembles_list, fontsize=9, rotation=15, ha='right')
    ax.set_ylabel("Accuracy Delta vs Best Individual (pp)")
    ax.set_title("Ensemble vs Best Individual Model", fontsize=13, fontweight='bold')
    ax.axhline(y=0, color='black', linewidth=0.8)
    ax.legend(title="Dataset")

    # Add oracle gap annotations for TruthfulQA
    for i, ens in enumerate(ensembles_list):
        tqa = df[(df['ensemble'] == ens) & (df['dataset'] == 'TruthfulQA')]
        if len(tqa) > 0 and tqa['delta'].values[0] > 0:
            gap = tqa['oracle_gap'].values[0]
            ax.annotate(f'oracle gap: {gap:.0f}pp',
                       xy=(i, tqa['delta'].values[0]),
                       xytext=(0, 10), textcoords='offset points',
                       fontsize=7, ha='center', color='#666')

    fig.savefig(FIGURES_DIR / "fig3_ensemble_deltas.pdf")
    fig.savefig(FIGURES_DIR / "fig3_ensemble_deltas.png")
    plt.close(fig)
    print("  [OK] fig3_ensemble_deltas")


# ==========================
# FIGURE 4: Strategy Comparison
# ==========================
def fig_strategy_comparison(ensembles):
    rows = []
    for slug, name in ENSEMBLE_NAMES.items():
        for dataset in DATASETS:
            r = ensembles.get(slug, {}).get(dataset)
            if r:
                for s, acc in r['strategy_acc'].items():
                    rows.append({
                        'ensemble': name, 'dataset': DATASET_LABELS[dataset],
                        'strategy': s, 'accuracy': acc,
                    })
                rows.append({
                    'ensemble': name, 'dataset': DATASET_LABELS[dataset],
                    'strategy': 'mechanical', 'accuracy': r['mechanical_majority_acc'],
                })
                rows.append({
                    'ensemble': name, 'dataset': DATASET_LABELS[dataset],
                    'strategy': 'best_individual', 'accuracy': r['best_model_acc'],
                })

    if not rows:
        print("  [SKIP] fig4_strategy_comparison - no data")
        return

    df = pd.DataFrame(rows)

    fig, axes = plt.subplots(1, 2, figsize=(14, 6), sharey=True)
    for ax, ds_name in zip(axes, ["GSM8K", "TruthfulQA"]):
        subset = df[df['dataset'] == ds_name]
        if subset.empty:
            continue
        strategies = ['standard', 'majority', 'elo', 'mechanical', 'best_individual']
        strat_labels = ['Standard', 'Majority', 'ELO', 'Mech. Maj.', 'Best Indiv.']
        strat_colors = ['#e74c3c', '#2ecc71', '#9b59b6', '#3498db', '#95a5a6']

        ensembles_list = list(dict.fromkeys(subset['ensemble']))
        x = np.arange(len(ensembles_list))
        width = 0.15

        for i, (s, label, color) in enumerate(zip(strategies, strat_labels, strat_colors)):
            vals = []
            for ens in ensembles_list:
                row = subset[(subset['ensemble'] == ens) & (subset['strategy'] == s)]
                vals.append(row['accuracy'].values[0] if len(row) > 0 else 0)
            offset = (i - len(strategies)/2 + 0.5) * width
            ax.bar(x + offset, vals, width, label=label, color=color, edgecolor='white')

        ax.set_xticks(x)
        ax.set_xticklabels(ensembles_list, fontsize=8, rotation=20, ha='right')
        ax.set_ylabel("Accuracy (%)")
        ax.set_title(ds_name, fontsize=12, fontweight='bold')
        ax.set_ylim(0, 105)
        if ax == axes[0]:
            ax.legend(fontsize=8, ncol=2)

    fig.suptitle("Consensus Strategy Comparison", fontsize=14, fontweight='bold', y=1.02)
    fig.tight_layout()
    fig.savefig(FIGURES_DIR / "fig4_strategy_comparison.pdf")
    fig.savefig(FIGURES_DIR / "fig4_strategy_comparison.png")
    plt.close(fig)
    print("  [OK] fig4_strategy_comparison")


# ==========================
# FIGURE 5: Oracle Ceiling Gap
# ==========================
def fig_oracle_ceiling(ensembles):
    rows = []
    for slug, name in ENSEMBLE_NAMES.items():
        for dataset in DATASETS:
            r = ensembles.get(slug, {}).get(dataset)
            if r:
                rows.append({
                    'ensemble': name,
                    'dataset': DATASET_LABELS[dataset],
                    'best_individual': r['best_model_acc'],
                    'best_consensus': max(r['strategy_acc'].values()) if r['strategy_acc'] else 0,
                    'oracle': r['oracle_acc'],
                })

    if not rows:
        print("  [SKIP] fig5_oracle_ceiling - no data")
        return

    df = pd.DataFrame(rows)
    df['label'] = df['ensemble'] + '\n' + df['dataset']
    df = df.sort_values('oracle', ascending=True)

    fig, ax = plt.subplots(figsize=(10, 7))
    y = np.arange(len(df))

    ax.barh(y, df['oracle'], height=0.6, color='#bdc3c7', label='Oracle Ceiling', zorder=1)
    ax.barh(y, df['best_consensus'], height=0.6, color='#2ecc71', label='Best Consensus', zorder=2)
    ax.barh(y, df['best_individual'], height=0.6, color='#3498db', label='Best Individual', zorder=3)

    # Mark where consensus beats individual
    for i, row in df.iterrows():
        idx = list(df.index).index(i)
        if row['best_consensus'] > row['best_individual']:
            ax.scatter(row['best_consensus'] + 1, y[idx], marker='*', color='gold', s=100, zorder=5)

    ax.set_yticks(y)
    ax.set_yticklabels(df['label'], fontsize=8)
    ax.set_xlabel("Accuracy (%)")
    ax.set_title("Oracle Ceiling vs Achieved Accuracy", fontsize=13, fontweight='bold')
    ax.legend(loc='lower right')
    ax.set_xlim(0, 105)

    fig.savefig(FIGURES_DIR / "fig5_oracle_ceiling.pdf")
    fig.savefig(FIGURES_DIR / "fig5_oracle_ceiling.png")
    plt.close(fig)
    print("  [OK] fig5_oracle_ceiling")


# ==========================
# FIGURE 6: Self-Consistency
# ==========================
def fig_self_consistency(sc_data):
    if not sc_data:
        print("  [SKIP] fig6_self_consistency - no data")
        return

    df = pd.DataFrame(sc_data)
    df['model_short'] = df['model'].apply(short_model_name)
    df['label'] = df['model_short'] + ' K=' + df['k'].astype(str)
    df['dataset_label'] = df['dataset'].map(DATASET_LABELS)

    fig, axes = plt.subplots(1, 3, figsize=(15, 5), sharey=True)
    for ax, ds in zip(axes, DATASETS):
        subset = df[df['dataset'] == ds].sort_values('delta')
        if subset.empty:
            ax.set_title(DATASET_LABELS[ds])
            ax.text(0.5, 0.5, 'No data', ha='center', va='center', transform=ax.transAxes)
            continue

        colors = ['#2ecc71' if d > 0 else '#e74c3c' for d in subset['delta']]
        bars = ax.barh(range(len(subset)), subset['delta'], color=colors, edgecolor='white')
        ax.set_yticks(range(len(subset)))
        ax.set_yticklabels(subset['label'], fontsize=9)
        ax.axvline(x=0, color='black', linewidth=0.8)
        ax.set_xlabel("Delta (pp)")
        ax.set_title(DATASET_LABELS[ds], fontsize=12, fontweight='bold')

        for bar, val in zip(bars, subset['delta']):
            xpos = val + 0.3 if val >= 0 else val - 0.3
            ha = 'left' if val >= 0 else 'right'
            ax.text(xpos, bar.get_y() + bar.get_height()/2,
                   f'{val:+.1f}', va='center', ha=ha, fontsize=8)

    fig.suptitle("Self-Consistency (K runs) vs Single Response", fontsize=14, fontweight='bold', y=1.02)
    fig.tight_layout()
    fig.savefig(FIGURES_DIR / "fig6_self_consistency.pdf")
    fig.savefig(FIGURES_DIR / "fig6_self_consistency.png")
    plt.close(fig)
    print("  [OK] fig6_self_consistency")


# ==========================
# FIGURE 7: Complementarity Heatmap (Band A)
# ==========================
def fig_complementarity_heatmap(census):
    band_a = [m for m in census if np.mean([census[m].get(d, 0) for d in DATASETS]) >= 75]
    band_a.sort(key=lambda m: np.mean([census[m].get(d, 0) for d in DATASETS]), reverse=True)

    if len(band_a) < 2:
        print("  [SKIP] fig7_complementarity - not enough Band-A models")
        return

    # Load per-question correctness from census
    per_q = defaultdict(lambda: defaultdict(dict))  # model -> dataset -> {qidx: correct}
    for f in sorted(CENSUS_DIR.glob("*.json")):
        with open(f) as fh:
            data = json.load(fh)
        model = data.get("model", "unknown")
        dataset = data.get("dataset", "unknown")
        for i, r in enumerate(data.get("runs", [])):
            correct = r.get("evaluation", {}).get("results", {}).get(model, {}).get("correct", False)
            per_q[model][dataset][i] = correct

    n_models = len(band_a)
    comp_matrix = np.zeros((n_models, n_models))
    for i, m1 in enumerate(band_a):
        for j, m2 in enumerate(band_a):
            if i == j:
                comp_matrix[i][j] = 0
                continue
            total = 0
            complementary = 0
            for ds in DATASETS:
                q1 = per_q.get(m1, {}).get(ds, {})
                q2 = per_q.get(m2, {}).get(ds, {})
                shared_qs = set(q1.keys()) & set(q2.keys())
                for q in shared_qs:
                    total += 1
                    if q1[q] != q2[q]:
                        complementary += 1
            comp_matrix[i][j] = complementary / max(total, 1)

    labels = [short_model_name(m) for m in band_a]
    fig, ax = plt.subplots(figsize=(7, 6))
    mask = np.eye(n_models, dtype=bool)
    sns.heatmap(comp_matrix, annot=True, fmt=".2f", cmap="YlOrRd",
                xticklabels=labels, yticklabels=labels, ax=ax, mask=mask,
                vmin=0, vmax=0.5, cbar_kws={'label': 'Complementarity'})
    ax.set_title("Error Complementarity: Band-A Models", fontsize=13, fontweight='bold')

    fig.savefig(FIGURES_DIR / "fig7_complementarity.pdf")
    fig.savefig(FIGURES_DIR / "fig7_complementarity.png")
    plt.close(fig)
    print("  [OK] fig7_complementarity")


# ==========================
# Main
# ==========================
def main():
    print("Loading data...")
    census = load_census()
    print(f"  Census: {len(census)} models")

    ensembles = load_all_ensembles()
    total_ens = sum(len(v) for v in ensembles.values())
    print(f"  Ensembles: {total_ens} clean data points")

    sc_data = load_sc()
    print(f"  Self-consistency: {len(sc_data)} results")

    print("\nGenerating figures...")
    fig_census_heatmap(census)
    fig_strength_bands(census)
    fig_ensemble_deltas(ensembles)
    fig_strategy_comparison(ensembles)
    fig_oracle_ceiling(ensembles)
    fig_self_consistency(sc_data)
    fig_complementarity_heatmap(census)

    print(f"\nDone! {len(list(FIGURES_DIR.glob('*.pdf')))} figures written to {FIGURES_DIR}")


if __name__ == "__main__":
    main()
