import type { Meta, StoryObj } from '@storybook/react';
import { OllamaDetectedNotice } from './OllamaDetectedNotice';

const meta = {
  title: 'Molecules/OllamaDetectedNotice',
  component: OllamaDetectedNotice,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  args: {
    state: 'found',
    chatModels: ['llama3.2:3b', 'qwen3:4b', 'gemma3:4b'],
    embeddingModel: 'nomic-embed-text:latest',
    embeddingPullCommand: 'ollama pull nomic-embed-text',
    chatPullCommand: 'ollama pull llama3.2:3b',
    hosted: false,
    localRunCommand: 'npm run local',
    probeUrl: 'http://localhost:11434',
    guideUrl: 'https://github.com/timini/ensemble/blob/main/docs/LOCAL_MODELS.md',
    onAdd: () => {},
    onCheck: () => {},
    onDismiss: () => {},
  },
} satisfies Meta<typeof OllamaDetectedNotice>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Ollama answered with chat models and an embedding model: one click adds it. */
export const Found: Story = {};

/** Ollama answered but has no embedding model: the pull command is shown. */
export const FoundWithoutEmbeddingModel: Story = { args: { embeddingModel: undefined } };

/** Ollama answered with no chat models installed. */
export const FoundWithoutChatModels: Story = { args: { chatModels: [] } };

/** On the hosted site, before the browser has local network permission: the user starts the check. */
export const Ask: Story = { args: { state: 'ask', hosted: true } };

/** The check is running. */
export const Checking: Story = { args: { state: 'checking', hosted: true } };

/** The user asked, and Ollama did not answer the hosted site. */
export const NotFoundHosted: Story = { args: { state: 'notFound', hosted: true } };

/** The user asked, and Ollama did not answer a local copy of the app. */
export const NotFoundLocal: Story = { args: { state: 'notFound', hosted: false } };
