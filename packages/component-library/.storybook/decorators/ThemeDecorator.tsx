import React, { useEffect, useState } from 'react';
import type { Decorator } from '@storybook/react';

/**
 * ThemeDecorator provides light/dark theme switching for Storybook stories
 *
 * Adds a toolbar control to switch between light and dark themes
 * Applies the appropriate class to the story wrapper
 */
export const ThemeDecorator: Decorator = (Story, context) => {
  const { globals } = context;
  const theme = globals.theme || 'light';

  useEffect(() => {
    // Update document root class for global theme styles
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
  }, [theme]);

  return (
    <div className={theme} style={{ minHeight: '100vh' }}>
      <Story />
    </div>
  );
};

// Toolbar configuration for theme switching
export const themeToolbar = {
  theme: {
    description: 'Global theme for components',
    defaultValue: 'light',
    toolbar: {
      title: 'Theme',
      icon: 'circlehollow',
      items: [
        { value: 'light', icon: 'circlehollow', title: 'Light' },
        { value: 'dark', icon: 'circle', title: 'Dark' },
      ],
      dynamicTitle: true,
    },
  },
};
