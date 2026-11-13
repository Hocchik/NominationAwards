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
      <div className="space-y-2 text-sm text-ink-soft">{children}</div>
    </Card>
  );
}

export default function TransparencyPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 space-y-8 px-4 py-10">
      <Logo />
      <div className="space-y-3">
        <h1 className="font-display text-4xl leading-tight font-extrabold">¿Quién puede ver mi voto?</h1>
        <p className="inline-block bg-copper px-3 py-1 font-display text-3xl font-extrabold text-ink uppercase chamfer-10">Nadie.</p>
        <p className="text-ink-soft">
          Tu papeleta se cierra con candado en tu celular y, cuando se abre, ya no lleva tu nombre.
          Así funciona, paso a paso:
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

      <Point title="2. La llave no está en el servidor">
        <p>
          El notario genera las llaves en su propio navegador y guarda la privada en un archivo que
          nunca se sube al servidor. Las papeletas solo se abren con ese archivo, todas juntas, al
          cierre de cada ronda.
        </p>
      </Point>

      <Point title="3. Los sobres pierden tu nombre antes de abrirse">
        <p>
          Mientras la ronda está abierta, tu sobre lleva tu nombre por fuera, cerrado: así, si
          alguien entró con tu nombre, el organizador puede botar ese sobre sin abrirlo y tú vuelves a
          votar. Al cerrar la ronda los nombres se arrancan de todos los sobres, y recién entonces se
          abren las papeletas.
        </p>
        <p>
          No se guarda la hora de envío ni tu dirección de internet. De ti queda un ✔ que indica que
          ya participaste, para que nadie pueda votar dos veces.
        </p>
        <p>
          Además, todas las papeletas pesan exactamente lo mismo: el tamaño no delata cuántos
          nombres escribiste.
        </p>
      </Point>

      <Point title="4. Lo que sí ve el organizador">
        <ul className="list-disc space-y-1 pl-5">
          <li>La lista de invitados.</li>
          <li>Si cada persona ya nominó o votó (✔ o ⏳), nunca qué eligió.</li>
          <li>Los finalistas, sin conteos.</li>
          <li>Los ganadores, recién en la ceremonia, al mismo tiempo que todos.</li>
        </ul>
      </Point>

      <Point title="5. El código es público">
        <p>
          Cualquiera puede revisar cómo funciona la app, línea por línea:{" "}
          <a href={REPO_URL} className="font-semibold text-ink underline decoration-copper decoration-2 underline-offset-4" rel="noreferrer" target="_blank">
            {REPO_URL.replace("https://", "")}
          </a>
          .
        </p>
      </Point>
    </main>
  );
}
