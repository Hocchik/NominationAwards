import type { ReactNode } from "react";
import { Logo } from "@/components/ui/Logo";
import { AdminNav } from "../_components/AdminNav";

// Marco común del panel. No lee la sesión aquí: cada página la verifica con
// requireAdmin() dentro de su <Suspense>, así este marco sale en el HTML inicial.
export default function AdminPanelLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-4xl flex-1 px-4 pt-6 pb-20 sm:px-6">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <Logo />
        <AdminNav />
      </header>
      <main>{children}</main>
    </div>
  );
}
