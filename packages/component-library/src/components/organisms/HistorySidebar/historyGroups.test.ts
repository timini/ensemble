import { describe, expect, it } from 'vitest';
import { groupHistory, historyTime } from './historyGroups';
import { NOW, sampleHistory } from './fixtures';
import type { HistoryItem } from './HistorySidebar';

describe('groupHistory', () => {
  it('sorts newest first into today, the previous 7 days and older', () => {
    const groups = groupHistory([...sampleHistory].reverse(), NOW);
    expect(groups.map((g) => g.group)).toEqual(['today', 'week', 'older']);
    expect(groups[0].items.map((i) => i.id)).toEqual(['r1', 'r2']);
    expect(groups[1].items.map((i) => i.id)).toEqual(['r3', 'r4']);
    expect(groups[2].items.map((i) => i.id)).toEqual(['r5']);
  });

  it('puts runs with no time last, in their own undated group', () => {
    const undated: HistoryItem = { id: 'u1', prompt: 'No time kept' };
    const groups = groupHistory([undated, sampleHistory[0]], NOW);
    expect(groups.map((g) => g.group)).toEqual(['today', 'undated']);
    expect(groups[1].items).toEqual([undated]);
  });

  it('leaves out empty groups', () => {
    expect(groupHistory([sampleHistory[4]], NOW).map((g) => g.group)).toEqual(['older']);
  });
});

describe('historyTime', () => {
  it('uses the time today, the weekday this week and the date before', () => {
    expect(historyTime(sampleHistory[0].createdAt, 'today', 'en')).toMatch(/\d{1,2}:\d{2}/);
    expect(historyTime(sampleHistory[2].createdAt, 'week', 'en')).toMatch(/^[A-Z][a-z]{2}$/);
    expect(historyTime(sampleHistory[4].createdAt, 'older', 'en')).toMatch(/Oct/);
  });
});
