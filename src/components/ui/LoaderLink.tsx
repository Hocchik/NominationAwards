"use client";

import { useRouter } from "next/navigation";
import { type ReactNode, useState } from "react";
import { LoaderOverlay } from "./Loader";

/**
 * Link que muestra la carga antes de cambiar de pantalla. En el demo las
 * pantallas no esperan al servidor, así que la carga dura `minMs` para que se vea
 * igual que en el evento real.
 */
export function LoaderLink({
  href,
  label,
  minMs = 900,
  className,
  children,
}: {
  href: string;
  label: string;
  minMs?: number;
  className?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  return (
    <>
      <a
        href={href}
        className={className}
        onClick={(event) => {
          if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
          event.preventDefault();
          setLoading(true);
          router.prefetch(href);
          window.setTimeout(() => router.push(href), minMs);
        }}
      >
        {children}
      </a>
      {loading && <LoaderOverlay label={label} />}
    </>
  );
}
