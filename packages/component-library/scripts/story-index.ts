/**
 * Helpers for reading the Storybook story index (index.json).
 *
 * Storybook 7 and later serve the index at /index.json (key "entries").
 * Older versions served /stories.json (key "stories"). Both shapes are accepted.
 */

export interface StoryIndexEntry {
  id: string;
  title: string;
  name: string;
  type?: 'story' | 'docs' | string;
}

export interface StoryIndex {
  v?: number;
  entries?: Record<string, StoryIndexEntry>;
  stories?: Record<string, StoryIndexEntry>;
}

export interface ScreenshotStory {
  /** Storybook story id, as used in iframe.html?id=... */
  id: string;
  /** File name (without extension) for the screenshot */
  name: string;
}

/**
 * Builds a file-safe screenshot name such as "Atoms-Button-AllVariants".
 */
export function screenshotName(title: string, storyName: string): string {
  const clean = (s: string) => s.replace(/[^A-Za-z0-9]/g, '');
  const titlePart = title
    .split('/')
    .map(clean)
    .filter(Boolean)
    .join('-');
  return `${titlePart}-${clean(storyName)}`;
}

/**
 * Lists the stories in a Storybook index, skipping docs pages.
 *
 * @param index - Parsed index.json content
 * @param idPrefix - Optional story id prefix to filter on, for example "atoms-"
 */
export function storiesFromIndex(index: StoryIndex, idPrefix?: string): ScreenshotStory[] {
  const entries = index.entries ?? index.stories;
  if (!entries) {
    throw new Error('Storybook index has no "entries" or "stories" key');
  }
  return Object.values(entries)
    .filter((entry) => (entry.type ?? 'story') === 'story')
    .filter((entry) => !idPrefix || entry.id.startsWith(idPrefix))
    .map((entry) => ({ id: entry.id, name: screenshotName(entry.title, entry.name) }));
}
