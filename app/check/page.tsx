import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { LanguagePicker } from "@/components/language-picker";
import { RumourCheck } from "@/components/rumour-check";
import { t } from "@/lib/core/i18n";
import { getLang } from "@/lib/server/lang";

export const metadata: Metadata = { title: "Check a message", description: "Forwarded a result or a claim about counting? Check it against signed results." };

export default async function CheckPage(props: PageProps<"/check">) {
  const sp = await props.searchParams;
  const lang = await getLang(sp.lang);
  // The installed app can be a share target: WhatsApp's "Share" delivers the message as ?text=.
  const shared = [sp.title, sp.text].flatMap((v) => (typeof v === "string" ? [v] : [])).join("\n").slice(0, 1500);
  return (
    <div className="mx-auto w-full max-w-xl flex-1 px-4 pb-16">
      <header className="flex items-center justify-between py-4">
        <Link href="/"><Logo size={22} /></Link>
        <Link href="/app" className="text-sm font-bold text-blue">Open app ›</Link>
      </header>
      <h1 className="font-display mt-2 text-3xl leading-tight font-extrabold sm:text-4xl">{t(lang, "c.title")}</h1>
      <p className="mt-2 text-muted">{t(lang, "c.lead")}</p>
      <div className="mt-4"><LanguagePicker lang={lang} label={t(lang, "language")} draft={t(lang, "draft")} /></div>
      <div className="mt-6">
        <RumourCheck initialText={shared} lang={lang} />
      </div>
    </div>
  );
}
