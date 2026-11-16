import { describe, it, expect } from 'vitest';
import { storiesFromIndex, screenshotName } from './story-index';

const index = {
  v: 5,
  entries: {
    'atoms-button--default': {
      id: 'atoms-button--default',
      title: 'Atoms/Button',
      name: 'Default',
      type: 'story',
    },
    'atoms-button--docs': {
      id: 'atoms-button--docs',
      title: 'Atoms/Button',
      name: 'Docs',
      type: 'docs',
    },
    'organisms-promptcard--long-prompt': {
      id: 'organisms-promptcard--long-prompt',
      title: 'Organisms/PromptCard',
      name: 'Long Prompt',
      type: 'story',
    },
  },
};

describe('storiesFromIndex', () => {
  it('returns only story entries, skipping docs pages', () => {
    const stories = storiesFromIndex(index);
    expect(stories.map((s) => s.id)).toEqual([
      'atoms-button--default',
      'organisms-promptcard--long-prompt',
    ]);
  });

  it('builds a file-safe screenshot name from title and story name', () => {
    const stories = storiesFromIndex(index);
    expect(stories[1].name).toBe('Organisms-PromptCard-LongPrompt');
  });

  it('supports the older v3 "stories" key', () => {
    const stories = storiesFromIndex({ v: 3, stories: index.entries });
    expect(stories).toHaveLength(2);
  });

  it('filters by id prefix when given', () => {
    const stories = storiesFromIndex(index, 'organisms-');
    expect(stories.map((s) => s.id)).toEqual(['organisms-promptcard--long-prompt']);
  });

  it('throws on an index with no entries', () => {
    expect(() => storiesFromIndex({})).toThrow(/index/i);
  });
});

describe('screenshotName', () => {
  it('strips characters that are unsafe in file names', () => {
    expect(screenshotName('Atoms/Button', 'All Variants: dark?')).toBe(
      'Atoms-Button-AllVariantsdark'
    );
  });
});
