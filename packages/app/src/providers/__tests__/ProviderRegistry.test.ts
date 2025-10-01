/**
 * ProviderRegistry Tests
 *
 * Unit tests for singleton provider registry
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ProviderRegistry } from '../ProviderRegistry';
import { MockAPIClient } from '../clients/MockAPIClient';

describe('ProviderRegistry', () => {
  beforeEach(() => {
    // Clear registry before each test
    ProviderRegistry.getInstance().clearAll();
  });

  describe('getInstance', () => {
    it('returns singleton instance', () => {
      const instance1 = ProviderRegistry.getInstance();
      const instance2 = ProviderRegistry.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe('register', () => {
    it('registers a provider', () => {
      const registry = ProviderRegistry.getInstance();
      const client = new MockAPIClient();

      registry.register('openai', 'mock', client);

      expect(registry.hasProvider('openai', 'mock')).toBe(true);
    });

    it('allows registering multiple providers', () => {
      const registry = ProviderRegistry.getInstance();
      const client = new MockAPIClient();

      registry.register('openai', 'mock', client);
      registry.register('anthropic', 'mock', client);
      registry.register('google', 'mock', client);
      registry.register('xai', 'mock', client);

      expect(registry.hasProvider('openai', 'mock')).toBe(true);
      expect(registry.hasProvider('anthropic', 'mock')).toBe(true);
      expect(registry.hasProvider('google', 'mock')).toBe(true);
      expect(registry.hasProvider('xai', 'mock')).toBe(true);
    });

    it('allows registering same provider for different modes', () => {
      const registry = ProviderRegistry.getInstance();
      const mockClient = new MockAPIClient();

      registry.register('openai', 'mock', mockClient);
      registry.register('openai', 'free', mockClient);
      registry.register('openai', 'pro', mockClient);

      expect(registry.hasProvider('openai', 'mock')).toBe(true);
      expect(registry.hasProvider('openai', 'free')).toBe(true);
      expect(registry.hasProvider('openai', 'pro')).toBe(true);
    });
  });

  describe('getProvider', () => {
    it('retrieves registered provider', () => {
      const registry = ProviderRegistry.getInstance();
      const client = new MockAPIClient();

      registry.register('openai', 'mock', client);

      const provider = registry.getProvider('openai', 'mock');
      expect(provider).toBe(client);
    });

    it('throws error for unregistered provider', () => {
      const registry = ProviderRegistry.getInstance();

      expect(() => registry.getProvider('openai', 'mock')).toThrow(
        "Provider 'openai' not found for mode 'mock'"
      );
    });

    it('throws helpful error message', () => {
      const registry = ProviderRegistry.getInstance();

      expect(() => registry.getProvider('anthropic', 'free')).toThrow(
        'Did you forget to register it?'
      );
    });
  });

  describe('listProviders', () => {
    it('returns empty array when no providers registered', () => {
      const registry = ProviderRegistry.getInstance();
      const providers = registry.listProviders('mock');

      expect(providers).toEqual([]);
    });

    it('lists all registered providers for specific mode', () => {
      const registry = ProviderRegistry.getInstance();
      const client = new MockAPIClient();

      registry.register('openai', 'mock', client);
      registry.register('anthropic', 'mock', client);
      registry.register('google', 'free', client); // Different mode

      const mockProviders = registry.listProviders('mock');
      const freeProviders = registry.listProviders('free');

      expect(mockProviders).toHaveLength(2);
      expect(mockProviders).toContain('openai');
      expect(mockProviders).toContain('anthropic');

      expect(freeProviders).toHaveLength(1);
      expect(freeProviders).toContain('google');
    });
  });

  describe('hasProvider', () => {
    it('returns true for registered provider', () => {
      const registry = ProviderRegistry.getInstance();
      const client = new MockAPIClient();

      registry.register('openai', 'mock', client);

      expect(registry.hasProvider('openai', 'mock')).toBe(true);
    });

    it('returns false for unregistered provider', () => {
      const registry = ProviderRegistry.getInstance();

      expect(registry.hasProvider('openai', 'mock')).toBe(false);
    });

    it('returns false for different mode', () => {
      const registry = ProviderRegistry.getInstance();
      const client = new MockAPIClient();

      registry.register('openai', 'mock', client);

      expect(registry.hasProvider('openai', 'free')).toBe(false);
    });
  });

  describe('clearAll', () => {
    it('clears all registered providers', () => {
      const registry = ProviderRegistry.getInstance();
      const client = new MockAPIClient();

      registry.register('openai', 'mock', client);
      registry.register('anthropic', 'mock', client);

      expect(registry.listProviders('mock')).toHaveLength(2);

      registry.clearAll();

      expect(registry.listProviders('mock')).toHaveLength(0);
    });
  });
});
