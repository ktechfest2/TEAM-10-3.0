"use client";
import jsQR from "jsqr";
import QRCode from "qrcode";
import { useEffect, useRef, useState } from "react";

/** Renders text as a QR code, fully offline. */
export function QrCodeView({ value, label }: { value: string; label?: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    QRCode.toDataURL(value, { errorCorrectionLevel: "M", margin: 2, width: 720 }).then(setSrc).catch(() => setSrc(null));
  }, [value]);
  return (
    <figure className="flex flex-col items-center">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- data URL generated on device
        <img src={src} alt={label ?? "QR code"} className="aspect-square w-full max-w-[340px] rounded-xl bg-white" />
      ) : (
        <div className="aspect-square w-full max-w-[340px] animate-pulse rounded-xl bg-line" />
      )}
      {label && <figcaption className="mt-2 text-center text-xs text-muted">{label}</figcaption>}
    </figure>
  );
}

/** Camera QR scanner (works offline; needs HTTPS or localhost for camera access). */
export function QrScanner({ onResult, active = true }: { onResult: (text: string) => void; active?: boolean }) {
  const video = useRef<HTMLVideoElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const done = useRef(false);

  useEffect(() => {
    if (!active) return;
    done.current = false;
    let stream: MediaStream | null = null;
    let frame = 0;
    const tick = () => {
      const v = video.current;
      const c = canvas.current;
      if (!v || !c || done.current) return;
      if (v.readyState === v.HAVE_ENOUGH_DATA) {
        c.width = v.videoWidth;
        c.height = v.videoHeight;
        const ctx = c.getContext("2d", { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(v, 0, 0, c.width, c.height);
          const code = jsQR(ctx.getImageData(0, 0, c.width, c.height).data, c.width, c.height, { inversionAttempts: "dontInvert" });
          if (code?.data) {
            done.current = true;
            onResult(code.data);
            return;
          }
        }
      }
      frame = requestAnimationFrame(tick);
    };
    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: "environment" }, audio: false })
      .then((s) => {
        stream = s;
        if (video.current) {
          video.current.srcObject = s;
          void video.current.play();
          frame = requestAnimationFrame(tick);
        }
      })
      .catch(() => setError("Camera unavailable. Allow camera access, or use a phone with a camera."));
    return () => {
      cancelAnimationFrame(frame);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [active, onResult]);

  return (
    <div className="relative overflow-hidden rounded-xl bg-black">
      <video ref={video} playsInline muted className="aspect-square w-full object-cover" />
      <canvas ref={canvas} className="hidden" />
      <div className="pointer-events-none absolute inset-8 rounded-xl border-2 border-white/70" />
      {error && <p className="absolute inset-x-0 bottom-0 bg-black/70 p-3 text-center text-sm text-white">{error}</p>}
    </div>
  );
}
