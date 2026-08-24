'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import jsQR from 'jsqr';

type ScanState = 'requesting' | 'scanning' | 'denied' | 'unsupported' | 'found';

function Spinner() {
  return (
    <svg className="h-9 w-9 animate-spin text-scan" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4Z" />
    </svg>
  );
}

/**
 * The in-app QR scanner: opens this device's camera inside the app itself
 * and decodes frames locally with jsQR, rather than sending the user out to
 * their phone's own Camera app and back through a browser link. Once a
 * Nexxa DBC install code is found, it hands off to /holder/install with the
 * decoded fragment — that page owns the actual save-to-this-device logic.
 */
export default function ScanCardPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number | null>(null);
  const [state, setState] = useState<ScanState>('requesting');

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setState('unsupported');
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (cancelled) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setState('scanning');
        scanLoop();
      } catch {
        if (!cancelled) setState('denied');
      }
    })();

    function scanLoop() {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
        frameRef.current = requestAnimationFrame(scanLoop);
        return;
      }
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        frameRef.current = requestAnimationFrame(scanLoop);
        return;
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);
      if (code?.data) {
        handleDecoded(code.data);
        return;
      }
      frameRef.current = requestAnimationFrame(scanLoop);
    }

    function handleDecoded(text: string) {
      setState('found');
      streamRef.current?.getTracks().forEach(track => track.stop());
      if (frameRef.current) cancelAnimationFrame(frameRef.current);

      // The QR encodes a full URL (`${origin}/holder/install#<data>`), but
      // the origin it was generated on doesn't matter — the fragment is a
      // self-contained payload. Always hand it to *this* device's own
      // /holder/install, regardless of what host the code names.
      const hashIndex = text.indexOf('#');
      const fragment = hashIndex !== -1 ? text.slice(hashIndex) : '';
      if (!fragment) {
        setState('scanning');
        streamRef.current && scanLoop();
        return;
      }
      router.push(`/holder/install${fragment}`);
    }

    return () => {
      cancelled = true;
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      streamRef.current?.getTracks().forEach(track => track.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="relative flex min-h-screen w-full flex-col items-center bg-[#0b0b0c] px-5 py-8">
      <div className="mb-6 flex w-full max-w-xl items-center gap-3">
        <Link
          href="/holder"
          aria-label="Back to My Card Holder"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/70 hover:text-white"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </Link>
        <h1 className="font-display text-xl font-medium text-white">Scan Card</h1>
      </div>

      {(state === 'scanning' || state === 'found') && (
        <div className="relative w-full max-w-[360px] overflow-hidden rounded-[28px] bg-black">
          <video ref={videoRef} playsInline muted className="aspect-[3/4] w-full object-cover" />
          <div className="pointer-events-none absolute inset-6 rounded-2xl border-2 border-scan" />
        </div>
      )}
      <canvas ref={canvasRef} className="hidden" />

      {state === 'requesting' && (
        <div className="mt-12 flex flex-col items-center gap-4">
          <Spinner />
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-white/50">Requesting camera…</p>
        </div>
      )}
      {state === 'scanning' && <p className="mt-6 text-sm text-white/60">Point the camera at a Nexxa DBC code.</p>}
      {state === 'found' && (
        <div className="mt-6 flex flex-col items-center gap-3">
          <Spinner />
          <p className="text-sm text-white/60">Code found — saving…</p>
        </div>
      )}
      {state === 'denied' && (
        <div className="mt-8 max-w-xs text-center">
          <p className="font-medium text-white">Camera access is off</p>
          <p className="mt-2 text-sm text-white/60">
            Allow camera access for this site in your browser settings, then reload this page.
          </p>
        </div>
      )}
      {state === 'unsupported' && (
        <div className="mt-8 max-w-xs text-center">
          <p className="font-medium text-white">Scanning isn&apos;t supported here</p>
          <p className="mt-2 text-sm text-white/60">
            Use your phone&apos;s own Camera app to scan the code instead — it&apos;ll open here automatically.
          </p>
        </div>
      )}
    </main>
  );
}
