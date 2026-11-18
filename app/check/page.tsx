import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { RumourCheck } from "@/components/rumour-check";

export const metadata: Metadata = { title: "Check a message", description: "Forwarded a result or a claim about counting? Check it against signed results." };

export default async function CheckPage(props: PageProps<"/check">) {
  const sp = await props.searchParams;
  // The installed app can be a share target: WhatsApp's "Share" delivers the message as ?text=.
  const shared = [sp.title, sp.text].flatMap((v) => (typeof v === "string" ? [v] : [])).join("\n").slice(0, 1500);
  return (
    <div className="mx-auto w-full max-w-xl flex-1 px-4 pb-16">
      <header className="flex items-center justify-between py-4">
        <Link href="/"><Logo size={22} /></Link>
        <Link href="/app" className="text-sm font-bold text-blue">Open app ›</Link>
      </header>
      <h1 className="font-display mt-2 text-3xl leading-tight font-extrabold sm:text-4xl">Is that message true?</h1>
      <p className="mt-2 text-muted">Tally compares a claim about a result with what rival party agents signed at the polling unit. If the ledger cannot settle it, it says so.</p>
      <div className="mt-6">
        <RumourCheck initialText={shared} />
      </div>
    </div>
  );
}
