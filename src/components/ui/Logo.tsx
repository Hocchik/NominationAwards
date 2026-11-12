import { cn } from "@/lib/cn";
import { EVENT_NAME } from "@/lib/brand";

/**
 * Marca (CLAUDE.md §9): rombo + cono, un trofeo abstracto. Toma el color del
 * texto (currentColor), así sirve en cobre, en salvia o en una carta boca abajo.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 18 20" aria-hidden="true" className={className} fill="currentColor">
      <path d="M9 0l3 3-3 3-3-3z" />
      <path d="M6.5 7.5h5L18 20H0z" fillOpacity="0.6" />
    </svg>
  );
}

export function Logo({ className, name = EVENT_NAME }: { className?: string; name?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2.5 font-display text-xs font-semibold tracking-[0.14em] text-ink uppercase sm:text-[13px]",
        className,
      )}
    >
      <LogoMark className="h-5 w-[18px] text-copper" />
      {name}
    </span>
  );
}
