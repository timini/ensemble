import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen } from '@testing-library/react';
import { ShareDialog, type ShareDialogProps } from './ShareDialog';
import { renderWithI18n } from '../../../lib/test-utils/i18n-test-wrapper';

const URL = 'https://ensemble.example.app/s/Qx3v9q2tKm7Pz1aB4cD8eF';

function setup(props: Partial<ShareDialogProps> = {}, language: 'en' | 'fr' = 'en') {
  const all: ShareDialogProps = {
    open: true,
    onOpenChange: vi.fn(),
    status: 'ready',
    url: URL,
    expiresOn: '18 December 2026',
    onCreate: vi.fn(),
    onDelete: vi.fn(),
    ...props,
  };
  renderWithI18n(<ShareDialog {...all} />, { language });
  return all;
}

afterEach(() => vi.useRealTimers());

describe('ShareDialog', () => {
  it('explains what a link shows before creating it, and creates it', () => {
    const props = setup({ status: 'create', url: undefined });
    const dialog = screen.getByTestId('share-dialog');
    expect(dialog).toHaveAttribute('data-status', 'create');
    expect(dialog).toHaveTextContent('Anyone with the link');
    expect(dialog).toHaveTextContent('30 days');
    expect(dialog).toHaveTextContent('API keys are never included');
    fireEvent.click(screen.getByTestId('share-create'));
    expect(props.onCreate).toHaveBeenCalledOnce();
  });

  it('disables Create link while creating', () => {
    setup({ status: 'creating', url: undefined });
    expect(screen.getByTestId('share-create')).toBeDisabled();
  });

  it('shows the link read only with its expiry, and copies it', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    const props = setup({ onCopy: vi.fn() });
    const input = screen.getByTestId('share-url');
    expect(input).toHaveValue(URL);
    expect(input).toHaveAttribute('readonly');
    expect(screen.getByTestId('share-expiry')).toHaveTextContent('18 December 2026');
    await act(async () => {
      fireEvent.click(screen.getByTestId('share-copy'));
    });
    expect(writeText).toHaveBeenCalledWith(URL);
    expect(props.onCopy).toHaveBeenCalledOnce();
    expect(screen.getByTestId('share-copy')).toHaveTextContent('Copied');
  });

  it('deletes the link', () => {
    const props = setup();
    fireEvent.click(screen.getByTestId('share-delete'));
    expect(props.onDelete).toHaveBeenCalledOnce();
  });

  it('keeps the link on screen when deleting it failed', () => {
    setup({ status: 'ready', error: 'failed' });
    expect(screen.getByTestId('share-url')).toHaveValue(URL);
    expect(screen.getByTestId('share-error')).toHaveTextContent('Could not create or delete the link');
  });

  it('disables Delete link while deleting', () => {
    setup({ status: 'deleting' });
    expect(screen.getByTestId('share-delete')).toBeDisabled();
  });

  it('says why creating failed and offers to try again', () => {
    const props = setup({ status: 'error', error: 'limit', url: undefined });
    expect(screen.getByTestId('share-error')).toHaveTextContent('too many links');
    fireEvent.click(screen.getByTestId('share-create'));
    expect(props.onCreate).toHaveBeenCalledOnce();
  });

  it('shows a busy state while loading', () => {
    setup({ status: 'loading', url: undefined });
    expect(screen.getByTestId('share-dialog')).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByTestId('share-create')).not.toBeInTheDocument();
  });

  it('is in French', () => {
    setup({ status: 'create', url: undefined }, 'fr');
    expect(screen.getByRole('heading', { name: 'Partager cette exécution' })).toBeInTheDocument();
    expect(screen.getByTestId('share-create')).toHaveTextContent('Créer le lien');
  });
});
