import type { Meta, StoryObj } from '@storybook/react';
import { SettingsModal } from './SettingsModal';
import { useState } from 'react';
import { Button } from '../../atoms/Button';

const meta = {
  title: 'Organisms/SettingsModal',
  component: SettingsModal,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof SettingsModal>;

export default meta;
type Story = StoryObj<typeof meta>;

interface SettingsModalWithStateProps {
  theme: 'light' | 'dark';
  language: 'en' | 'es' | 'fr' | 'de' | 'ja' | 'zh';
}

// Wrapper component to handle state
const SettingsModalWithState = (args: SettingsModalWithStateProps) => {
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState(args.theme);
  const [language, setLanguage] = useState(args.language);

  return (
    <div>
      <Button onClick={() => setOpen(true)}>Open Settings</Button>
      <SettingsModal
        {...args}
        open={open}
        onOpenChange={setOpen}
        theme={theme}
        onThemeChange={setTheme}
        language={language}
        onLanguageChange={setLanguage}
        onDone={() => setOpen(false)}
      />
    </div>
  );
};

// Default story
export const Default: Story = {
  render: (args) => <SettingsModalWithState {...args} />,
  args: {
    theme: 'light',
    language: 'en',
    onExportSettings: () => console.log('Export settings'),
    onImportSettings: () => console.log('Import settings'),
    onClearData: () => console.log('Clear all data'),
  },
};

// Dark theme
export const DarkTheme: Story = {
  render: (args) => <SettingsModalWithState {...args} />,
  args: {
    theme: 'dark',
    language: 'en',
    onExportSettings: () => console.log('Export settings'),
    onImportSettings: () => console.log('Import settings'),
    onClearData: () => console.log('Clear all data'),
  },
};

// Different language
export const SpanishLanguage: Story = {
  render: (args) => <SettingsModalWithState {...args} />,
  args: {
    theme: 'light',
    language: 'es',
    onExportSettings: () => console.log('Export settings'),
    onImportSettings: () => console.log('Import settings'),
    onClearData: () => console.log('Clear all data'),
  },
};

// Japanese language
export const JapaneseLanguage: Story = {
  render: (args) => <SettingsModalWithState {...args} />,
  args: {
    theme: 'light',
    language: 'ja',
    onExportSettings: () => console.log('Export settings'),
    onImportSettings: () => console.log('Import settings'),
    onClearData: () => console.log('Clear all data'),
  },
};

// Open by default
export const OpenByDefault: Story = {
  args: {
    open: true,
    theme: 'light',
    language: 'en',
    onExportSettings: () => console.log('Export settings'),
    onImportSettings: () => console.log('Import settings'),
    onClearData: () => console.log('Clear all data'),
    onDone: () => console.log('Done clicked'),
  },
};
