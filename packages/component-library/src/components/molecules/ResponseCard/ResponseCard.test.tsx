import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ResponseCard } from './ResponseCard';
import { renderWithI18n } from '../../../lib/test-utils/i18n-test-wrapper';

describe('ResponseCard', () => {
  describe('rendering', () => {
    it('renders model name for AI responses', () => {
      render(
        <ResponseCard
          modelName="GPT-4"
          provider="openai"
          status="complete"
          responseType="ai"
          content="Test response"
        />
      );
      expect(screen.getByText('GPT-4')).toBeInTheDocument();
    });

    it('renders provider badge for AI responses', () => {
      render(
        <ResponseCard
          modelName="GPT-4"
          provider="openai"
          status="complete"
          responseType="ai"
          content="Test response"
        />
      );
      expect(screen.getByText('OpenAI')).toBeInTheDocument();
    });

    it('renders response content when complete', () => {
      render(
        <ResponseCard
          modelName="GPT-4"
          provider="openai"
          status="complete"
          responseType="ai"
          content="This is the response content"
        />
      );
      expect(screen.getByText('This is the response content')).toBeInTheDocument();
    });

    it('renders error message when status is error', () => {
      render(
        <ResponseCard
          modelName="GPT-4"
          provider="openai"
          status="error"
          responseType="ai"
          error="Network error"
        />
      );
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });

    it('renders manual indicator for manual responses', () => {
      render(
        <ResponseCard
          status="complete"
          responseType="manual"
          content="Manual response"
        />
      );
      expect(screen.getByText('Manual')).toBeInTheDocument();
    });

    it('does not render model name for manual responses', () => {
      render(
        <ResponseCard
          status="complete"
          responseType="manual"
          content="Manual response"
        />
      );
      expect(screen.queryByText(/GPT|Claude|Gemini|Grok/)).not.toBeInTheDocument();
    });
  });

  describe('streaming state', () => {
    it('shows loading spinner when streaming', () => {
      const { container } = render(
        <ResponseCard
          modelName="GPT-4"
          provider="openai"
          status="streaming"
          responseType="ai"
          content="Streaming..."
        />
      );
      const spinner = container.querySelector('[data-testid="loading-spinner"]');
      expect(spinner).toBeInTheDocument();
    });

    it('shows streaming indicator badge', () => {
      render(
        <ResponseCard
          modelName="GPT-4"
          provider="openai"
          status="streaming"
          responseType="ai"
          content="Streaming..."
        />
      );
      expect(screen.getByText('Streaming')).toBeInTheDocument();
    });

    it('applies streaming data attribute', () => {
      const { container } = render(
        <ResponseCard
          modelName="GPT-4"
          provider="openai"
          status="streaming"
          responseType="ai"
          content="Streaming..."
        />
      );
      const card = container.querySelector('[data-status="streaming"]');
      expect(card).toBeInTheDocument();
    });

    it('displays partial content while streaming', () => {
      render(
        <ResponseCard
          modelName="GPT-4"
          provider="openai"
          status="streaming"
          responseType="ai"
          content="This is partial content..."
        />
      );
      expect(screen.getByText('This is partial content...')).toBeInTheDocument();
    });
  });

  describe('complete state', () => {
    it('shows full content when complete', () => {
      render(
        <ResponseCard
          modelName="GPT-4"
          provider="openai"
          status="complete"
          responseType="ai"
          content="This is the complete response"
        />
      );
      expect(screen.getByText('This is the complete response')).toBeInTheDocument();
    });

    it('does not show loading spinner when complete', () => {
      const { container } = render(
        <ResponseCard
          modelName="GPT-4"
          provider="openai"
          status="complete"
          responseType="ai"
          content="Complete"
        />
      );
      const spinner = container.querySelector('[data-testid="loading-spinner"]');
      expect(spinner).not.toBeInTheDocument();
    });

    it('applies complete data attribute', () => {
      const { container } = render(
        <ResponseCard
          modelName="GPT-4"
          provider="openai"
          status="complete"
          responseType="ai"
          content="Complete"
        />
      );
      const card = container.querySelector('[data-status="complete"]');
      expect(card).toBeInTheDocument();
    });

    it('does not show streaming indicator when complete', () => {
      render(
        <ResponseCard
          modelName="GPT-4"
          provider="openai"
          status="complete"
          responseType="ai"
          content="Complete"
        />
      );
      expect(screen.queryByText('Streaming')).not.toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('shows error message', () => {
      render(
        <ResponseCard
          modelName="GPT-4"
          provider="openai"
          status="error"
          responseType="ai"
          error="API error occurred"
        />
      );
      expect(screen.getByText('API error occurred')).toBeInTheDocument();
    });

    it('applies error data attribute', () => {
      const { container } = render(
        <ResponseCard
          modelName="GPT-4"
          provider="openai"
          status="error"
          responseType="ai"
          error="Error"
        />
      );
      const card = container.querySelector('[data-status="error"]');
      expect(card).toBeInTheDocument();
    });

    it('does not show content when error', () => {
      render(
        <ResponseCard
          modelName="GPT-4"
          provider="openai"
          status="error"
          responseType="ai"
          content="Should not appear"
          error="Error occurred"
        />
      );
      expect(screen.queryByText('Should not appear')).not.toBeInTheDocument();
    });

    it('does not show loading spinner when error', () => {
      const { container } = render(
        <ResponseCard
          modelName="GPT-4"
          provider="openai"
          status="error"
          responseType="ai"
          error="Error"
        />
      );
      const spinner = container.querySelector('[data-testid="loading-spinner"]');
      expect(spinner).not.toBeInTheDocument();
    });
  });

  describe('response type', () => {
    it('indicates AI response type', () => {
      const { container } = render(
        <ResponseCard
          modelName="GPT-4"
          provider="openai"
          status="complete"
          responseType="ai"
          content="AI response"
        />
      );
      const card = container.querySelector('[data-response-type="ai"]');
      expect(card).toBeInTheDocument();
    });

    it('indicates manual response type', () => {
      const { container } = render(
        <ResponseCard
          status="complete"
          responseType="manual"
          content="Manual response"
        />
      );
      const card = container.querySelector('[data-response-type="manual"]');
      expect(card).toBeInTheDocument();
    });

    it('shows provider for AI responses', () => {
      render(
        <ResponseCard
          modelName="GPT-4"
          provider="openai"
          status="complete"
          responseType="ai"
          content="Response"
        />
      );
      expect(screen.getByText('OpenAI')).toBeInTheDocument();
    });

    it('does not show provider for manual responses', () => {
      render(
        <ResponseCard
          status="complete"
          responseType="manual"
          content="Response"
        />
      );
      expect(screen.queryByText(/OpenAI|Anthropic|Google|XAI/)).not.toBeInTheDocument();
    });
  });

  describe('provider-specific rendering', () => {
    it('renders OpenAI provider correctly', () => {
      render(
        <ResponseCard
          modelName="GPT-4"
          provider="openai"
          status="complete"
          responseType="ai"
          content="Response"
        />
      );
      expect(screen.getByText('OpenAI')).toBeInTheDocument();
    });

    it('renders Anthropic provider correctly', () => {
      render(
        <ResponseCard
          modelName="Claude 3.5"
          provider="anthropic"
          status="complete"
          responseType="ai"
          content="Response"
        />
      );
      expect(screen.getByText('Anthropic')).toBeInTheDocument();
      expect(screen.getByTestId('model-logo-anthropic')).toHaveAttribute('data-logo-key', 'claude');
    });

    it('renders Google provider correctly', () => {
      render(
        <ResponseCard
          modelName="Gemini"
          provider="google"
          status="complete"
          responseType="ai"
          content="Response"
        />
      );
      expect(screen.getByText('Google')).toBeInTheDocument();
      expect(screen.getByTestId('model-logo-google')).toHaveAttribute('data-logo-key', 'gemini');
    });

    it('renders XAI provider correctly', () => {
      render(
        <ResponseCard
          modelName="Grok"
          provider="xai"
          status="complete"
          responseType="ai"
          content="Response"
        />
      );
      expect(screen.getByText('XAI')).toBeInTheDocument();
      expect(screen.getByTestId('model-logo-xai')).toHaveAttribute('data-logo-key', 'grok');
    });
  });

  describe('accessibility', () => {
    it('has appropriate role for card', () => {
      const { container } = render(
        <ResponseCard
          modelName="GPT-4"
          provider="openai"
          status="complete"
          responseType="ai"
          content="Response"
        />
      );
      const card = container.querySelector('[role="article"]');
      expect(card).toBeInTheDocument();
    });

    it('has aria-busy when streaming', () => {
      const { container } = render(
        <ResponseCard
          modelName="GPT-4"
          provider="openai"
          status="streaming"
          responseType="ai"
          content="Streaming..."
        />
      );
      const card = container.querySelector('[aria-busy="true"]');
      expect(card).toBeInTheDocument();
    });

    it('does not have aria-busy when complete', () => {
      const { container } = render(
        <ResponseCard
          modelName="GPT-4"
          provider="openai"
          status="complete"
          responseType="ai"
          content="Complete"
        />
      );
      const card = container.querySelector('[aria-busy]');
      expect(card).not.toBeInTheDocument();
    });

    it('links error message with aria-describedby', () => {
      render(
        <ResponseCard
          modelName="GPT-4"
          provider="openai"
          status="error"
          responseType="ai"
          error="Error message"
        />
      );
      const errorElement = screen.getByText('Error message').closest('[role="alert"]');
      expect(errorElement).toBeInTheDocument();
    });
  });

  describe('composition', () => {
    it('uses Card atom for structure', () => {
      const { container } = render(
        <ResponseCard
          modelName="GPT-4"
          provider="openai"
          status="complete"
          responseType="ai"
          content="Response"
        />
      );
      expect(container.firstChild).toBeInTheDocument();
    });

    it('uses Badge atom for provider', () => {
      render(
        <ResponseCard
          modelName="GPT-4"
          provider="openai"
          status="complete"
          responseType="ai"
          content="Response"
        />
      );
      expect(screen.getByText('OpenAI')).toBeInTheDocument();
    });

    it('uses LoadingSpinner atom when streaming', () => {
      const { container } = render(
        <ResponseCard
          modelName="GPT-4"
          provider="openai"
          status="streaming"
          responseType="ai"
          content="Streaming..."
        />
      );
      const spinner = container.querySelector('[data-testid="loading-spinner"]');
      expect(spinner).toBeInTheDocument();
    });

    it('uses InlineAlert atom for errors', () => {
      const { container } = render(
        <ResponseCard
          modelName="GPT-4"
          provider="openai"
          status="error"
          responseType="ai"
          error="Error message"
        />
      );
      const alert = container.querySelector('[role="alert"]');
      expect(alert).toBeInTheDocument();
    });
  });

  describe('internationalization', () => {
    it('renders manual badge in English', () => {
      renderWithI18n(<ResponseCard status="complete" responseType="manual" content="Manual response" />, { language: 'en' });
      expect(screen.getByText('Manual')).toBeInTheDocument();
    });

    it('renders manual badge in French', () => {
      renderWithI18n(<ResponseCard status="complete" responseType="manual" content="Manual response" />, { language: 'fr' });
      expect(screen.getByText('Manuel')).toBeInTheDocument();
    });

    it('renders streaming badge in English', () => {
      renderWithI18n(<ResponseCard modelName="GPT-4" provider="openai" status="streaming" responseType="ai" content="Streaming..." />, { language: 'en' });
      expect(screen.getByText('Streaming')).toBeInTheDocument();
    });

    it('renders streaming badge in French', () => {
      renderWithI18n(<ResponseCard modelName="GPT-4" provider="openai" status="streaming" responseType="ai" content="Streaming..." />, { language: 'fr' });
      expect(screen.getByText('Diffusion en cours')).toBeInTheDocument();
    });

    it('renders collapse button in English', () => {
      renderWithI18n(<ResponseCard modelName="GPT-4" provider="openai" status="complete" responseType="ai" content="Complete" />, { language: 'en' });
      expect(screen.getByText('Collapse')).toBeInTheDocument();
    });

    it('renders collapse button in French', () => {
      renderWithI18n(<ResponseCard modelName="GPT-4" provider="openai" status="complete" responseType="ai" content="Complete" />, { language: 'fr' });
      expect(screen.getByText('Réduire')).toBeInTheDocument();
    });

    it('renders expand button in English', () => {
      renderWithI18n(<ResponseCard modelName="GPT-4" provider="openai" status="complete" responseType="ai" content="Complete" defaultExpanded={false} />, { language: 'en' });
      expect(screen.getByText('Expand')).toBeInTheDocument();
    });

    it('renders expand button in French', () => {
      renderWithI18n(<ResponseCard modelName="GPT-4" provider="openai" status="complete" responseType="ai" content="Complete" defaultExpanded={false} />, { language: 'fr' });
      expect(screen.getByText('Développer')).toBeInTheDocument();
    });

    it('renders copy button in English', () => {
      renderWithI18n(<ResponseCard modelName="GPT-4" provider="openai" status="complete" responseType="ai" content="Complete" />, { language: 'en' });
      expect(screen.getByText('Copy')).toBeInTheDocument();
    });

    it('renders copy button in French', () => {
      renderWithI18n(<ResponseCard modelName="GPT-4" provider="openai" status="complete" responseType="ai" content="Complete" />, { language: 'fr' });
      expect(screen.getByText('Copier')).toBeInTheDocument();
    });

    it('renders rate response label in English', () => {
      renderWithI18n(<ResponseCard modelName="GPT-4" provider="openai" status="complete" responseType="ai" content="Complete" />, { language: 'en' });
      expect(screen.getByText('Rate response:')).toBeInTheDocument();
    });

    it('renders rate response label in French', () => {
      renderWithI18n(<ResponseCard modelName="GPT-4" provider="openai" status="complete" responseType="ai" content="Complete" />, { language: 'fr' });
      expect(screen.getByText('Évaluer la réponse :')).toBeInTheDocument();
    });

    it('renders response time in English', () => {
      renderWithI18n(<ResponseCard modelName="GPT-4" provider="openai" status="complete" responseType="ai" content="Complete" responseTime="1568ms" />, { language: 'en' });
      expect(screen.getByText('Response time: 1568ms')).toBeInTheDocument();
    });

    it('renders response time in French', () => {
      renderWithI18n(<ResponseCard modelName="GPT-4" provider="openai" status="complete" responseType="ai" content="Complete" responseTime="1568ms" />, { language: 'fr' });
      expect(screen.getByText('Temps de réponse : 1568ms')).toBeInTheDocument();
    });
  });
});
