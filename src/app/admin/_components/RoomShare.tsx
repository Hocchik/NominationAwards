import QRCode from "qrcode";
import { CopyButton } from "@/components/ui/CopyButton";

// El QR se genera en el servidor como SVG: no carga ninguna librería en el
// navegador. Va sobre fondo blanco porque así lo leen mejor todas las cámaras.
export async function RoomShare({ roomCode, url }: { roomCode: string; url: string }) {
  const svg = await QRCode.toString(url, {
    type: "svg",
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#0b0e1aff", light: "#ffffffff" },
  });

  return (
    <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
      <div
        role="img"
        aria-label={`Código QR del link de la sala: ${url}`}
        className="size-44 shrink-0 bg-white p-2 [&>svg]:size-full"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <div className="min-w-0 space-y-3">
        <div>
          <p className="text-sm text-ink-soft">Código de la sala</p>
          <p className="font-display text-4xl font-semibold tracking-[0.2em]">{roomCode}</p>
        </div>
        <p className="text-sm break-all">{url}</p>
        <div className="flex flex-wrap gap-3">
          <CopyButton text={url} />
        </div>
        <p className="text-xs text-ink-soft">
          Es el único link que se comparte (por ejemplo, por WhatsApp). Ahí cada persona se registra,
          nomina, vota y ve a los nominados.
        </p>
      </div>
    </div>
  );
}
