import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * tailwind-merge only knows Tailwind's default scales. Teach it the semantic
 * type scale from tailwindPreset.ts, otherwise `text-lead` would be read as a
 * colour and dropped next to `text-muted-foreground`.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ text: ['caption', 'label', 'body', 'lead', 'heading', 'title', 'display'] }],
    },
  },
});

/**
 * Utility function to merge Tailwind CSS classes
 * Combines clsx for conditional classes and twMerge for deduplication
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
