'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { InfoForm } from './InfoForm';
import { CustomizePanel } from './CustomizePanel';
import { LivePreview } from './LivePreview';
import { templates } from '@/lib/templates/registry';
import type { CardData, StyleOverrides, TemplateDefinition } from '@/lib/templates/types';

/**
 * How long to wait after the last keystroke before persisting. Long enough to
 * collapse a burst of typing into one PATCH, short enough that the preview
 * (which shows confirmed server state merged with pending local edits) and the
 * saved draft stay in step.
 */
const PATCH_DEBOUNCE_MS = 300;

interface DraftState {
  id: string;
  templateId: string;
  status: string;
  styleOverrides: StyleOverrides;
  [key: string]: unknown;
}

type PatchBody = Partial<CardData> & { styleOverrides?: StyleOverrides };

function mergePatch(current: PatchBody, patch: PatchBody): PatchBody {
  const next: PatchBody = { ...current, ...patch };
  if (patch.styleOverrides) {
    next.styleOverrides = { ...current.styleOverrides, ...patch.styleOverrides };
  }
  return next;
}

/**
 * Drop from the pending set every key the server has just confirmed, but only
 * when the local value is still the one we sent. Anything the user changed
 * while the request was in flight stays pending so a slow response can never
 * stomp newer local edits.
 */
function dropConfirmed(current: PatchBody, sent: PatchBody): PatchBody {
  const next = { ...current } as Record<string, unknown>;
  const sentRecord = sent as Record<string, unknown>;

  for (const key of Object.keys(sentRecord)) {
    if (key === 'styleOverrides') continue;
    if (next[key] === sentRecord[key]) delete next[key];
  }

  if (sent.styleOverrides && current.styleOverrides) {
    const style = { ...current.styleOverrides } as Record<string, unknown>;
    const sentStyle = sent.styleOverrides as Record<string, unknown>;
    for (const key of Object.keys(sentStyle)) {
      if (style[key] === sentStyle[key]) delete style[key];
    }
    if (Object.keys(style).length === 0) delete next.styleOverrides;
    else next.styleOverrides = style;
  }

  return next as PatchBody;
}

function findTemplate(id: string): TemplateDefinition | null {
  return templates.find(t => t.id === id) ?? null;
}

export function BuilderWizard({ draftId }: { draftId: string }) {
  const router = useRouter();
  const [draft, setDraft] = useState<DraftState | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  // Locally-typed values not yet confirmed by the server, merged over `draft`
  // for the preview so it tracks typing without waiting for the round-trip.
  const [pending, setPending] = useState<PatchBody>({});
  const [error, setError] = useState<string | null>(null);

  const pendingRef = useRef<PatchBody>({});
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Monotonic request counter: a response from anything but the newest PATCH
  // is ignored, so out-of-order responses cannot roll state backwards.
  const seqRef = useRef(0);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(`/api/drafts/${draftId}`);
        if (!res.ok) {
          if (!cancelled) setLoadFailed(true);
          return;
        }
        const body = await res.json();
        if (cancelled) return;
        // A body without a templateId is not a draft (e.g. an error payload) —
        // rendering it would blow up in getTemplate(undefined).
        if (!body || typeof body.templateId !== 'string') {
          setLoadFailed(true);
          return;
        }
        setDraft(body as DraftState);
      } catch {
        if (!cancelled) setLoadFailed(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [draftId]);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    []
  );

  const flushPending = useCallback(async (): Promise<boolean> => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    const snapshot = pendingRef.current;
    if (Object.keys(snapshot).length === 0) return true;

    const seq = ++seqRef.current;

    let res: Response;
    try {
      res = await fetch(`/api/drafts/${draftId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(snapshot),
      });
    } catch {
      setError("We couldn't save your changes. Check your connection and try again.");
      return false;
    }

    if (!res.ok) {
      setError("We couldn't save your latest changes. Please check the fields above.");
      return false;
    }

    const row = (await res.json()) as DraftState;
    // A newer PATCH is already in flight; its response is the authoritative one.
    if (seq !== seqRef.current) return true;

    setError(null);
    setDraft(row);
    pendingRef.current = dropConfirmed(pendingRef.current, snapshot);
    setPending(pendingRef.current);
    return true;
  }, [draftId]);

  const queuePatch = useCallback(
    (patch: PatchBody) => {
      pendingRef.current = mergePatch(pendingRef.current, patch);
      setPending(pendingRef.current);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        void flushPending();
      }, PATCH_DEBOUNCE_MS);
    },
    [flushPending]
  );

  const handleLogoUpload = useCallback(
    async (file: File) => {
      const form = new FormData();
      form.set('file', file);
      try {
        const res = await fetch(`/api/drafts/${draftId}/logo`, { method: 'POST', body: form });
        if (!res.ok) {
          setError("We couldn't upload that logo. Please try a different image.");
          return;
        }
        setError(null);
        setDraft(await res.json());
      } catch {
        setError("We couldn't upload that logo. Check your connection and try again.");
      }
    },
    [draftId]
  );

  const handleSubmit = useCallback(async () => {
    // Make sure everything typed so far is persisted before validating server-side.
    const flushed = await flushPending();
    if (!flushed) return;

    try {
      const res = await fetch(`/api/drafts/${draftId}/submit`, { method: 'POST' });
      if (!res.ok) {
        setError(
          res.status === 422
            ? 'Please fill in all required fields before continuing.'
            : "We couldn't submit your card. Please try again."
        );
        return;
      }
      setError(null);
      setDraft(await res.json());
      router.push(`/builder/${draftId}/submitted`);
    } catch {
      setError("We couldn't submit your card. Check your connection and try again.");
    }
  }, [draftId, flushPending, router]);

  if (loadFailed) {
    return (
      <div className="space-y-4" role="alert">
        <h1 className="text-2xl font-bold">We couldn&apos;t find that card</h1>
        <p className="text-gray-600">
          This draft may have expired, or the link may be incorrect.
        </p>
        <Link className="underline" href="/templates">
          Start a new card
        </Link>
      </div>
    );
  }

  if (!draft) return <p>Loading…</p>;
  if (draft.status === 'submitted') return <p>Your card has been submitted.</p>;

  const template = findTemplate(draft.templateId);
  if (!template) {
    return (
      <div className="space-y-4" role="alert">
        <h1 className="text-2xl font-bold">This card can&apos;t be edited</h1>
        <p className="text-gray-600">Its template is no longer available.</p>
        <Link className="underline" href="/templates">
          Start a new card
        </Link>
      </div>
    );
  }

  const { styleOverrides: pendingStyle, ...pendingFields } = pending;
  const data = { ...(draft as unknown as Partial<CardData>), ...pendingFields };
  const style: StyleOverrides = { ...draft.styleOverrides, ...(pendingStyle ?? {}) };

  return (
    <div className="grid grid-cols-2 gap-8">
      <div className="space-y-8">
        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}
        <InfoForm
          data={data}
          allowLogo={template.customizable.logo}
          onChange={queuePatch}
          onLogoUpload={handleLogoUpload}
        />
        <CustomizePanel
          template={template}
          style={style}
          onChange={stylePatch => queuePatch({ styleOverrides: { ...style, ...stylePatch } })}
        />
        <button onClick={handleSubmit}>Continue / Get My Digital Card</button>
      </div>
      <LivePreview templateId={draft.templateId} data={data} style={style} />
    </div>
  );
}
