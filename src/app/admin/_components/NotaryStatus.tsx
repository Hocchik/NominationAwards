import type { Event } from "@/generated/prisma/client";
import { fingerprint } from "@/lib/crypto/fingerprint";
import { NotaryLinkForm } from "./NotaryLinkForm";

// Estado de las llaves del notario. Las huellas permiten comprobar, mirando
// la pantalla del notario, que las llaves guardadas son las suyas.
export async function NotaryStatus({ event }: { event: Event }) {
  if (event.nominationPublicKey && event.votePublicKey) {
    const [nomination, vote] = await Promise.all([
      fingerprint(event.nominationPublicKey),
      fingerprint(event.votePublicKey),
    ]);
    return (
      <div className="space-y-3 text-sm">
        <p className="text-success">✓ El notario configuró sus llaves.</p>
        <dl className="grid gap-2 sm:grid-cols-2">
          <div>
            <dt className="text-ink-soft">Huella · nominaciones</dt>
            <dd className="font-display text-sm font-bold tracking-[0.12em]">{nomination}</dd>
          </div>
          <div>
            <dt className="text-ink-soft">Huella · votación</dt>
            <dd className="font-display text-sm font-bold tracking-[0.12em]">{vote}</dd>
          </div>
        </dl>
        <p className="text-xs text-ink-soft">
          Deben coincidir con las que vio el notario. Las llaves privadas quedan solo en manos
          del notario: ni el servidor ni tú pueden abrir las papeletas.
        </p>
      </div>
    );
  }

  if (event.phase !== "SETUP") {
    return (
      <p className="text-sm text-danger">
        Faltan las llaves del notario y la preparación ya terminó: sin ellas no se pueden cifrar
        las papeletas.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-soft">
        El notario es una persona de confianza del grupo (no tú). Con este link genera en su
        navegador dos llaves: una para abrir las nominaciones y otra para abrir los votos. Al
        servidor solo llegan las públicas.
      </p>
      <NotaryLinkForm hasPendingLink={Boolean(event.notarySetupTokenHash)} />
    </div>
  );
}
