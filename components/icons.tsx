import type { SVGProps } from "react";

/** A small set of line icons, drawn here so the phone downloads no icon library. Colour comes from the text colour. */
const PATHS = {
  search: <><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></>,
  camera: <><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></>,
  people: <><circle cx="9" cy="8" r="3" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" /><circle cx="17" cy="9" r="2.5" /><path d="M16 14.2c3 .3 5 2.6 5 5.8" /></>,
  chat: <path d="M4 5h16v11H9l-5 4z" />,
  map: <><path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z" /><path d="M9 4v14M15 6v14" /></>,
  qr: <><rect x="4" y="4" width="6" height="6" /><rect x="14" y="4" width="6" height="6" /><rect x="4" y="14" width="6" height="6" /><path d="M14 14h2v2h-2zM18 18h2v2h-2zM14 18h2M18 14h2" /></>,
  globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" /></>,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  pin: <><path d="M12 21s7-6.2 7-11.5A7 7 0 005 9.5C5 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></>,
  chevron: <path d="M9 6l6 6-6 6" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  alert: <><path d="M12 3l10 18H2z" /><path d="M12 10v5M12 18v.5" /></>,
  eye: <><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>,
  lock: <><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 018 0v3" /></>,
  home: <><path d="M3 11l9-7 9 7" /><path d="M5 10v10h14V10" /></>,
  back: <path d="M15 6l-6 6 6 6" />,
  phone: <><rect x="7" y="3" width="10" height="18" rx="2" /><path d="M11 18h2" /></>,
  shield: <><path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z" /><path d="M8.5 12l2.5 2.5 4.5-5" /></>,
  megaphone: <><path d="M3 10v4h4l8 5V5L7 10z" /><path d="M18 9c1.3 1.5 1.3 4.5 0 6" /></>,
  door: <><path d="M6 21V4h12v17" /><path d="M3 21h18" /><circle cx="15" cy="12.5" r="0.8" /></>,
  ballot: <><rect x="4" y="9" width="16" height="11" rx="1.5" /><path d="M9 9V6h6v3M9 13h6" /></>,
  sheet: <><path d="M6 3h9l4 4v14H6z" /><path d="M9 11h7M9 14.5h7M9 18h4" /></>,
  upload: <><path d="M7 17a4 4 0 010-8 5.5 5.5 0 0110.5 1.5A3.3 3.3 0 0117 17" /><path d="M12 20v-7M9 15.5l3-3 3 3" /></>,
  sum: <><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M8 9h8M8 13h5M8 16.5h2M15 14v4M13 16h4" /></>,
  podium: <><path d="M3 21h18M5 21v-7h5v7M10 21V9h4v12M14 21v-5h5v5" /></>,
  scale: <><path d="M12 4v16M6 20h12M4 8h16" /><path d="M4 8l-2 6h6zM20 8l-2 6h6z" /></>,
  box: <><path d="M3 8l9-4 9 4v10l-9 4-9-4z" /><path d="M3 8l9 4 9-4M12 12v10" /></>,
  listen: <><path d="M4 10v4h3l5 4V6L7 10z" /><path d="M16 9c1.5 1.5 1.5 4.5 0 6M18.5 6.5c3 3 3 8 0 11" /></>,
  bell: <><path d="M18 16H6l1.5-2.5V10a4.5 4.5 0 019 0v3.5z" /><path d="M10 19a2 2 0 004 0" /></>,
  download: <><path d="M12 4v11M7.5 11.5L12 16l4.5-4.5" /><path d="M5 19h14" /></>,
  expand: <><path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5" /></>,
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 24, ...rest }: { name: IconName; size?: number } & Omit<SVGProps<SVGSVGElement>, "name">) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...rest}>
      {PATHS[name]}
    </svg>
  );
}
