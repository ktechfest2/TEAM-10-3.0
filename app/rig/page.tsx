import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { RigChallenge } from "@/components/rig-challenge";

export const metadata: Metadata = { title: "Try to rig it", description: "Play a corrupt collation officer. Change one number. See if Tally notices." };

export default function RigPage() {
  return (
    <div className="relative flex-1">
      <div className="rainbow-line" />
      <div className="mx-auto w-full max-w-3xl px-4 pb-16">
        <header className="flex items-center justify-between py-5">
          <Link href="/"><Logo size={26} /></Link>
          <Link href="/mission" className="text-sm font-bold text-thumb">Mission control ›</Link>
        </header>
        <h1 className="font-display text-5xl leading-[0.95] font-extrabold tracking-tight sm:text-6xl">Try to rig <span className="text-alarm">this election.</span></h1>
        <p className="mt-4 max-w-xl text-lg text-muted">You are the collation officer. Change one number on the ward sheet and announce it. See if Tally notices.</p>
        <p role="note" className="mt-4 inline-block rounded-full bg-amber-wash px-3 py-1 text-xs font-bold text-amber">Simulated data · your announcement is signed by a labelled test officer</p>
        <div className="mt-8">
          <RigChallenge />
        </div>
      </div>
    </div>
  );
}
