import type { Meta, StoryObj } from '@storybook/react';
import { SettingsModal, type Language } from './SettingsModal';
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
  language: Language;
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
export const LightTheme: Story = {
  args: {
    theme: 'light',
    language: 'en',
    onThemeChange: () => {},
    onLanguageChange: () => {},
    onExportSettings: () => {},
    onImportSettings: () => {},
    onClearData: () => {},
  },
};

// Dark theme
export const DarkTheme: Story = {
  args: {
    theme: 'dark',
    language: 'en',
    onThemeChange: () => {},
    onLanguageChange: () => {},
    onExportSettings: () => {},
    onImportSettings: () => {},
    onClearData: () => {},
  },
};

// Different language
export const FrenchLanguage: Story = {
  render: (args) => <SettingsModalWithState {...args} />,
  args: {
    theme: 'light',
    language: 'fr',
    onThemeChange: () => {},
    onLanguageChange: () => {},
    onExportSettings: () => console.log('Export settings'),
    onImportSettings: () => console.log('Import settings'),
    onClearData: () => console.log('Clear all data'),
  },
};



// Open by default
export const OpenModal: Story = {
  args: {
    open: true,
    theme: 'light',
    language: 'en',
    onThemeChange: () => {},
    onLanguageChange: () => {},
    onExportSettings: () => {},
    onImportSettings: () => {},
    onClearData: () => {},
    onDone: () => {},
  },
};
