import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { usePopover } from './usePopover';

function Harness() {
  const popover = usePopover();
  return (
    <div>
      <button type="button" ref={popover.triggerRef} {...popover.triggerProps}>
        Open
      </button>
      {popover.open && (
        <div ref={popover.panelRef} id={popover.panelId} data-testid="panel">
          <button type="button" onClick={() => popover.close()}>
            Inside
          </button>
        </div>
      )}
      <p>Outside</p>
    </div>
  );
}

describe('usePopover', () => {
  it('toggles the panel from the trigger and reports aria-expanded', () => {
    render(<Harness />);
    const trigger = screen.getByRole('button', { name: 'Open' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(trigger);
    expect(screen.getByTestId('panel')).toBeInTheDocument();
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(trigger).toHaveAttribute('aria-controls', screen.getByTestId('panel').id);
    fireEvent.click(trigger);
    expect(screen.queryByTestId('panel')).not.toBeInTheDocument();
  });

  it('closes on Escape and returns focus to the trigger', () => {
    render(<Harness />);
    const trigger = screen.getByRole('button', { name: 'Open' });
    fireEvent.click(trigger);
    screen.getByRole('button', { name: 'Inside' }).focus();
    fireEvent.keyDown(screen.getByTestId('panel'), { key: 'Escape' });
    expect(screen.queryByTestId('panel')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('closes on a pointer down outside the trigger and panel', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Open' }));
    fireEvent.pointerDown(screen.getByTestId('panel'));
    expect(screen.getByTestId('panel')).toBeInTheDocument();
    fireEvent.pointerDown(screen.getByText('Outside'));
    expect(screen.queryByTestId('panel')).not.toBeInTheDocument();
  });

  it('close() focuses the trigger again', () => {
    render(<Harness />);
    const trigger = screen.getByRole('button', { name: 'Open' });
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole('button', { name: 'Inside' }));
    expect(trigger).toHaveFocus();
  });
});
