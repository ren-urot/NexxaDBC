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

  it('keeps every character when typing an email the server rejects until complete', async () => {
    // Mirrors the real API: every partial value ("j", "ju", …) fails email
    // validation and 400s. Typing must still be preserved character by
    // character rather than being reverted by the rejected round-trips.
    server.use(
      http.patch('/api/drafts/draft-1', async ({ request }) => {
        const patch = (await request.json()) as Record<string, unknown>;
        const email = patch.email;
        if (typeof email === 'string' && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
          return HttpResponse.json({ error: 'Invalid' }, { status: 400 });
        }
        return HttpResponse.json({ ...draft, ...patch });
      })
    );

    render(<BuilderWizard draftId="draft-1" />);
    await waitFor(() => screen.getByLabelText('Email'));
    const emailInput = screen.getByLabelText('Email') as HTMLInputElement;

    // Character by character — not a single fireEvent.change with the whole value.
    await userEvent.type(emailInput, 'juan@abc.com');

    await waitFor(() => expect(emailInput.value).toBe('juan@abc.com'));
    expect(emailInput.value).toBe('juan@abc.com');
  });

  it('keeps every character of a name typed one key at a time', async () => {
    render(<BuilderWizard draftId="draft-1" />);
    await waitFor(() => screen.getByLabelText('First name'));
    const firstName = screen.getByLabelText('First name') as HTMLInputElement;

    await userEvent.type(firstName, 'Juan');

    await waitFor(() => expect(screen.getByText('Juan Last Name')).toBeInTheDocument());
    expect(firstName.value).toBe('Juan');
  });

  it('shows a not-found state instead of crashing when the draft fetch fails', async () => {
    server.use(
      http.get('/api/drafts/draft-1', () => HttpResponse.json({ error: 'Not found' }, { status: 404 }))
    );
    render(<BuilderWizard draftId="draft-1" />);
    await waitFor(() => expect(screen.getByText(/couldn't find that card/i)).toBeInTheDocument());
  });

  it('surfaces a visible error when a patch is rejected', async () => {
    server.use(
      http.patch('/api/drafts/draft-1', () => HttpResponse.json({ error: 'Invalid' }, { status: 400 }))
    );
    render(<BuilderWizard draftId="draft-1" />);
    await waitFor(() => screen.getByLabelText('First name'));
    await userEvent.type(screen.getByLabelText('First name'), 'x');
    await waitFor(() => expect(screen.getByText(/couldn't save your latest changes/i)).toBeInTheDocument());
  });

  it('lets Continue succeed after typing into an optional URL field and clearing it back out', async () => {
    // Regression: InfoForm queues { website: '' } once the field is cleared.
    // The old cardDataPartialSchema treated '' as an invalid URL (only
    // `undefined` satisfied `.optional()`), so the PATCH 400ed, the failed
    // patch stayed in pendingRef forever, and every future flushPending()
    // (including the one handleSubmit awaits) failed the same way — Continue
    // never worked again for that draft session.
    server.use(
      http.patch('/api/drafts/draft-1', async ({ request }) => {
        const patch = (await request.json()) as Record<string, unknown>;
        if (patch.website === '') {
          return HttpResponse.json({ ...draft, website: null });
        }
        return HttpResponse.json({ ...draft, ...patch });
      })
    );

    render(<BuilderWizard draftId="draft-1" />);
    await waitFor(() => screen.getByLabelText('Website'));
    const website = screen.getByLabelText('Website') as HTMLInputElement;

    await userEvent.type(website, 'https://abc.com');
    await waitFor(() => expect(website.value).toBe('https://abc.com'));

    await userEvent.clear(website);
    await waitFor(() => expect(website.value).toBe(''));

    await userEvent.click(screen.getByRole('button', { name: /continue/i }));
    await waitFor(() => expect(screen.getByText(/submitted/i)).toBeInTheDocument());
  });

  it('never sends a PATCH for a required field cleared to empty, and resumes persisting once retyped', async () => {
    // Regression, same shape as the optional-field fix in 2f6ca93 but one
    // layer upstream: firstName is `z.string().min(1)` with no `.optional()`,
    // so '' is correctly rejected by the schema. If InfoForm's onChange
    // queued { firstName: '' } anyway, the PATCH would 400, the failed patch
    // would sit in pendingRef forever, and every later flush (including the
    // one handleSubmit awaits) would resend the same doomed patch — Continue
    // would never work again for that draft session. Assert the PATCH for
    // the empty value is never sent at all, rather than asserting on the
    // 400/stuck-state symptom.
    const patchBodies: Record<string, unknown>[] = [];
    server.use(
      http.patch('/api/drafts/draft-1', async ({ request }) => {
        const patch = (await request.json()) as Record<string, unknown>;
        patchBodies.push(patch);
        // Mirror the real schema: a PATCH containing an empty firstName 400s.
        if (patch.firstName === '') {
          return HttpResponse.json({ error: 'Invalid' }, { status: 400 });
        }
        return HttpResponse.json({ ...draft, ...patch });
      })
    );

    render(<BuilderWizard draftId="draft-1" />);
    await waitFor(() => screen.getByLabelText('First name'));
    const firstName = screen.getByLabelText('First name') as HTMLInputElement;

    await userEvent.type(firstName, 'Juan');
    await waitFor(() => expect(patchBodies.some(p => p.firstName === 'Juan')).toBe(true));

    await userEvent.clear(firstName);
    // The field itself still shows empty — InfoForm's local state is
    // unaffected by what gets sent upstream.
    await waitFor(() => expect(firstName.value).toBe(''));

    // Give the debounce timer (300ms) a full window to fire before asserting
    // the negative — nothing should ever be sent for the empty value.
    await new Promise(resolve => setTimeout(resolve, 500));
    expect(patchBodies.some(p => p.firstName === '')).toBe(false);

    // No stuck pending/failed patch: retyping resumes normal persistence.
    await userEvent.type(firstName, 'Maria');
    await waitFor(() => expect(patchBodies.some(p => p.firstName === 'Maria')).toBe(true));

    // And Continue isn't wedged by any leftover failed-patch state.
    await userEvent.click(screen.getByRole('button', { name: /continue/i }));
    await waitFor(() => expect(screen.getByText(/submitted/i)).toBeInTheDocument());
  }, 10000);

  it('hides the logo upload field for a template that never renders a logo', async () => {
    server.use(
      http.get('/api/drafts/draft-1', () =>
        HttpResponse.json({ ...draft, templateId: 'minimal-vertical' })
      )
    );
    render(<BuilderWizard draftId="draft-1" />);
    await waitFor(() => screen.getByLabelText('First name'));
    expect(screen.queryByLabelText('Company logo')).not.toBeInTheDocument();
  });
});
