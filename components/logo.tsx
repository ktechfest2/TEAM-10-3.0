/** The tally mark in colour: four strokes from the spectrum, closed by the green seal slash. */
export function Logo({ size = 28, word = true, className = "" }: { size?: number; word?: boolean; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg width={size * 1.5} height={size} viewBox="0 0 120 80" aria-hidden="true" className="shrink-0">
        <g fill="none" strokeWidth={10} strokeLinecap="round">
          <path d="M22 12 C23 28 21 50 23 68" className="stroke-blue" />
          <path d="M48 10 C47 28 49 48 47 69" className="stroke-pink" />
          <path d="M74 12 C76 30 73 50 75 68" className="stroke-orange" />
          <path d="M100 11 C101 28 99 50 101 68" className="stroke-thumb" />
        </g>
        <path d="M6 60 C36 47 78 31 116 17" fill="none" strokeWidth={10} strokeLinecap="round" className="stroke-sealed" />
      </svg>
      {word && <span className="font-display font-extrabold tracking-tight" style={{ fontSize: size * 0.9 }}>Tally</span>}
    </span>
  );
}
