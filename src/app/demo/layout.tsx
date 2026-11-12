import type { ReactNode } from "react";
import { DemoBanner } from "./DemoBanner";
import { DemoProvider } from "./DemoProvider";

// Todo el demo comparte un estado en memoria (llaves de juguete y lo enviado).
export default function DemoLayout({ children }: { children: ReactNode }) {
  return (
    <DemoProvider>
      <DemoBanner />
      {children}
    </DemoProvider>
  );
}
