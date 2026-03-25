"""Results output compatible with the TypeScript eval's quick-eval.json."""

from __future__ import annotations

import json
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path


@dataclass
class ModuleResult:
    """Accuracy results for a single module/strategy."""

    accuracy: float
    correct: int
    total: int


@dataclass
class DatasetResult:
    """Per-dataset breakdown of results."""

    dataset: str
    single: ModuleResult
    ensemble: dict[str, ModuleResult] = field(default_factory=dict)


@dataclass
class BenchmarkReport:
    """Full benchmark report, comparable to quick-eval.json."""

    model: str
    ensemble_sizes: list[int]
    sample: int
    datasets: list[str]
    updated_at: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )
    results: list[DatasetResult] = field(default_factory=list)

    def save(self, path: str | Path) -> None:
        """Write report as JSON."""
        p = Path(path)
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(json.dumps(asdict(self), indent=2) + "\n")

    def print_summary(self) -> None:
        """Print a human-readable summary table."""
        print(f"\n{'Dataset':<12} {'Single':>8} ", end="")
        # Collect all ensemble keys across datasets
        all_keys: list[str] = []
        for dr in self.results:
            for k in dr.ensemble:
                if k not in all_keys:
                    all_keys.append(k)
        for k in all_keys:
            print(f" {k:>16}", end="")
        print()
        print("-" * (22 + 18 * len(all_keys)))

        for dr in self.results:
            print(f"{dr.dataset:<12} {dr.single.accuracy:>7.1%} ", end="")
            for k in all_keys:
                if k in dr.ensemble:
                    print(f" {dr.ensemble[k].accuracy:>15.1%}", end="")
                else:
                    print(f" {'—':>15}", end="")
            print()
