.PHONY: all figures pdf clean

all: figures pdf

figures:
	python3 generate_figures.py

pdf: figures
	pdflatex -interaction=nonstopmode report.tex
	pdflatex -interaction=nonstopmode report.tex

clean:
	rm -f report.aux report.log report.out report.toc
	rm -f figures/*.pdf figures/*.png
