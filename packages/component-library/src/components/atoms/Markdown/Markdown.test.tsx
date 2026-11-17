import { describe, it, expect, vi } from 'vitest';
import { createRef } from 'react';
import { render, screen, within } from '@testing-library/react';
import { Markdown } from './Markdown';

describe('Markdown', () => {
  describe('rendering', () => {
    it('renders a container with the default test id', () => {
      render(<Markdown>Hello</Markdown>);
      expect(screen.getByTestId('markdown')).toHaveTextContent('Hello');
    });

    it('spaces blocks and styles lists without the typography plugin', () => {
      render(<Markdown>{'One\n\nTwo'}</Markdown>);
      const root = screen.getByTestId('markdown');
      expect(root.querySelectorAll('p')).toHaveLength(2);
      expect(root.className).toContain('[&>*+*]:mt-3');
      expect(root.className).toContain('[&_ul]:list-disc');
    });

    it('renders headings', () => {
      render(<Markdown>{'# Title\n\n## Subtitle'}</Markdown>);
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Title');
      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Subtitle');
    });

    it('renders bold, italic and inline code', () => {
      render(<Markdown>{'This is **bold**, *italic* and `code`.'}</Markdown>);
      const root = screen.getByTestId('markdown');
      expect(within(root).getByText('bold').tagName).toBe('STRONG');
      expect(within(root).getByText('italic').tagName).toBe('EM');
      expect(within(root).getByText('code').tagName).toBe('CODE');
    });

    it('renders ordered and unordered lists', () => {
      render(<Markdown>{'- one\n- two\n\n1. first\n2. second'}</Markdown>);
      const lists = screen.getAllByRole('list');
      expect(lists).toHaveLength(2);
      expect(lists[0].tagName).toBe('UL');
      expect(lists[1].tagName).toBe('OL');
      expect(screen.getAllByRole('listitem')).toHaveLength(4);
    });

    it('renders links', () => {
      render(<Markdown>{'[Docs](https://example.com)'}</Markdown>);
      expect(screen.getByRole('link', { name: 'Docs' })).toHaveAttribute('href', 'https://example.com');
    });

    it('renders blockquotes', () => {
      render(<Markdown>{'> quoted text'}</Markdown>);
      expect(screen.getByText('quoted text').closest('blockquote')).not.toBeNull();
    });
  });

  describe('GitHub Flavored Markdown', () => {
    it('renders tables', () => {
      render(<Markdown>{'| Model | Score |\n| --- | --- |\n| A | 1 |'}</Markdown>);
      expect(screen.getByRole('table')).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: 'Model' })).toBeInTheDocument();
      expect(screen.getByRole('cell', { name: 'A' })).toBeInTheDocument();
    });

    it('renders strikethrough', () => {
      render(<Markdown>{'~~gone~~'}</Markdown>);
      expect(screen.getByText('gone').tagName).toBe('DEL');
    });

    it('renders task lists as checkboxes', () => {
      render(<Markdown>{'- [x] done\n- [ ] todo'}</Markdown>);
      const boxes = screen.getAllByRole('checkbox');
      expect(boxes).toHaveLength(2);
      expect(boxes[0]).toBeChecked();
      expect(boxes[1]).not.toBeChecked();
    });

    it('autolinks bare URLs', () => {
      render(<Markdown>{'See https://example.com now'}</Markdown>);
      expect(screen.getByRole('link')).toHaveAttribute('href', 'https://example.com');
    });
  });

  describe('safety', () => {
    it('does not render raw HTML', () => {
      const { container } = render(<Markdown>{'<script>alert(1)</script><b>raw</b>'}</Markdown>);
      expect(container.querySelector('script')).toBeNull();
      expect(container.querySelector('b')).toBeNull();
    });
  });

  describe('props', () => {
    it('applies custom className', () => {
      render(<Markdown className="custom-class">Hi</Markdown>);
      expect(screen.getByTestId('markdown')).toHaveClass('custom-class');
    });

    it('accepts a custom data-testid', () => {
      render(<Markdown data-testid="answer">Hi</Markdown>);
      expect(screen.getByTestId('answer')).toBeInTheDocument();
    });

    it('forwards the ref to the container', () => {
      const ref = createRef<HTMLDivElement>();
      render(<Markdown ref={ref}>Hi</Markdown>);
      expect(ref.current).toBe(screen.getByTestId('markdown'));
    });

    it('renders empty content without crashing', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      render(<Markdown>{''}</Markdown>);
      expect(screen.getByTestId('markdown')).toBeEmptyDOMElement();
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });
  });
});
