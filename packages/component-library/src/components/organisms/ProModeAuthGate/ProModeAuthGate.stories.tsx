import type { Meta, StoryObj } from '@storybook/react';
import { ProModeAuthGate } from './ProModeAuthGate';

const meta = {
  title: 'Organisms/ProModeAuthGate',
  component: ProModeAuthGate,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof ProModeAuthGate>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Unauthenticated: Story = {
  args: {
    authStatus: 'unauthenticated',
    onSignInWithGoogle: () => console.log('Sign in with Google'),
    onSignInWithGitHub: () => console.log('Sign in with GitHub'),
    onSignOut: () => console.log('Sign out'),
  },
};

export const Loading: Story = {
  args: {
    authStatus: 'loading',
    onSignInWithGoogle: () => console.log('Sign in with Google'),
    onSignInWithGitHub: () => console.log('Sign in with GitHub'),
    onSignOut: () => console.log('Sign out'),
  },
};

export const AuthenticatedWithPhoto: Story = {
  args: {
    authStatus: 'authenticated',
    user: {
      displayName: 'Jane Doe',
      email: 'jane@example.com',
      photoURL: 'https://i.pravatar.cc/150?u=jane',
    },
    onSignInWithGoogle: () => console.log('Sign in with Google'),
    onSignInWithGitHub: () => console.log('Sign in with GitHub'),
    onSignOut: () => console.log('Sign out'),
  },
};

export const AuthenticatedWithoutPhoto: Story = {
  args: {
    authStatus: 'authenticated',
    user: {
      displayName: 'John Smith',
      email: 'john@example.com',
      photoURL: null,
    },
    onSignInWithGoogle: () => console.log('Sign in with Google'),
    onSignInWithGitHub: () => console.log('Sign in with GitHub'),
    onSignOut: () => console.log('Sign out'),
  },
};

export const AuthenticatedEmailOnly: Story = {
  args: {
    authStatus: 'authenticated',
    user: {
      displayName: null,
      email: 'user@example.com',
      photoURL: null,
    },
    onSignInWithGoogle: () => console.log('Sign in with Google'),
    onSignInWithGitHub: () => console.log('Sign in with GitHub'),
    onSignOut: () => console.log('Sign out'),
  },
};
