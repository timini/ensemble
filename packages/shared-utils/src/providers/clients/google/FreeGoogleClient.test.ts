import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { FreeGoogleClient } from './FreeGoogleClient';

vi.mock('axios');

describe('FreeGoogleClient', () => {
    let client: FreeGoogleClient;
    const mockApiKey = 'test-api-key';

    beforeEach(() => {
        vi.resetAllMocks();
        client = new FreeGoogleClient('google', () => mockApiKey);
    });

    it('should fetch and parse text models correctly', async () => {
        const mockResponse = {
            data: {
                models: [
                    { name: 'models/gemini-1.0-pro', displayName: 'Gemini 1.0 Pro' },
                    { name: 'models/gemini-1.5-flash', displayName: 'Gemini 1.5 Flash' },
                    { name: 'models/embedding-001', displayName: 'Embedding 001' }, // Should be filtered out if we only want text models? 
                    // Actually the current implementation doesn't filter by capability, just returns all.
                    // But let's verify what it returns.
                ],
            },
        };

        vi.mocked(axios.get).mockResolvedValue(mockResponse);

        const models = await client.listAvailableTextModels();

        expect(axios.get).toHaveBeenCalledWith(
            'https://generativelanguage.googleapis.com/v1beta/models',
            {
                params: {
                    key: mockApiKey,
                },
            }
        );

        // The current implementation splits by '/' and takes the last segment
        expect(models).toContain('gemini-1.0-pro');
        expect(models).toContain('gemini-1.5-flash');
        expect(models).toContain('embedding-001');
        expect(models).toHaveLength(3);
    });

    it('should handle empty response gracefully', async () => {
        vi.mocked(axios.get).mockResolvedValue({ data: {} });

        // Should fall back to mock models if API returns nothing? 
        // Or return empty list?
        // Looking at BaseFreeClient:
        // if fetchTextModels throws, it falls back to mock.
        // if fetchTextModels returns empty array, it returns empty array.
        // But FreeGoogleClient.fetchTextModels returns [] if data.models is undefined.

        const models = await client.listAvailableTextModels();
        expect(models).toEqual([]);
    });

    it('should handle API error by falling back to mock models (BaseFreeClient behavior)', async () => {
        vi.mocked(axios.get).mockRejectedValue(new Error('API Error'));

        const models = await client.listAvailableTextModels();

        // BaseFreeClient catches error and returns mock models
        expect(models.length).toBeGreaterThan(0);
        expect(models).toContain('Gemini 1.5 Pro'); // From mock list
    });
});
