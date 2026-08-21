import { describe, it, expect, beforeAll, afterEach, afterAll, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { BuilderWizard } from './BuilderWizard';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const draft = {
  id: 'draft-1',
  templateId: 'corporate-vertical',
  orientation: 'vertical',
  status: 'draft',
  firstName: '',
  styleOverrides: {},
};

const server = setupServer(
  http.get('/api/drafts/draft-1', () => HttpResponse.json(draft)),
  http.patch('/api/drafts/draft-1', async ({ request }) => {
    const patch = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({ ...draft, ...patch });
  }),
  http.post('/api/drafts/draft-1/submit', () => HttpResponse.json({ ...draft, status: 'submitted' }))
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('BuilderWizard', () => {
  it('loads the draft and renders the live preview', async () => {
    render(<BuilderWizard draftId="draft-1" />);
    await waitFor(() => expect(screen.getByText(/Job Title/)).toBeInTheDocument());
  });

  it('patches the draft when a field changes', async () => {
    render(<BuilderWizard draftId="draft-1" />);
    await waitFor(() => screen.getByLabelText('First name'));
    await userEvent.type(screen.getByLabelText('First name'), 'Juan');
    await waitFor(() => expect(screen.getByText('Juan Last Name')).toBeInTheDocument());
  });

  it('submits the draft and shows a confirmation state', async () => {
    render(<BuilderWizard draftId="draft-1" />);
    await waitFor(() => screen.getByRole('button', { name: /continue/i }));
    await userEvent.click(screen.getByRole('button', { name: /continue/i }));
    await waitFor(() => expect(screen.getByText(/submitted/i)).toBeInTheDocument());
  });

  it('does not corrupt draft state or crash when a PATCH fails validation', async () => {
    server.use(
      http.patch('/api/drafts/draft-1', () => HttpResponse.json({ error: 'Invalid' }, { status: 400 }))
    );
    render(<BuilderWizard draftId="draft-1" />);
    await waitFor(() => screen.getByLabelText('First name'));
    await userEvent.type(screen.getByLabelText('First name'), 'x');

    // The failed PATCH must not clobber `draft` with the { error } body — the
    // form and preview should still be rendered (no uncaught render-phase
    // exception from getTemplate(undefined) unmounting the tree).
    await waitFor(() => expect(screen.getByLabelText('First name')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument();
    expect(screen.getByText(/Job Title/)).toBeInTheDocument();
  });
});
