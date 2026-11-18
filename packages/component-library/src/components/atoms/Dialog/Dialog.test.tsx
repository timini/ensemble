import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from './Dialog';
import { renderWithI18n } from '../../../lib/test-utils/i18n-test-wrapper';

interface ExampleProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  contentClassName?: string;
}

const Example = ({ open, onOpenChange, contentClassName }: ExampleProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogTrigger data-testid="dialog-trigger">Open</DialogTrigger>
    <DialogContent data-testid="dialog-content" className={contentClassName}>
      <DialogHeader data-testid="dialog-header">
        <DialogTitle data-testid="dialog-title">Dialog title</DialogTitle>
        <DialogDescription data-testid="dialog-description">
          Dialog description
        </DialogDescription>
      </DialogHeader>
      <DialogFooter data-testid="dialog-footer">
        <DialogClose data-testid="dialog-cancel">Cancel</DialogClose>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

describe('Dialog', () => {
  describe('rendering', () => {
    it('does not render content when closed', () => {
      render(<Example />);
      expect(screen.getByTestId('dialog-trigger')).toBeInTheDocument();
      expect(screen.queryByTestId('dialog-content')).not.toBeInTheDocument();
    });

    it('renders title, description, header and footer when open', () => {
      render(<Example open />);
      expect(screen.getByTestId('dialog-content')).toBeInTheDocument();
      expect(screen.getByTestId('dialog-title')).toHaveTextContent('Dialog title');
      expect(screen.getByTestId('dialog-description')).toHaveTextContent('Dialog description');
      expect(screen.getByTestId('dialog-header')).toBeInTheDocument();
      expect(screen.getByTestId('dialog-footer')).toBeInTheDocument();
    });

    it('applies custom className to content', () => {
      render(<Example open contentClassName="custom-class" />);
      expect(screen.getByTestId('dialog-content')).toHaveClass('custom-class');
    });

    it('labels the dialog with its title and description', () => {
      render(<Example open />);
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAccessibleName('Dialog title');
      expect(dialog).toHaveAccessibleDescription('Dialog description');
    });
  });

  describe('interactions', () => {
    it('opens when the trigger is clicked', async () => {
      const user = userEvent.setup();
      render(<Example />);
      await user.click(screen.getByTestId('dialog-trigger'));
      expect(screen.getByTestId('dialog-content')).toBeInTheDocument();
    });

    it('calls onOpenChange(false) when the close button is clicked', async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();
      render(<Example open onOpenChange={onOpenChange} />);
      await user.click(screen.getByTestId('dialog-close-button'));
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it('calls onOpenChange(false) when DialogClose is clicked', async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();
      render(<Example open onOpenChange={onOpenChange} />);
      await user.click(screen.getByTestId('dialog-cancel'));
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it('closes on Escape', async () => {
      const user = userEvent.setup();
      render(<Example />);
      await user.click(screen.getByTestId('dialog-trigger'));
      await user.keyboard('{Escape}');
      expect(screen.queryByTestId('dialog-content')).not.toBeInTheDocument();
    });
  });

  describe('i18n', () => {
    it('labels the close button in English', () => {
      renderWithI18n(<Example open />, { language: 'en' });
      expect(screen.getByTestId('dialog-close-button')).toHaveAccessibleName('Close');
    });

    it('labels the close button in French', () => {
      renderWithI18n(<Example open />, { language: 'fr' });
      expect(screen.getByTestId('dialog-close-button')).toHaveAccessibleName('Fermer');
    });
  });
});
