"""Tests for matrix_figures.py. Run: python3 -m unittest discover -s report -p 'test_*.py'"""
import json
import tempfile
import unittest
from pathlib import Path

import matrix_figures

FIXTURE = Path(__file__).parent / "fixtures" / "matrix-summary.json"


class MatrixFiguresTest(unittest.TestCase):
    def test_table_has_a_line_per_configuration_and_dataset(self):
        summary = matrix_figures.load_summary(FIXTURE)
        table = matrix_figures.matrix_table(summary)
        rows = sum(len(d["rows"]) for d in summary["datasets"])
        self.assertEqual(table.count(r"\\"), rows + 1)
        self.assertIn("best", table)
        self.assertIn(r"\bottomrule", table)

    def test_configurations_are_ordered_singles_ensembles_reference(self):
        kinds = [k for _, _, k in matrix_figures.configurations(matrix_figures.load_summary(FIXTURE))]
        self.assertEqual(kinds, sorted(kinds, key=lambda k: matrix_figures.KIND_ORDER[k]))

    def test_generate_writes_figures_and_table(self):
        with tempfile.TemporaryDirectory() as out:
            written = matrix_figures.generate(FIXTURE.parent / FIXTURE.name, out)
            self.assertIn("matrix_accuracy.pdf", written)
            self.assertIn("matrix_cost_accuracy.png", written)
            self.assertIn("matrix_table.tex", written)

    def test_refuses_a_not_run_summary(self):
        with tempfile.TemporaryDirectory() as out:
            path = Path(out) / "summary.json"
            path.write_text(json.dumps({"schemaVersion": 1, "status": "not-run", "datasets": []}))
            with self.assertRaises(ValueError):
                matrix_figures.generate(path, out)

    def test_refuses_an_unknown_schema(self):
        with tempfile.TemporaryDirectory() as out:
            path = Path(out) / "summary.json"
            path.write_text(json.dumps({"schemaVersion": 9}))
            with self.assertRaises(ValueError):
                matrix_figures.load_summary(path)


if __name__ == "__main__":
    unittest.main()
