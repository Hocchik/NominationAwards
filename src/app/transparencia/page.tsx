import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Card } from "@/components/ui/Card";
import { Logo } from "@/components/ui/Logo";

export const metadata: Metadata = {
  title: "¿Quién puede ver mi voto?",
  description: "Cómo se protege el anonimato de las nominaciones y los votos.",
};

const REPO_URL = "https://github.com/Hocchik/NominationAwards";

function Point({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card as="section" className="space-y-2">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="space-y-2 text-sm text-muted">{children}</div>
    </Card>
  );
}

export default function TransparencyPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 space-y-8 px-4 py-10">
      <Logo />
      <div className="space-y-3">
        <h1 className="font-display text-4xl font-semibold">¿Quién puede ver mi voto?</h1>
        <p className="font-display text-3xl text-gold">Nadie.</p>
        <p className="text-muted">
          Ni el organizador, ni quien administra el servidor, ni el notario por separado. Así
          funciona, paso a paso:
        </p>
      </div>

      <Point title="1. Tu papeleta se sella en tu celular">
        <p>
          Antes de salir de tu dispositivo, la papeleta se cifra con un «sobre sellado»
          (crypto_box_seal de libsodium). Cualquiera puede meter un sobre a la urna, pero solo
          quien tiene la llave privada puede abrirlo. Al servidor nunca llega lo que elegiste,
          solo texto cifrado.
        </p>
      </Point>

      <Point title="2. La llave la tiene el notario, no el organizador">
        <p>
          El grupo elige a una persona de confianza como notario. Esa persona genera las llaves en
          su propio navegador y guarda la privada en un archivo que nunca se sube al servidor. Las
          papeletas solo se abren con ese archivo, todas juntas, al cierre de cada ronda.
        </p>
      </Point>

      <Point title="3. La urna no sabe quién mandó cada sobre">
        <p>
          La base de datos guarda las papeletas sin tu nombre, sin la hora de envío y sin tu
          dirección de internet. De ti solo queda un ✔ que indica que ya participaste, para que
          nadie pueda votar dos veces.
        </p>
        <p>
          Además, todas las papeletas pesan exactamente lo mismo: el tamaño no delata cuántos
          nombres escribiste.
        </p>
      </Point>

      <Point title="4. Lo que sí ve el organizador">
        <ul className="list-disc space-y-1 pl-5">
          <li>Los registros, para aprobarlos.</li>
          <li>Si cada persona ya nominó o votó (✔ o ⏳), nunca qué eligió.</li>
          <li>Los finalistas, sin conteos.</li>
          <li>Los ganadores, recién en la ceremonia, al mismo tiempo que todos.</li>
        </ul>
      </Point>

      <Point title="5. Tu comprobante">
        <p>
          Al enviar recibes un código como «K7M-29Q». Antes de revelar a los ganadores se
          proyectan todos los comprobantes recibidos: si ves el tuyo, sabes que tu papeleta se
          contó. Guárdalo y no lo compartas.
        </p>
      </Point>

      <Point title="6. El código es público">
        <p>
          Cualquiera puede revisar cómo funciona la app, línea por línea:{" "}
          <a href={REPO_URL} className="text-gold underline underline-offset-4" rel="noreferrer" target="_blank">
            {REPO_URL.replace("https://", "")}
          </a>
          .
        </p>
      </Point>
    </main>
  );
}
