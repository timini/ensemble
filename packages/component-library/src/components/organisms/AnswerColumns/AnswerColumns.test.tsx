import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';
import { AnswerColumns } from './AnswerColumns';
import { sampleAnswers } from './fixtures';
import { renderWithI18n } from '../../../lib/test-utils/i18n-test-wrapper';

describe('AnswerColumns', () => {
  it('renders a heading and one card per answer', () => {
    renderWithI18n(<AnswerColumns answers={sampleAnswers} />);
    expect(screen.getByRole('heading', { name: 'Individual answers' })).toBeInTheDocument();
    expect(screen.getAllByTestId('answer-card')).toHaveLength(3);
  });

  it('has a tab per answer wired to its panel, the first selected', () => {
    renderWithI18n(<AnswerColumns answers={sampleAnswers} />);
    const tabs = within(screen.getByRole('tablist', { name: 'Answers' })).getAllByRole('tab');
    expect(tabs).toHaveLength(3);
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[0]).toHaveAttribute('tabindex', '0');
    expect(tabs[1]).toHaveAttribute('tabindex', '-1');
    const panel = document.getElementById(tabs[1].getAttribute('aria-controls') ?? '');
    expect(panel).toHaveAttribute('role', 'tabpanel');
    expect(panel).toHaveAccessibleName('Claude Opus 5.5');
  });

  it('selects a tab on click and scrolls to its answer', () => {
    renderWithI18n(<AnswerColumns answers={sampleAnswers} />);
    const track = screen.getByTestId('answer-columns-track');
    const scrollTo = vi.fn();
    Object.assign(track, { scrollTo });
    Object.defineProperty(track, 'clientWidth', { value: 300 });
    fireEvent.click(screen.getAllByRole('tab')[2]);
    expect(screen.getAllByRole('tab')[2]).toHaveAttribute('aria-selected', 'true');
    expect(scrollTo).toHaveBeenCalledWith({ left: 600, behavior: 'smooth' });
  });

  it('moves between tabs with the arrow, Home and End keys', () => {
    renderWithI18n(<AnswerColumns answers={sampleAnswers} />);
    const tabs = () => screen.getAllByRole('tab');
    tabs()[0].focus();
    fireEvent.keyDown(tabs()[0], { key: 'ArrowRight' });
    expect(tabs()[1]).toHaveFocus();
    expect(tabs()[1]).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(tabs()[1], { key: 'End' });
    expect(tabs()[2]).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(tabs()[2], { key: 'ArrowRight' });
    expect(tabs()[0]).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(tabs()[0], { key: 'ArrowLeft' });
    expect(tabs()[2]).toHaveFocus();
  });

  it('follows a swipe to the next answer', () => {
    renderWithI18n(<AnswerColumns answers={sampleAnswers} />);
    const track = screen.getByTestId('answer-columns-track');
    Object.defineProperty(track, 'clientWidth', { value: 300 });
    track.scrollLeft = 310;
    fireEvent.scroll(track);
    expect(screen.getAllByRole('tab')[1]).toHaveAttribute('aria-selected', 'true');
  });

  it('ignores scroll frames from its own smooth scroll until it arrives', () => {
    renderWithI18n(<AnswerColumns answers={sampleAnswers} />);
    const track = screen.getByTestId('answer-columns-track');
    Object.assign(track, { scrollTo: vi.fn() });
    Object.defineProperty(track, 'clientWidth', { value: 300 });
    const tabs = () => screen.getAllByRole('tab');
    tabs()[0].focus();
    fireEvent.keyDown(tabs()[0], { key: 'ArrowRight' });
    track.scrollLeft = 100;
    fireEvent.scroll(track);
    expect(tabs()[1]).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(tabs()[1], { key: 'ArrowRight' });
    expect(tabs()[2]).toHaveAttribute('aria-selected', 'true');
    track.scrollLeft = 320;
    fireEvent.scroll(track);
    expect(tabs()[2]).toHaveAttribute('aria-selected', 'true');
    track.scrollLeft = 600;
    fireEvent.scroll(track);
    track.scrollLeft = 290;
    fireEvent.scroll(track);
    expect(tabs()[1]).toHaveAttribute('aria-selected', 'true');
  });

  it('marks streaming and failed answers on their tabs', () => {
    const answers = [
      { ...sampleAnswers[0], status: 'streaming' as const },
      { ...sampleAnswers[1], status: 'error' as const, errorKind: 'timeout' as const },
      sampleAnswers[2],
    ];
    renderWithI18n(<AnswerColumns answers={answers} />, { language: 'fr' });
    const tabs = screen.getAllByRole('tab');
    expect(tabs[0]).toHaveAttribute('data-status', 'streaming');
    expect(tabs[1]).toHaveAttribute('data-status', 'error');
    expect(screen.getByRole('heading', { name: 'Réponses individuelles' })).toBeInTheDocument();
  });

  it('keeps the selected tab in range when answers are removed', () => {
    const { rerender } = renderWithI18n(<AnswerColumns answers={sampleAnswers} />);
    fireEvent.click(screen.getAllByRole('tab')[2]);
    rerender(<AnswerColumns answers={sampleAnswers.slice(0, 2)} />);
    expect(screen.getAllByRole('tab')[1]).toHaveAttribute('aria-selected', 'true');
  });
});
