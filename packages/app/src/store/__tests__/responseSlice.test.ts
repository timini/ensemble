/**
 * Response Slice Tests
 */

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { describe, it, expect, beforeEach } from 'vitest';
import { createStore } from 'zustand/vanilla';
import { createResponseSlice, type ResponseSlice } from '../slices/responseSlice';

describe('responseSlice', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let store: any;

  beforeEach(() => {
    store = createStore<ResponseSlice>()(createResponseSlice);
  });

  it('initializes with empty state', () => {
    const state = store.getState();
    expect(state.prompt).toBeNull();
    expect(state.responses).toEqual([]);
    expect(state.manualResponses).toEqual([]);
    expect(state.embeddings).toEqual([]);
    expect(state.similarityMatrix).toBeNull();
    expect(state.agreementStats).toBeNull();
    expect(state.metaAnalysis).toBeNull();
  });

  it('sets prompt', () => {
    store.getState().setPrompt('Test prompt');
    expect(store.getState().prompt).toBe('Test prompt');
  });

  it('starts streaming for a model', () => {
    store.getState().startStreaming('model-1', 'openai', 'gpt-4o');
    const responses = store.getState().responses;

    expect(responses).toHaveLength(1);
    expect(responses[0]?.modelId).toBe('model-1');
    expect(responses[0]?.isStreaming).toBe(true);
    expect(responses[0]?.isComplete).toBe(false);
    expect(responses[0]?.response).toBe('');
  });

  it('appends stream chunks', () => {
    store.getState().startStreaming('model-1', 'openai', 'gpt-4o');
    store.getState().appendStreamChunk('model-1', 'Hello ');
    store.getState().appendStreamChunk('model-1', 'World');

    const response = store.getState().responses[0];
    expect(response?.response).toBe('Hello World');
  });

  it('completes response', () => {
    store.getState().startStreaming('model-1', 'openai', 'gpt-4o');
    store.getState().appendStreamChunk('model-1', 'Test response');
    store.getState().completeResponse('model-1', 5000);

    const response = store.getState().responses[0];
    expect(response?.isStreaming).toBe(false);
    expect(response?.isComplete).toBe(true);
    expect(response?.responseTime).toBe(5000);
  });

  it('sets error for a model', () => {
    store.getState().startStreaming('model-1', 'openai', 'gpt-4o');
    store.getState().setError('model-1', 'Rate limit exceeded');

    const response = store.getState().responses[0];
    expect(response?.error).toBe('Rate limit exceeded');
    expect(response?.isStreaming).toBe(false);
    expect(response?.isComplete).toBe(true);
  });

  it('handles multiple models streaming', () => {
    store.getState().startStreaming('model-1', 'openai', 'gpt-4o');
    store.getState().startStreaming('model-2', 'anthropic', 'claude-3-5-sonnet');

    store.getState().appendStreamChunk('model-1', 'Response 1');
    store.getState().appendStreamChunk('model-2', 'Response 2');

    const responses = store.getState().responses;
    expect(responses).toHaveLength(2);
    expect(responses[0]?.response).toBe('Response 1');
    expect(responses[1]?.response).toBe('Response 2');
  });

  it('adds manual response', () => {
    store.getState().addManualResponse('User Response', 'This is manual input');

    const manualResponses = store.getState().manualResponses;
    expect(manualResponses).toHaveLength(1);
    expect(manualResponses[0]?.label).toBe('User Response');
    expect(manualResponses[0]?.response).toBe('This is manual input');
    expect(manualResponses[0]?.id).toBeTruthy();
  });

  it('removes manual response', () => {
    store.getState().addManualResponse('Test', 'Response');
    const id = store.getState().manualResponses[0]!.id;

    store.getState().removeManualResponse(id);
    expect(store.getState().manualResponses).toHaveLength(0);
  });

  it('sets embeddings', () => {
    const embeddings = [
      { modelId: 'model-1', embedding: Array.from({ length: 1536 }, () => 0.5) },
      { modelId: 'model-2', embedding: Array.from({ length: 1536 }, () => 0.6) },
    ];

    store.getState().setEmbeddings(embeddings);
    expect(store.getState().embeddings).toHaveLength(2);
  });

  it('calculates agreement with no embeddings', () => {
    store.getState().calculateAgreement();
    expect(store.getState().similarityMatrix).toBeNull();
    expect(store.getState().agreementStats).toBeNull();
  });

  it('calculates agreement with embeddings', () => {
    const embeddings = [
      { modelId: 'model-1', embedding: Array.from({ length: 1536 }, () => 0.5) },
      { modelId: 'model-2', embedding: Array.from({ length: 1536 }, () => 0.6) },
      { modelId: 'model-3', embedding: Array.from({ length: 1536 }, () => 0.7) },
    ];

    store.getState().setEmbeddings(embeddings);
    store.getState().calculateAgreement();

    const state = store.getState();
    expect(state.similarityMatrix).toBeTruthy();
    expect(state.similarityMatrix).toHaveLength(3);
    expect(state.agreementStats).toBeTruthy();
    expect(state.agreementStats?.mean).toBeGreaterThan(0);
    expect(state.agreementStats?.median).toBeGreaterThan(0);
  });

  it('sets meta-analysis', () => {
    store.getState().setMetaAnalysis('This is the meta-analysis');
    expect(store.getState().metaAnalysis).toBe('This is the meta-analysis');
  });

  it('clears all responses', () => {
    store.getState().setPrompt('Test prompt');
    store.getState().startStreaming('model-1', 'openai', 'gpt-4o');
    store.getState().addManualResponse('Test', 'Response');
    store.getState().setMetaAnalysis('Analysis');

    store.getState().clearResponses();

    const state = store.getState();
    expect(state.prompt).toBeNull();
    expect(state.responses).toEqual([]);
    expect(state.manualResponses).toEqual([]);
    expect(state.embeddings).toEqual([]);
    expect(state.similarityMatrix).toBeNull();
    expect(state.agreementStats).toBeNull();
    expect(state.metaAnalysis).toBeNull();
  });

  it('resets streaming state without clearing prompt', () => {
    store.getState().setPrompt('Persisted prompt');
    store.getState().startStreaming('model-1', 'openai', 'gpt-4o');
    store.getState().addManualResponse('Manual', 'Response');
    store.getState().setMetaAnalysis('Meta');

    store.getState().resetStreamingState();

    const state = store.getState();
    expect(state.prompt).toBe('Persisted prompt');
    expect(state.responses).toEqual([]);
    expect(state.manualResponses).toHaveLength(1);
    expect(state.embeddings).toEqual([]);
    expect(state.similarityMatrix).toBeNull();
    expect(state.agreementStats).toBeNull();
    expect(state.metaAnalysis).toBeNull();
  });

  it('restarts streaming for same model', () => {
    store.getState().startStreaming('model-1', 'openai', 'gpt-4o');
    store.getState().appendStreamChunk('model-1', 'First attempt');
    store.getState().setError('model-1', 'Error occurred');

    // Restart streaming
    store.getState().startStreaming('model-1', 'openai', 'gpt-4o');

    const response = store.getState().responses[0];
    expect(response?.isStreaming).toBe(true);
    expect(response?.isComplete).toBe(false);
    expect(response?.error).toBeNull();
    expect(store.getState().responses).toHaveLength(1);
  });
});
