import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InstallAppButton } from './InstallAppButton';

function dispatchBeforeInstallPrompt(overrides: { prompt?: () => Promise<void> } = {}) {
  const event = new Event('beforeinstallprompt', { cancelable: true }) as Event & {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
  };
  event.prompt = overrides.prompt ?? vi.fn().mockResolvedValue(undefined);
  event.userChoice = Promise.resolve({ outcome: 'accepted' });
  window.dispatchEvent(event);
  return event;
}

describe('InstallAppButton', () => {
  it('renders nothing until the browser signals the app is installable', () => {
    render(<InstallAppButton />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('shows the button after beforeinstallprompt fires, and calls prompt() on click', async () => {
    render(<InstallAppButton />);
    const prompt = vi.fn().mockResolvedValue(undefined);
    dispatchBeforeInstallPrompt({ prompt });

    const button = await screen.findByRole('button', { name: /save dbc on phone/i });
    await userEvent.click(button);
    expect(prompt).toHaveBeenCalled();
  });

  it('hides the button once appinstalled fires', async () => {
    render(<InstallAppButton />);
    dispatchBeforeInstallPrompt();
    await screen.findByRole('button', { name: /save dbc on phone/i });

    act(() => {
      window.dispatchEvent(new Event('appinstalled'));
    });
    await waitFor(() => expect(screen.queryByRole('button')).not.toBeInTheDocument());
  });
});
