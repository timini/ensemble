import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import * as React from 'react';
import { Sheet } from './Sheet';
import { renderWithI18n } from '../../../lib/test-utils/i18n-test-wrapper';

describe('Sheet', () => {
  it('renders nothing while closed', () => {
    renderWithI18n(
      <Sheet open={false} onOpenChange={() => undefined} title="Settings">
        Body
      </Sheet>,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('is a modal dialog named by its title and described by its description', () => {
    renderWithI18n(
      <Sheet open onOpenChange={() => undefined} title="Settings" description="Keys and theme">
        <input aria-label="Key" />
      </Sheet>,
    );
    const dialog = screen.getByRole('dialog', { name: 'Settings' });
    expect(dialog).toHaveAccessibleDescription('Keys and theme');
    expect(screen.getByTestId('sheet')).toHaveAttribute('data-side', 'right');
  });

  it('moves focus inside when it opens', () => {
    renderWithI18n(
      <Sheet open onOpenChange={() => undefined} title="Settings">
        <input aria-label="Key" />
      </Sheet>,
    );
    expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(true);
  });

  it('can focus the panel itself on open instead of the first control', () => {
    renderWithI18n(
      <Sheet open onOpenChange={() => undefined} title="Welcome" initialFocus="panel">
        <input aria-label="Key" />
      </Sheet>,
    );
    expect(document.activeElement).toBe(screen.getByTestId('sheet'));
  });

  it('gives focus back to the control that opened it when it closes', async () => {
    function Harness() {
      const [open, setOpen] = React.useState(false);
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>Open settings</button>
          <Sheet open={open} onOpenChange={setOpen} title="Settings">
            <input aria-label="Name" />
          </Sheet>
        </>
      );
    }
    renderWithI18n(<Harness />);
    const opener = screen.getByRole('button', { name: 'Open settings' });
    opener.focus();
    fireEvent.click(opener);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
    await vi.waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await vi.waitFor(() => expect(opener).toHaveFocus());
  });

  it('closes on Escape', () => {
    const onOpenChange = vi.fn();
    renderWithI18n(
      <Sheet open onOpenChange={onOpenChange} title="Settings">
        Body
      </Sheet>,
    );
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('closes from the translated close button', () => {
    const onOpenChange = vi.fn();
    renderWithI18n(
      <Sheet open onOpenChange={onOpenChange} title="Réglages">
        Body
      </Sheet>,
      { language: 'fr' },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Fermer' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('renders a footer and opens from the left when asked', () => {
    renderWithI18n(
      <Sheet open onOpenChange={() => undefined} title="History" side="left" footer={<button>Save</button>} testId="history-sheet">
        Body
      </Sheet>,
    );
    expect(screen.getByTestId('history-sheet')).toHaveAttribute('data-side', 'left');
    expect(screen.getByTestId('sheet-footer')).toHaveTextContent('Save');
  });
});
