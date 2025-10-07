import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SettingsModal } from './SettingsModal';
import { renderWithI18n } from '../../../lib/test-utils/i18n-test-wrapper';

describe('SettingsModal', () => {
  const mockProps = {
    theme: 'light' as const,
    onThemeChange: vi.fn(),
    language: 'en' as const,
    onLanguageChange: vi.fn(),
    onExportSettings: vi.fn(),
    onImportSettings: vi.fn(),
    onClearData: vi.fn(),
    onDone: vi.fn(),
  };

  describe('rendering', () => {
    it('renders when open', () => {
      render(<SettingsModal {...mockProps} open={true} />);

      expect(screen.getByTestId('settings-modal')).toBeInTheDocument();
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('does not render when closed', () => {
      render(<SettingsModal {...mockProps} open={false} />);

      expect(screen.queryByTestId('settings-modal')).not.toBeInTheDocument();
    });

    it('renders all sections', () => {
      render(<SettingsModal {...mockProps} open={true} />);

      expect(screen.getByTestId('appearance-section')).toBeInTheDocument();
      expect(screen.getByTestId('data-management-section')).toBeInTheDocument();
      expect(screen.getByTestId('danger-zone-section')).toBeInTheDocument();
    });

    it('renders appearance section with theme and language', () => {
      render(<SettingsModal {...mockProps} open={true} />);

      expect(screen.getByText('Appearance')).toBeInTheDocument();
      expect(screen.getByText('Theme')).toBeInTheDocument();
      expect(screen.getByText('Language')).toBeInTheDocument();
    });

    it('renders theme options', () => {
      render(<SettingsModal {...mockProps} open={true} />);

      expect(screen.getByTestId('theme-light')).toBeInTheDocument();
      expect(screen.getByTestId('theme-dark')).toBeInTheDocument();
      expect(screen.getByText('Light')).toBeInTheDocument();
      expect(screen.getByText('Dark')).toBeInTheDocument();
    });

    it('renders language selector with current selection', () => {
      render(<SettingsModal {...mockProps} open={true} />);

      const select = screen.getByTestId('language-select');
      expect(select).toBeInTheDocument();
      expect(screen.getByText('English')).toBeInTheDocument();
    });

    it('renders data management buttons', () => {
      render(<SettingsModal {...mockProps} open={true} />);

      expect(screen.getByTestId('export-button')).toBeInTheDocument();
      expect(screen.getByTestId('import-button')).toBeInTheDocument();
      expect(screen.getByText('Export Settings')).toBeInTheDocument();
      expect(screen.getByText('Import Settings')).toBeInTheDocument();
    });

    it('renders danger zone section', () => {
      render(<SettingsModal {...mockProps} open={true} />);

      expect(screen.getByText('Danger Zone')).toBeInTheDocument();
      expect(screen.getByText('These actions cannot be undone.')).toBeInTheDocument();
      expect(screen.getByTestId('clear-data-button')).toBeInTheDocument();
    });

    it('renders done button', () => {
      render(<SettingsModal {...mockProps} open={true} />);

      expect(screen.getByTestId('done-button')).toBeInTheDocument();
      expect(screen.getByText('Done')).toBeInTheDocument();
    });
  });

  describe('theme selection', () => {
    it('highlights selected theme', () => {
      render(<SettingsModal {...mockProps} theme="light" open={true} />);

      const lightCard = screen.getByTestId('theme-light');
      const darkCard = screen.getByTestId('theme-dark');

      expect(lightCard).toHaveClass('border-blue-500');
      expect(darkCard).not.toHaveClass('border-blue-500');
    });

    it('highlights dark theme when selected', () => {
      render(<SettingsModal {...mockProps} theme="dark" open={true} />);

      const lightCard = screen.getByTestId('theme-light');
      const darkCard = screen.getByTestId('theme-dark');

      expect(darkCard).toHaveClass('border-blue-500');
      expect(lightCard).not.toHaveClass('border-blue-500');
    });

    it('calls onThemeChange when light theme is clicked', async () => {
      const user = userEvent.setup();
      const onThemeChange = vi.fn();

      render(<SettingsModal {...mockProps} theme="dark" onThemeChange={onThemeChange} open={true} />);

      await user.click(screen.getByTestId('theme-light'));

      expect(onThemeChange).toHaveBeenCalledWith('light');
    });

    it('calls onThemeChange when dark theme is clicked', async () => {
      const user = userEvent.setup();
      const onThemeChange = vi.fn();

      render(<SettingsModal {...mockProps} theme="light" onThemeChange={onThemeChange} open={true} />);

      await user.click(screen.getByTestId('theme-dark'));

      expect(onThemeChange).toHaveBeenCalledWith('dark');
    });
  });

  describe('language selection', () => {
    it('renders language selector', () => {
      render(<SettingsModal {...mockProps} open={true} />);

      const select = screen.getByTestId('language-select');
      expect(select).toBeInTheDocument();
      expect(select).toHaveAttribute('role', 'combobox');
    });

    it('shows currently selected language label', () => {
      render(<SettingsModal {...mockProps} language="en" open={true} />);

      expect(screen.getByText('English')).toBeInTheDocument();
    });

    it('shows different language when prop changes', () => {
      const { rerender } = render(<SettingsModal {...mockProps} language="en" open={true} />);

      expect(screen.getByText('English')).toBeInTheDocument();

      rerender(<SettingsModal {...mockProps} language="fr" open={true} />);

      expect(screen.getByText('Français')).toBeInTheDocument();
    });

    it('displays label for language selector', () => {
      render(<SettingsModal {...mockProps} open={true} />);

      expect(screen.getByText('Language')).toBeInTheDocument();
    });
  });

  describe('data management actions', () => {
    it('calls onExportSettings when export button is clicked', async () => {
      const user = userEvent.setup();
      const onExportSettings = vi.fn();

      render(<SettingsModal {...mockProps} onExportSettings={onExportSettings} open={true} />);

      await user.click(screen.getByTestId('export-button'));

      expect(onExportSettings).toHaveBeenCalledTimes(1);
    });

    it('calls onImportSettings when import button is clicked', async () => {
      const user = userEvent.setup();
      const onImportSettings = vi.fn();

      render(<SettingsModal {...mockProps} onImportSettings={onImportSettings} open={true} />);

      await user.click(screen.getByTestId('import-button'));

      expect(onImportSettings).toHaveBeenCalledTimes(1);
    });

    it('does not crash when export handler is not provided', async () => {
      const user = userEvent.setup();

      render(<SettingsModal {...mockProps} onExportSettings={undefined} open={true} />);

      await user.click(screen.getByTestId('export-button'));

      // Should not throw
      expect(screen.getByTestId('export-button')).toBeInTheDocument();
    });

    it('does not crash when import handler is not provided', async () => {
      const user = userEvent.setup();

      render(<SettingsModal {...mockProps} onImportSettings={undefined} open={true} />);

      await user.click(screen.getByTestId('import-button'));

      // Should not throw
      expect(screen.getByTestId('import-button')).toBeInTheDocument();
    });
  });

  describe('danger zone actions', () => {
    it('calls onClearData when clear data button is clicked', async () => {
      const user = userEvent.setup();
      const onClearData = vi.fn();

      render(<SettingsModal {...mockProps} onClearData={onClearData} open={true} />);

      await user.click(screen.getByTestId('clear-data-button'));

      expect(onClearData).toHaveBeenCalledTimes(1);
    });

    it('does not crash when clear data handler is not provided', async () => {
      const user = userEvent.setup();

      render(<SettingsModal {...mockProps} onClearData={undefined} open={true} />);

      await user.click(screen.getByTestId('clear-data-button'));

      // Should not throw
      expect(screen.getByTestId('clear-data-button')).toBeInTheDocument();
    });
  });

  describe('modal actions', () => {
    it('calls onDone when done button is clicked', async () => {
      const user = userEvent.setup();
      const onDone = vi.fn();

      render(<SettingsModal {...mockProps} onDone={onDone} open={true} />);

      await user.click(screen.getByTestId('done-button'));

      expect(onDone).toHaveBeenCalledTimes(1);
    });

    it('does not crash when done handler is not provided', async () => {
      const user = userEvent.setup();

      render(<SettingsModal {...mockProps} onDone={undefined} open={true} />);

      await user.click(screen.getByTestId('done-button'));

      // Should not throw
      expect(screen.getByTestId('done-button')).toBeInTheDocument();
    });
  });

  describe('styling', () => {
    it('applies correct styles to selected theme card', () => {
      render(<SettingsModal {...mockProps} theme="light" open={true} />);

      const lightCard = screen.getByTestId('theme-light');
      expect(lightCard).toHaveClass('border-blue-500', 'bg-blue-50');
    });

    it('applies correct styles to danger zone button', () => {
      render(<SettingsModal {...mockProps} open={true} />);

      const clearButton = screen.getByTestId('clear-data-button');
      expect(clearButton).toHaveClass('text-red-600');
    });
  });

  describe('accessibility', () => {
    it('has semantic heading for dialog title', () => {
      render(<SettingsModal {...mockProps} open={true} />);

      const heading = screen.getByRole('heading', { name: 'Settings' });
      expect(heading).toBeInTheDocument();
    });

    it('has semantic headings for sections', () => {
      render(<SettingsModal {...mockProps} open={true} />);

      expect(screen.getByRole('heading', { name: 'Appearance' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Data Management' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Danger Zone' })).toBeInTheDocument();
    });

    it('has accessible language select', () => {
      render(<SettingsModal {...mockProps} open={true} />);

      const select = screen.getByTestId('language-select');
      expect(select).toBeInTheDocument();
      expect(select).toHaveAttribute('role', 'combobox');
      // Check that the language label is present
      expect(screen.getByText('Language')).toBeInTheDocument();
    });

    it('has accessible buttons', () => {
      render(<SettingsModal {...mockProps} open={true} />);

      expect(screen.getByRole('button', { name: /export settings/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /import settings/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /clear all data/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /done/i })).toBeInTheDocument();
    });
  });

  describe('internationalization', () => {
    it('renders English text', () => {
      renderWithI18n(<SettingsModal {...mockProps} open={true} />, { language: 'en' });
      expect(screen.getByText('Settings')).toBeInTheDocument();
      expect(screen.getByText('Appearance')).toBeInTheDocument();
      expect(screen.getByText('Theme')).toBeInTheDocument();
      expect(screen.getByText('Light')).toBeInTheDocument();
      expect(screen.getByText('Dark')).toBeInTheDocument();
      expect(screen.getByText('Language')).toBeInTheDocument();
      expect(screen.getByText('Data Management')).toBeInTheDocument();
      expect(screen.getByText('Danger Zone')).toBeInTheDocument();
      expect(screen.getByText('Done')).toBeInTheDocument();
    });

    it('renders French text', () => {
      renderWithI18n(<SettingsModal {...mockProps} open={true} />, { language: 'fr' });
      expect(screen.getByText('Paramètres')).toBeInTheDocument();
      expect(screen.getByText('Apparence')).toBeInTheDocument();
      expect(screen.getByText('Thème')).toBeInTheDocument();
      expect(screen.getByText('Clair')).toBeInTheDocument();
      expect(screen.getByText('Sombre')).toBeInTheDocument();
      expect(screen.getByText('Langue')).toBeInTheDocument();
      expect(screen.getByText('Gestion des Données')).toBeInTheDocument();
      expect(screen.getByText('Zone de Danger')).toBeInTheDocument();
      expect(screen.getByText('Terminé')).toBeInTheDocument();
    });
  });
});
