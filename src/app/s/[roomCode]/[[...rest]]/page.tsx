import { redirect } from "next/navigation";
import { Suspense } from "react";

// Links viejos de la sala (/s/CÓDIGO/...): la sala ahora es la raíz del sitio.
type Params = Promise<{ roomCode: string; rest?: string[] }>;

export default function OldRoomRedirect({ params }: { params: Params }) {
  return (
    <Suspense>
      <Redirect params={params} />
    </Suspense>
  );
}

async function Redirect({ params }: { params: Params }): Promise<null> {
  const page = (await params).rest?.[0];
  redirect(page === "nominar" || page === "votar" ? `/${page}` : "/");
}
