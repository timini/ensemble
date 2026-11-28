"""DSPy modules for single model and ensemble evaluation."""

from .single import SingleModelQA
from .self_consistent import SelfConsistentEnsemble
from .optimized import OptimizedConsensus

__all__ = ["SingleModelQA", "SelfConsistentEnsemble", "OptimizedConsensus"]
