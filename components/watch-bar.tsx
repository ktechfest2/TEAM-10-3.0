import { Icon } from "@/components/icons";
import { InstallButton } from "./install-button";
import { PushToggle } from "./push-toggle";

/** The "watch the count" strip: live board alerts and the install action, on the mission screen. */
export function WatchBar({ topic = "mission", label = "Watch the count" }: { topic?: string; label?: string }) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-surface px-3 py-2.5">
      <span className="mr-auto flex items-center gap-2 text-sm font-extrabold">
        <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sealed opacity-60" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-sealed" />
        </span>
        {label}
        <span className="hidden items-center gap-1 text-xs font-medium text-muted sm:flex">
          <Icon name="bell" size={13} />alerts on this device
        </span>
      </span>
      <PushToggle topic={topic} compact />
      <InstallButton compact />
    </div>
  );
}
