"use client";

import { type ChangeEvent, type ReactNode, useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/cn";
import { fingerprint } from "@/lib/crypto/fingerprint";
import { buildKeyFile, keyFileName, parseKeyFile } from "@/lib/crypto/keyFile";
import { type KeyPair, generateKeyPair } from "@/lib/crypto/keys";
import { submitNotaryKeysAction } from "../actions";

// Las llaves privadas viven SOLO en el estado de este componente (memoria) y
// en el archivo que descarga el notario. Nada de localStorage (regla 7).

interface NotaryKeys {
  nomination: KeyPair;
  vote: KeyPair;
}

interface Fingerprints {
  nomination: string;
  vote: string;
}

export function NotarySetup({
  token,
  eventId,
  eventName,
}: {
  token: string;
  eventId: string;
  eventName: string;
}) {
  const [keys, setKeys] = useState<NotaryKeys | null>(null);
  const [prints, setPrints] = useState<Fingerprints | null>(null);
  const [downloaded, setDownloaded] = useState(false);
  const [verified, setVerified] = useState(false);
  const [backedUp, setBackedUp] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Si cierra la pestaña antes de confirmar, las llaves en memoria se pierden.
  useEffect(() => {
    if (!keys || done) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [keys, done]);

  function generate() {
    setError(null);
    startTransition(async () => {
      const [nomination, vote] = await Promise.all([generateKeyPair(), generateKeyPair()]);
      const [nominationPrint, votePrint] = await Promise.all([
        fingerprint(nomination.publicKey),
        fingerprint(vote.publicKey),
      ]);
      setKeys({ nomination, vote });
      setPrints({ nomination: nominationPrint, vote: votePrint });
    });
  }

  function download() {
    if (!keys) return;
    const file = buildKeyFile({ eventId, eventName, ...keys });
    const url = URL.createObjectURL(new Blob([file], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = keyFileName(eventName);
    link.click();
    URL.revokeObjectURL(url);
    setDownloaded(true);
  }

  async function verify(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // permite volver a elegir el mismo archivo
    if (!file || !keys) return;
    setError(null);
    try {
      const parsed = await parseKeyFile(await file.text());
      const same =
        parsed.nomination.publicKey === keys.nomination.publicKey &&
        parsed.vote.publicKey === keys.vote.publicKey;
      if (!same) throw new Error("Ese archivo es de otras llaves. Elige el que acabas de descargar.");
      setVerified(true);
    } catch (e) {
      setVerified(false);
      setError(e instanceof Error ? e.message : "No se pudo leer el archivo.");
    }
  }

  function confirm() {
    if (!keys) return;
    setError(null);
    startTransition(async () => {
      const result = await submitNotaryKeysAction(
        token,
        keys.nomination.publicKey,
        keys.vote.publicKey,
      );
      if (result.ok) {
        setDone(true);
        setKeys(null); // las privadas ya están en el archivo: se olvidan de la memoria
      } else {
        setError(result.message ?? "No se pudieron guardar las llaves.");
      }
    });
  }

  if (done && prints) {
    return (
      <Card className="space-y-5">
        <h1 className="font-display text-2xl font-semibold">Todo quedó guardado</h1>
        <p className="text-sm">
          El servidor ya tiene tus llaves <strong>públicas</strong>. Las privadas están solo en tu
          archivo: guárdalo bien, lo vas a necesitar para abrir las nominaciones y en la ceremonia.
        </p>
        <PrintList prints={prints} />
        <p className="text-xs text-muted">
          El organizador verá estas mismas huellas en su panel. Ya puedes cerrar esta página.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm text-muted">{eventName}</p>
        <h1 className="font-display text-3xl font-semibold">Llaves del notario</h1>
        <p className="text-sm text-muted">
          El grupo te eligió para custodiar las llaves que abren las papeletas. Ni el organizador
          ni el servidor podrán ver lo que nominó o votó cada persona: solo se abren con tu
          archivo, y siempre en tu navegador.
        </p>
      </div>

      <Step number={1} title="Genera tus llaves" active={!keys} done={Boolean(keys)}>
        <p className="text-sm text-muted">
          Se crean dos llaves en este dispositivo: una para las nominaciones y otra para la
          votación. Nada sale de aquí todavía.
        </p>
        {!keys && (
          <Button onClick={generate} disabled={pending}>
            {pending ? "Generando…" : "Generar mis llaves"}
          </Button>
        )}
        {prints && <PrintList prints={prints} />}
      </Step>

      <Step number={2} title="Descarga tu archivo" active={Boolean(keys) && !downloaded} done={downloaded}>
        <p className="text-sm text-muted">
          Contiene tus llaves privadas. Guárdalo en dos lugares (por ejemplo, tu computador y una
          memoria USB) y no se lo pases a nadie. Si se pierde, las papeletas no se pueden abrir.
        </p>
        {keys && (
          <Button variant={downloaded ? "secondary" : "primary"} onClick={download}>
            {downloaded ? "Descargar otra vez" : "Descargar archivo de llaves"}
          </Button>
        )}
      </Step>

      <Step number={3} title="Comprueba el archivo" active={downloaded && !verified} done={verified}>
        <p className="text-sm text-muted">
          Vuelve a elegir el archivo que descargaste. Así sabemos que se guardó bien antes de
          seguir.
        </p>
        {downloaded && !verified && (
          <label className="glass inline-flex min-h-12 cursor-pointer items-center rounded-xl px-5 text-sm font-semibold">
            Elegir archivo…
            <input type="file" accept="application/json,.json" onChange={verify} className="sr-only" />
          </label>
        )}
        {verified && <p className="text-sm text-success">✓ El archivo está completo y es el correcto.</p>}
      </Step>

      <Step number={4} title="Confirma" active={verified} done={false}>
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            checked={backedUp}
            onChange={(e) => setBackedUp(e.target.checked)}
            disabled={!verified}
            className="mt-0.5 size-5 shrink-0 accent-gold"
          />
          Guardé el archivo y una copia de respaldo en otro lugar.
        </label>
        <Button onClick={confirm} disabled={!verified || !backedUp || pending}>
          {pending && keys ? "Guardando…" : "Confirmar y enviar llaves públicas"}
        </Button>
      </Step>

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

function Step({
  number,
  title,
  active,
  done,
  children,
}: {
  number: number;
  title: string;
  active: boolean;
  done: boolean;
  children: ReactNode;
}) {
  return (
    <Card
      as="section"
      aria-labelledby={`paso-${number}`}
      className={cn("space-y-3", !active && !done && "opacity-55")}
    >
      <h2 id={`paso-${number}`} className="flex items-center gap-3 text-lg font-semibold">
        <span
          className={cn(
            "grid size-8 place-items-center rounded-full border text-sm",
            done ? "border-success text-success" : "border-line",
          )}
          aria-hidden="true"
        >
          {done ? "✓" : number}
        </span>
        {title}
        {done && <span className="sr-only">(hecho)</span>}
      </h2>
      {children}
    </Card>
  );
}

function PrintList({ prints }: { prints: Fingerprints }) {
  return (
    <dl className="grid gap-2 text-sm sm:grid-cols-2">
      <div>
        <dt className="text-muted">Huella · nominaciones</dt>
        <dd className="font-mono text-base tracking-wider">{prints.nomination}</dd>
      </div>
      <div>
        <dt className="text-muted">Huella · votación</dt>
        <dd className="font-mono text-base tracking-wider">{prints.vote}</dd>
      </div>
    </dl>
  );
}
