"""CLI entry point for DSPy ensemble evaluation."""

from __future__ import annotations

import sys
from typing import Callable

import click
import dspy

from .config import (
    DEFAULT_ENSEMBLE_SIZE,
    DEFAULT_MODEL,
    DEFAULT_SAMPLE_SIZE,
    DEFAULT_SEED,
    DEFAULT_TEMPERATURE,
    configure_lm,
)
from .datasets import DATASET_METRIC_TYPE, DatasetName, load_benchmark
from .metrics import mcq_match, numeric_match, yesno_match
from .modules.majority_vote import MajorityVoteEnsemble
from .modules.optimized import OptimizedConsensus
from .modules.self_consistent import SelfConsistentEnsemble
from .modules.single import SingleModelQA
from .optimize import bootstrap_optimize, mipro_optimize
from .report import BenchmarkReport, DatasetResult, ModuleResult


ALL_DATASETS = ["gsm8k", "arc", "gpqa", "mmlu_pro", "truthfulqa", "hellaswag", "hallumix"]


def _get_metric(dataset: DatasetName) -> Callable:
    metric_type = DATASET_METRIC_TYPE[dataset]
    if metric_type == "numeric":
        return numeric_match
    if metric_type == "yesno":
        return yesno_match
    return mcq_match


def _evaluate_module(
    module: dspy.Module,
    examples: list[dspy.Example],
    metric: Callable,
    label: str = "",
) -> ModuleResult:
    """Run a module on examples and return accuracy."""
    correct = 0
    total = len(examples)
    for i, ex in enumerate(examples):
        try:
            pred = module(question=ex.question)
            if metric(ex, pred):
                correct += 1
        except Exception as e:
            print(f"  Error on {ex.id}: {e}", file=sys.stderr)
        # Progress indicator every 25 questions
        if (i + 1) % 25 == 0:
            click.echo(f"    {label} progress: {i + 1}/{total}")
    accuracy = correct / total if total > 0 else 0.0
    return ModuleResult(accuracy=accuracy, correct=correct, total=total)


@click.group()
def main():
    """DSPy ensemble evaluation CLI."""


@main.command()
@click.option("--module", type=click.Choice(["single", "ensemble", "majority", "optimized"]), required=True)
@click.option("--dataset", type=click.Choice(ALL_DATASETS), required=True)
@click.option("--sample", type=int, default=DEFAULT_SAMPLE_SIZE)
@click.option("--n", "ensemble_size", type=int, default=DEFAULT_ENSEMBLE_SIZE)
@click.option("--model", default=DEFAULT_MODEL)
@click.option("--temperature", type=float, default=DEFAULT_TEMPERATURE)
@click.option("--seed", type=int, default=DEFAULT_SEED)
def run(
    module: str,
    dataset: DatasetName,
    sample: int,
    ensemble_size: int,
    model: str,
    temperature: float,
    seed: int,
):
    """Run a single module on a dataset and report accuracy."""
    configure_lm(model=model, temperature=temperature)
    examples = load_benchmark(dataset, sample=sample, seed=seed)
    metric = _get_metric(dataset)

    click.echo(f"Dataset: {dataset} ({len(examples)} questions)")
    click.echo(f"Model: {model}")
    click.echo(f"Module: {module}" + (f" (n={ensemble_size})" if module != "single" else ""))

    if module == "single":
        mod = SingleModelQA()
    elif module == "ensemble":
        mod = SelfConsistentEnsemble(n=ensemble_size)
    elif module == "majority":
        mod = MajorityVoteEnsemble(n=ensemble_size)
    elif module == "optimized":
        mod = OptimizedConsensus(n=ensemble_size)
    else:
        raise click.BadParameter(f"Unknown module: {module}")

    result = _evaluate_module(mod, examples, metric, label=module)
    click.echo(f"\nAccuracy: {result.accuracy:.1%} ({result.correct}/{result.total})")


@main.command()
@click.option("--dataset", type=click.Choice(ALL_DATASETS), required=True)
@click.option("--sample", type=int, default=100, help="Eval sample size")
@click.option("--n", "ensemble_size", type=int, default=DEFAULT_ENSEMBLE_SIZE)
@click.option("--model", default=DEFAULT_MODEL)
@click.option("--seed", type=int, default=DEFAULT_SEED)
def compare(
    dataset: DatasetName,
    sample: int,
    ensemble_size: int,
    model: str,
    seed: int,
):
    """Compare single vs majority vote vs synthesis ensemble on a dataset."""
    configure_lm(model=model)
    examples = load_benchmark(dataset, sample=sample, seed=seed)
    metric = _get_metric(dataset)

    click.echo(f"Dataset: {dataset} ({len(examples)} questions)")
    click.echo(f"Model: {model}")
    click.echo(f"Ensemble size: {ensemble_size}")

    # 1. Single model
    click.echo("\n[1/3] Single model...")
    single_result = _evaluate_module(SingleModelQA(), examples, metric, label="single")
    click.echo(f"  Single: {single_result.accuracy:.1%}")

    # 2. Majority vote (no LLM synthesis — just count answers)
    click.echo(f"\n[2/3] Majority vote (n={ensemble_size})...")
    majority_result = _evaluate_module(
        MajorityVoteEnsemble(n=ensemble_size), examples, metric, label="majority"
    )
    click.echo(f"  Majority vote: {majority_result.accuracy:.1%}")

    # 3. LLM synthesis
    click.echo(f"\n[3/3] LLM synthesis (n={ensemble_size})...")
    synthesis_result = _evaluate_module(
        SelfConsistentEnsemble(n=ensemble_size), examples, metric, label="synthesis"
    )
    click.echo(f"  LLM synthesis: {synthesis_result.accuracy:.1%}")

    # Summary
    click.echo(f"\n{'=' * 50}")
    click.echo(f"RESULTS: {dataset} ({len(examples)} questions, n={ensemble_size})")
    click.echo(f"{'=' * 50}")
    click.echo(f"  Single model:    {single_result.accuracy:.1%}  ({single_result.correct}/{single_result.total})")
    click.echo(f"  Majority vote:   {majority_result.accuracy:.1%}  ({majority_result.correct}/{majority_result.total})  [{majority_result.accuracy - single_result.accuracy:+.1%} vs single]")
    click.echo(f"  LLM synthesis:   {synthesis_result.accuracy:.1%}  ({synthesis_result.correct}/{synthesis_result.total})  [{synthesis_result.accuracy - single_result.accuracy:+.1%} vs single]")


@main.command()
@click.option("--dataset", type=click.Choice(ALL_DATASETS), required=True)
@click.option("--train-size", type=int, default=100)
@click.option("--eval-size", type=int, default=DEFAULT_SAMPLE_SIZE)
@click.option("--n", "ensemble_size", type=int, default=DEFAULT_ENSEMBLE_SIZE)
@click.option("--model", default=DEFAULT_MODEL)
@click.option("--optimizer", type=click.Choice(["bootstrap", "mipro"]), default="bootstrap")
@click.option("--seed", type=int, default=DEFAULT_SEED)
def optimize(
    dataset: DatasetName,
    train_size: int,
    eval_size: int,
    ensemble_size: int,
    model: str,
    optimizer: str,
    seed: int,
):
    """Optimise consensus prompts on a dataset, then evaluate."""
    configure_lm(model=model)
    metric = _get_metric(dataset)

    # Load train + eval splits (non-overlapping)
    all_examples = load_benchmark(dataset, sample=train_size + eval_size, seed=seed)
    trainset = all_examples[:train_size]
    evalset = all_examples[train_size : train_size + eval_size]

    click.echo(f"Dataset: {dataset} (train={len(trainset)}, eval={len(evalset)})")
    click.echo(f"Optimizer: {optimizer}")
    click.echo(f"Ensemble size: {ensemble_size}")

    # Single model baseline
    single_mod = SingleModelQA()
    click.echo("\nEvaluating single model baseline...")
    single_result = _evaluate_module(single_mod, evalset, metric, label="single")
    click.echo(f"Single: {single_result.accuracy:.1%}")

    # Baseline: unoptimised ensemble
    base_module = SelfConsistentEnsemble(n=ensemble_size)
    click.echo("\nEvaluating unoptimised ensemble...")
    base_result = _evaluate_module(base_module, evalset, metric, label="unopt")
    click.echo(f"Unoptimised ensemble: {base_result.accuracy:.1%}")

    # Optimise — always use SelfConsistentEnsemble as the base for MIPRO too,
    # since OptimizedConsensus has too many sub-modules for MIPRO auto mode.
    click.echo(f"\nRunning {optimizer} optimisation...")
    opt_base = SelfConsistentEnsemble(n=ensemble_size)
    if optimizer == "bootstrap":
        optimized_module = bootstrap_optimize(opt_base, trainset, metric)
    else:
        optimized_module = mipro_optimize(opt_base, trainset, metric)

    click.echo("Evaluating optimised ensemble...")
    opt_result = _evaluate_module(optimized_module, evalset, metric, label="optimised")
    click.echo(f"Optimised ensemble: {opt_result.accuracy:.1%}")

    click.echo(f"\n{'=' * 40}")
    click.echo(f"Single model:         {single_result.accuracy:.1%}")
    click.echo(f"Unoptimised ensemble: {base_result.accuracy:.1%}")
    click.echo(f"Optimised ensemble:   {opt_result.accuracy:.1%}")
    click.echo(f"Delta (opt vs single): {opt_result.accuracy - single_result.accuracy:+.1%}")


@main.command()
@click.option(
    "--datasets",
    default="gsm8k,arc",
    help="Comma-separated dataset names",
)
@click.option("--sample", type=int, default=DEFAULT_SAMPLE_SIZE)
@click.option(
    "--sizes",
    default="3,5,7",
    help="Comma-separated ensemble sizes to test",
)
@click.option("--model", default=DEFAULT_MODEL)
@click.option("--output", type=click.Path(), default=None)
@click.option("--seed", type=int, default=DEFAULT_SEED)
def benchmark(
    datasets: str,
    sample: int,
    sizes: str,
    model: str,
    output: str | None,
    seed: int,
):
    """Run full benchmark: single vs ensemble across datasets and sizes."""
    configure_lm(model=model)

    dataset_names: list[DatasetName] = [
        d.strip() for d in datasets.split(",")  # type: ignore[misc]
    ]
    ensemble_sizes = [int(s.strip()) for s in sizes.split(",")]

    report = BenchmarkReport(
        model=model,
        ensemble_sizes=ensemble_sizes,
        sample=sample,
        datasets=dataset_names,
    )

    for ds_name in dataset_names:
        examples = load_benchmark(ds_name, sample=sample, seed=seed)
        metric = _get_metric(ds_name)

        click.echo(f"\n{'=' * 50}")
        click.echo(f"Dataset: {ds_name} ({len(examples)} questions)")

        # Single model baseline
        click.echo("  Running single model...")
        single_mod = SingleModelQA()
        single_result = _evaluate_module(single_mod, examples, metric, label="single")
        click.echo(f"  Single: {single_result.accuracy:.1%}")

        ds_result = DatasetResult(dataset=ds_name, single=single_result)

        # Ensemble at each size
        for n in ensemble_sizes:
            click.echo(f"  Running ensemble n={n}...")
            ens_mod = SelfConsistentEnsemble(n=n)
            ens_result = _evaluate_module(ens_mod, examples, metric, label=f"ens_n{n}")
            click.echo(f"  Ensemble (n={n}): {ens_result.accuracy:.1%}")
            ds_result.ensemble[f"ensemble_n{n}"] = ens_result

        report.results.append(ds_result)

    report.print_summary()

    if output:
        report.save(output)
        click.echo(f"\nResults saved to {output}")


if __name__ == "__main__":
    main()
