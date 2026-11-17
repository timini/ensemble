import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EndpointLogo, ENDPOINT_LOGO_PRESETS } from './EndpointLogo';

describe('EndpointLogo', () => {
  it.each(ENDPOINT_LOGO_PRESETS)('renders an SVG logo for %s', (preset) => {
    render(<EndpointLogo preset={preset} />);
    const logo = screen.getByTestId(`endpoint-logo-${preset}`);
    expect(logo.querySelector('svg')).toBeInTheDocument();
    expect(logo).toHaveAttribute('data-preset', preset);
  });

  it('covers every endpoint preset, including Custom', () => {
    expect(ENDPOINT_LOGO_PRESETS).toEqual([
      'ollama',
      'lmstudio',
      'llamacpp',
      'vllm',
      'openrouter',
      'groq',
      'together',
      'custom',
    ]);
  });

  it('uses the Custom logo for an unknown preset', () => {
    render(<EndpointLogo preset={'mystery' as never} />);
    expect(screen.getByTestId('endpoint-logo-mystery').querySelector('svg')).toBeInTheDocument();
  });

  it('applies the size and an accessible label', () => {
    render(<EndpointLogo preset="ollama" size="lg" />);
    const logo = screen.getByRole('img', { name: 'Ollama logo' });
    expect(logo).toHaveAttribute('data-size', 'lg');
  });

  it('names the Custom logo with the translated label', () => {
    render(<EndpointLogo preset="custom" />);
    expect(screen.getByRole('img', { name: 'Custom logo' })).toBeInTheDocument();
  });
});

describe('EndpointLogo titles', () => {
  it('drops the SVG title so the name is not read twice', () => {
    render(<EndpointLogo preset="ollama" />);
    expect(screen.getByTestId('endpoint-logo-ollama').querySelector('title')).toBeNull();
  });
});
