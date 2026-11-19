"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Icon, type IconName } from "@/components/icons";
import { Logo } from "@/components/logo";

const TABS: { href: string; label: string; short: string; icon: IconName; tone?: string }[] = [
  { href: "/", label: "Home", short: "Home", icon: "home" },
  { href: "/check", label: "Check a message", short: "Check", icon: "chat" },
  { href: "/rig", label: "Try to rig it", short: "Rig it", icon: "alert", tone: "text-alarm" },
  { href: "/mission", label: "Mission control", short: "Live", icon: "map" },
  { href: "/verify", label: "Records", short: "Records", icon: "shield" },
];

/** Pages that are printed or are operator tools keep their own layout. */
const HIDDEN = ["/poster", "/ops", "/design"];

const isActive = (path: string, href: string) => (href === "/" ? path === "/" : path === href || path.startsWith(`${href}/`));

/** One navigation for every screen: a top bar with a way back, links on wide screens, and a tab bar on phones. */
export function SiteNav() {
  const path = usePathname();
  const router = useRouter();
  if (HIDDEN.some((h) => path.startsWith(h))) return null;

  function back() {
    // Opened from a shared link there is nothing to go back to, so go home instead.
    if (window.history.length > 1) router.back();
    else router.push("/");
  }

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-line bg-bg/90 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-2 px-3 sm:px-6">
          {path !== "/" && (
            <button type="button" onClick={back} aria-label="Go back" className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-muted hover:bg-raised hover:text-fg">
              <Icon name="back" size={22} />
            </button>
          )}
          <Link href="/" aria-label="Tally home" className="shrink-0"><Logo size={24} /></Link>
          <nav aria-label="Main" className="ml-4 hidden flex-1 items-center gap-1 md:flex">
            {TABS.slice(1).map((t) => (
              <Link key={t.href} href={t.href} aria-current={isActive(path, t.href) ? "page" : undefined} className={`rounded-full px-3 py-1.5 text-sm font-bold ${isActive(path, t.href) ? "bg-raised text-fg" : `${t.tone ?? "text-muted"} hover:text-fg`}`}>
                {t.label}
              </Link>
            ))}
          </nav>
          <Link href="/app" className={`ml-auto inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-bold ${isActive(path, "/app") ? "bg-raised text-fg" : "bg-fg text-bg"}`}>
            <Icon name="phone" size={16} />My app
          </Link>
        </div>
      </header>

      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <ul className="mx-auto grid max-w-xl grid-cols-5">
          {TABS.map((t) => {
            const active = isActive(path, t.href);
            return (
              <li key={t.href}>
                <Link href={t.href} aria-current={active ? "page" : undefined} className={`flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-bold ${active ? "text-fg" : (t.tone ?? "text-muted")}`}>
                  <span className={`grid h-7 w-12 place-items-center rounded-full ${active ? "bg-raised" : ""}`}><Icon name={t.icon} size={20} /></span>
                  {t.short}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      {/* Keeps the last part of every page clear of the tab bar on phones. */}
      <div aria-hidden className="order-last h-16 md:hidden" />
    </>
  );
}
