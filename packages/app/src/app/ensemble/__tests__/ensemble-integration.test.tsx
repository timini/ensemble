/**
 * Integration test for Ensemble page model selection
 * Tests that clicking model cards actually toggles selection state
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useStore } from '~/store';
import EnsemblePage from '../page';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('Ensemble Page - Model Selection Integration', () => {
  beforeEach(() => {
    // Reset store to initial state with API keys configured
    useStore.setState({
      mode: 'free',
      apiKeys: {
        openai: { key: 'sk-test-key', encrypted: null, visible: false },
        anthropic: { key: '', encrypted: null, visible: false },
        google: { key: '', encrypted: null, visible: false },
        xai: { key: '', encrypted: null, visible: false },
      },
      encryptionInitialized: true,
      selectedModels: [],
      summarizerModel: null,
      currentStep: 'ensemble',
      theme: 'light',
      language: 'en',
    });
  });

  it('should toggle model selection when clicking a model card', async () => {
    const user = userEvent.setup();
    const { container } = render(<EnsemblePage />);

    // Wait for page to render
    await waitFor(() => {
      expect(screen.getByTestId('model-selection-list')).toBeInTheDocument();
    });

    // Find the first model card (should be GPT-4o from OpenAI)
    const modelCard = container.querySelector('[data-testid^="model-card-"]');
    expect(modelCard).toBeInTheDocument();
    expect(modelCard).toHaveAttribute('data-selected', 'false');
    expect(modelCard).toHaveAttribute('data-disabled', 'false'); // Should not be disabled

    console.log('Before click - Store state:', useStore.getState().selectedModels);

    // Click the model card
    await user.click(modelCard!);

    console.log('After click - Store state:', useStore.getState().selectedModels);

    // Wait for state update
    await waitFor(() => {
      expect(modelCard).toHaveAttribute('data-selected', 'true');
    }, { timeout: 3000 });
  });

  it('should allow selecting multiple models', async () => {
    const user = userEvent.setup();
    const { container } = render(<EnsemblePage />);

    await waitFor(() => {
      expect(screen.getByTestId('model-selection-list')).toBeInTheDocument();
    });

    // Get first 3 model cards
    const modelCards = container.querySelectorAll('[data-testid^="model-card-"]');
    expect(modelCards.length).toBeGreaterThan(2);

    // Click first model
    await user.click(modelCards[0]!);
    await waitFor(() => {
      expect(modelCards[0]).toHaveAttribute('data-selected', 'true');
    });

    // Click second model
    await user.click(modelCards[1]!);
    await waitFor(() => {
      expect(modelCards[1]).toHaveAttribute('data-selected', 'true');
    });

    // Both should be selected
    expect(modelCards[0]).toHaveAttribute('data-selected', 'true');
    expect(modelCards[1]).toHaveAttribute('data-selected', 'true');
  });

  it('should enable Continue button after selecting 2 models', async () => {
    const user = userEvent.setup();
    const { container } = render(<EnsemblePage />);

    await waitFor(() => {
      expect(screen.getByTestId('model-selection-list')).toBeInTheDocument();
    });

    const continueButton = screen.getByRole('button', { name: /continue/i });
    expect(continueButton).toBeDisabled();

    // Select 2 models
    const modelCards = container.querySelectorAll('[data-testid^="model-card-"]');
    await user.click(modelCards[0]!);
    await user.click(modelCards[1]!);

    // Continue button should be enabled
    await waitFor(() => {
      expect(continueButton).toBeEnabled();
    });
  });
});
