import { cn } from "@/lib/cn";
import { EVENT_NAME } from "@/lib/brand";

export function TrophyIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={className} fill="none">
      <defs>
        <linearGradient id="trophy-gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--gold-soft)" />
          <stop offset="0.6" stopColor="var(--gold)" />
          <stop offset="1" stopColor="#9c7c22" />
        </linearGradient>
      </defs>
      {/* Copa */}
      <path
        d="M10 5h12v6.5a6 6 0 0 1-12 0V5Z"
        fill="url(#trophy-gold)"
      />
      {/* Asas */}
      <path
        d="M10 7.5H6.5a3.5 3.5 0 0 0 3.9 4.6M22 7.5h3.5a3.5 3.5 0 0 1-3.9 4.6"
        stroke="url(#trophy-gold)"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      {/* Pie */}
      <path d="M14.5 17.4h3v4.1h-3z" fill="url(#trophy-gold)" />
      <path d="M11 22.5h10l1 3.5H10l1-3.5Z" fill="url(#trophy-gold)" />
      {/* Estrella sobre la copa */}
      <path
        d="M16 7.2l.9 1.9 2 .3-1.5 1.4.4 2-1.8-1-1.8 1 .4-2-1.5-1.4 2-.3.9-1.9Z"
        fill="#0b0e1a"
        opacity="0.55"
      />
    </svg>
  );
}

export function Logo({ className, name = EVENT_NAME }: { className?: string; name?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <TrophyIcon className="size-8 drop-shadow-[0_0_10px_rgb(212_175_55/0.45)]" />
      <span className="font-display text-xl font-semibold tracking-wide text-gold-gradient">
        {name}
      </span>
    </span>
  );
}
