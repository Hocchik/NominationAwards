import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Card } from "@/components/ui/Card";
import { Logo } from "@/components/ui/Logo";
import { isAdmin } from "@/lib/auth/admin";
import { LoginForm } from "./_components/LoginForm";

export const metadata: Metadata = { title: "Admin" };

export default function AdminLoginPage() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-8 px-4 py-12">
      <Logo />
      <Card className="space-y-6">
        <div className="space-y-1">
          <h1 className="font-display text-2xl font-semibold">Panel del organizador</h1>
          <p className="text-sm text-ink-soft">
            Desde aquí se prepara el evento. Aun con esta contraseña nadie puede ver qué nominó o
            votó cada persona.
          </p>
        </div>
        <LoginForm />
      </Card>
      {/* Si ya hay sesión, se salta el login. Lee la cookie, por eso va en Suspense. */}
      <Suspense fallback={null}>
        <RedirectIfLoggedIn />
      </Suspense>
    </main>
  );
}

async function RedirectIfLoggedIn() {
  if (await isAdmin()) redirect("/admin/evento");
  return null;
}
