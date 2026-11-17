import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { AppearanceSettings, type AppearanceLanguage, type AppearanceTheme } from './AppearanceSettings';

const meta = {
  title: 'Molecules/AppearanceSettings',
  component: AppearanceSettings,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  args: { theme: 'light', language: 'en', onThemeChange: () => undefined, onLanguageChange: () => undefined },
  decorators: [(Story) => <div className="max-w-sm"><Story /></div>],
} satisfies Meta<typeof AppearanceSettings>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Light theme, English. */
export const Default: Story = {};

/** Dark theme, French. */
export const DarkFrench: Story = { args: { theme: 'dark', language: 'fr' } };

/** Interactive: the choices change. */
export const Interactive: Story = {
  render: function Render() {
    const [theme, setTheme] = React.useState<AppearanceTheme>('light');
    const [language, setLanguage] = React.useState<AppearanceLanguage>('en');
    return <AppearanceSettings theme={theme} onThemeChange={setTheme} language={language} onLanguageChange={setLanguage} />;
  },
};
