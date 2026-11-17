.PHONY: all figures matrix test pdf clean

# Benchmark matrix run directory, for `make matrix pdf RUN=...`.
RUN ?=

all: figures pdf

figures:
	python3 generate_figures.py

matrix:
	@test -n "$(RUN)" || (echo "Set RUN=../packages/eval/results/<run-id>"; exit 1)
	python3 generate_figures.py --results $(RUN)

test:
	python3 -m unittest discover -s . -p 'test_*.py'

pdf:
	pdflatex -interaction=nonstopmode report.tex
	pdflatex -interaction=nonstopmode report.tex

clean:
	rm -f report.aux report.log report.out report.toc
	rm -f figures/*.pdf figures/*.png figures/matrix_table.tex
