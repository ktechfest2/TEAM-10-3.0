import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { PrintButton } from "@/components/print-button";
import { LANGS, t } from "@/lib/core/i18n";
import { getBreadcrumb, getPlace } from "@/lib/server/views";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Poster for the wall", robots: { index: false } };

/** A printable sheet to stick beside the result sheet: its QR code opens this unit's signed record. */
export default async function PosterPage(props: PageProps<"/poster/[code]">) {
  const { code } = await props.params;
  const place = await getPlace(code);
  if (!place || place.level !== "pu") notFound();
  const breadcrumb = await getBreadcrumb(place);
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const url = `${host.startsWith("localhost") ? "http" : "https"}://${host}/p/${place.code}`;
  const svg = await QRCode.toString(url, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#000000", light: "#ffffff" } });
  const where = breadcrumb.filter((b) => b.level === "ward" || b.level === "lga").map((b) => b.name).reverse().join(" · ");

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 pb-16">
      <div className="flex items-center justify-between py-4 print:hidden">
        <Link href={`/p/${place.code}`} className="text-sm font-bold text-blue">‹ Back to {place.name}</Link>
        <PrintButton label="Print this poster" />
      </div>
      <p className="mb-3 text-sm text-muted print:hidden">Print it and stick it next to the result sheet on the wall. Anyone who scans it sees who signed this unit&apos;s result and whether it reached the final count unchanged.</p>

      <article className="rounded-2xl bg-white p-8 text-black print:rounded-none print:p-0" aria-label={`Poster for ${place.name}`}>
        <p className="text-sm font-bold tracking-[0.2em] uppercase text-neutral-500">Tally</p>
        <h1 className="mt-2 text-4xl leading-tight font-extrabold">{place.name}</h1>
        <p className="mt-1 text-lg text-neutral-600">{where ? `${where} · ` : ""}Polling unit {place.code}</p>
        <div className="mt-6 flex flex-col items-center gap-6 sm:flex-row">
          <div className="aspect-square w-64 shrink-0 [&>svg]:h-full [&>svg]:w-full" role="img" aria-label={`QR code that opens ${url}`} dangerouslySetInnerHTML={{ __html: svg }} />
          <div className="space-y-4">
            {LANGS.map((l) => (
              <div key={l.code} lang={l.code === "pcm" ? "pcm" : l.code}>
                <p className="text-xl leading-snug font-extrabold">{t(l.code, "poster.title")}</p>
                <p className="text-[15px] leading-snug text-neutral-700">{t(l.code, "poster.scan")}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="mt-6 border-t border-neutral-300 pt-3 text-sm break-all text-neutral-600">{url}</p>
      </article>
      <p className="mt-3 text-xs text-muted print:hidden">The non-English lines are drafts that native speakers have not reviewed yet.</p>
    </div>
  );
}
