import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EmbeddingsProviderSelector } from './EmbeddingsProviderSelector';
import { renderWithI18n } from '../../../lib/test-utils/i18n-test-wrapper';

const both = { openai: true, google: true };

describe('EmbeddingsProviderSelector', () => {
  it('renders the three options with a heading', () => {
    render(
      <EmbeddingsProviderSelector
        value="auto"
        available={both}
        activeProvider="openai"
        onChange={vi.fn()}
      />,
    );

    expect(
      screen.getByRole('heading', { name: 'Embeddings provider', level: 4 }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('embeddings-provider-option-auto')).toBeChecked();
    expect(screen.getByTestId('embeddings-provider-option-openai')).not.toBeChecked();
    expect(screen.getByTestId('embeddings-provider-option-google')).not.toBeChecked();
  });

  it('calls onChange with the chosen provider', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <EmbeddingsProviderSelector
        value="auto"
        available={both}
        activeProvider="openai"
        onChange={onChange}
      />,
    );

    await user.click(screen.getByTestId('embeddings-provider-option-google'));
    expect(onChange).toHaveBeenCalledWith('google');
  });

  it('disables providers without a valid key', () => {
    render(
      <EmbeddingsProviderSelector
        value="auto"
        available={{ openai: false, google: true }}
        activeProvider="google"
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByTestId('embeddings-provider-option-openai')).toBeDisabled();
    expect(screen.getByTestId('embeddings-provider-option-google')).toBeEnabled();
    expect(screen.getByTestId('embeddings-provider-openai-missing')).toHaveTextContent(
      'No valid key',
    );
  });

  it('names the provider that will be used', () => {
    render(
      <EmbeddingsProviderSelector
        value="auto"
        available={{ openai: false, google: true }}
        activeProvider="google"
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByTestId('embeddings-provider-active')).toHaveTextContent('Google');
  });

  it('warns when no provider is available', () => {
    render(
      <EmbeddingsProviderSelector
        value="auto"
        available={{ openai: false, google: false }}
        activeProvider={null}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByTestId('embeddings-provider-none')).toHaveTextContent(
      'No agreement score',
    );
    expect(screen.queryByTestId('embeddings-provider-active')).not.toBeInTheDocument();
  });

  it('renders French text', () => {
    renderWithI18n(
      <EmbeddingsProviderSelector
        value="auto"
        available={both}
        activeProvider="openai"
        onChange={vi.fn()}
      />,
      { language: 'fr' },
    );

    expect(
      screen.getByRole('heading', { name: "Fournisseur d'embeddings", level: 4 }),
    ).toBeInTheDocument();
  });
});
