import type { HistoryItem, HistoryPreset } from './HistorySidebar';

/** Fixed "now" so stories and tests render the same groups. */
export const NOW = new Date('2026-11-17T15:00:00Z').getTime();
const HOUR = 3_600_000;

/** Runs with a known start time. */
export const sampleHistory: Array<HistoryItem & { createdAt: number }> = [
  { id: 'r1', prompt: 'Boiling point of water on Everest, and why it is lower', createdAt: NOW - 0.05 * HOUR, level: 'high' },
  { id: 'r2', prompt: 'Is a 30-year fixed mortgage better than a tracker right now?', createdAt: NOW - 1 * HOUR, level: 'low' },
  { id: 'r3', prompt: 'Does vitamin D help with winter tiredness?', createdAt: NOW - 30 * HOUR, level: 'medium' },
  { id: 'r4', prompt: 'Postgres vs SQLite for a small internal tool', createdAt: NOW - 60 * HOUR, level: 'high' },
  { id: 'r5', prompt: 'Translate the lease clause about repairs', createdAt: NOW - 20 * 24 * HOUR },
];

export const samplePresets: HistoryPreset[] = [
  { id: 'p1', name: 'Three frontier models', modelCount: 3 },
  { id: 'p2', name: 'Local only (Ollama)', modelCount: 3 },
  { id: 'p3', name: 'Cheap and fast', modelCount: 4 },
];
