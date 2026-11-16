import type { Meta, StoryObj } from '@storybook/react';
import { useTranslation } from 'react-i18next';
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
import { Button } from '../Button';

interface DialogExampleProps {
  /** Start open, so the story shows the panel without a click */
  defaultOpen?: boolean;
  /** Show a footer with actions */
  withFooter?: boolean;
  /** Long body text, to show scrolling and wrapping */
  longContent?: boolean;
}

/**
 * Story wrapper. Dialog is a set of parts, so the stories render a composed
 * example. The title and actions reuse existing translated keys so the
 * locale toolbar switches every string, including the close button label.
 */
const DialogExample = ({ defaultOpen = true, withFooter = true, longContent = false }: DialogExampleProps) => {
  const { t } = useTranslation();
  return (
    <Dialog defaultOpen={defaultOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">{t('organisms.settingsModal.title')}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('organisms.settingsModal.title')}</DialogTitle>
          <DialogDescription>{t('organisms.settingsModal.description')}</DialogDescription>
        </DialogHeader>
        {longContent && (
          <div className="max-h-60 space-y-2 overflow-y-auto text-sm text-muted-foreground">
            {Array.from({ length: 12 }, (_, i) => (
              <p key={i}>{t('organisms.settingsModal.clearConfirmMessage')}</p>
            ))}
          </div>
        )}
        {withFooter && (
          <DialogFooter>
            <DialogClose asChild>
              <Button>{t('organisms.settingsModal.doneButton')}</Button>
            </DialogClose>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};

const meta = {
  title: 'Atoms/Dialog',
  component: DialogExample,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Accessible modal built on Radix Dialog. Compose it from Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter and DialogClose. Always include a DialogTitle. The close button label is translated.',
      },
      story: { inline: false, iframeHeight: 400 },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    defaultOpen: { control: 'boolean' },
    withFooter: { control: 'boolean' },
    longContent: { control: 'boolean' },
  },
} satisfies Meta<typeof DialogExample>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Open: Story = {
  args: { defaultOpen: true },
};

export const Closed: Story = {
  args: { defaultOpen: false },
};

export const WithoutFooter: Story = {
  args: { defaultOpen: true, withFooter: false },
};

export const LongContent: Story = {
  args: { defaultOpen: true, longContent: true },
};

export const DarkTheme: Story = {
  args: { defaultOpen: true },
  globals: { theme: 'dark' },
};

export const French: Story = {
  args: { defaultOpen: true },
  globals: { locale: 'fr' },
};
