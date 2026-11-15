import { redirect } from "next/navigation";

// Los nominados viven en la página principal desde que cierran las nominaciones.
export default function NomineesRedirect() {
  redirect("/");
}
