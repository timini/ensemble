import { describe, expect, it } from 'vitest';

import { getTierConfig } from './tierConfig.js';

describe('getTierConfig', () => {
  it('throws for all tier names (configs not yet rebuilt)', () => {
    expect(() => getTierConfig('ci')).toThrow('not yet configured');
    expect(() => getTierConfig('post-merge')).toThrow('not yet configured');
    expect(() => getTierConfig('homogeneous-ci')).toThrow('not yet configured');
    expect(() => getTierConfig('homogeneous-post-merge')).toThrow('not yet configured');
  });

  it('includes the tier name in the error message', () => {
    expect(() => getTierConfig('ci')).toThrow('"ci"');
  });
});
