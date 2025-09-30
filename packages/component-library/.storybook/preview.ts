import type { Preview } from '@storybook/react-vite';
import {
  ThemeDecorator,
  themeToolbar,
} from './decorators/ThemeDecorator';
import {
  I18nDecorator,
  localeToolbar,
} from './decorators/I18nDecorator';

// Import Tailwind CSS for styling
import '../../app/src/styles/globals.css';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    // Accessibility addon configuration
    a11y: {
      element: '#storybook-root',
      config: {},
      options: {},
      manual: false,
    },
  },
  // Apply decorators globally to all stories
  decorators: [ThemeDecorator, I18nDecorator],
  // Add toolbar controls for theme and locale
  globalTypes: {
    ...themeToolbar,
    ...localeToolbar,
  },
};

export default preview;
