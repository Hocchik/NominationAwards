"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function CopyButton({ text, label = "Copiar link" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Sin permiso de portapapeles (o sin HTTPS): que lo copie a mano.
      window.prompt("Copia el link:", text);
    }
  }

  return (
    <>
      <Button variant="secondary" onClick={copy}>
        {copied ? "¡Copiado!" : label}
      </Button>
      <span aria-live="polite" className="sr-only">
        {copied ? "Link copiado" : ""}
      </span>
    </>
  );
}
