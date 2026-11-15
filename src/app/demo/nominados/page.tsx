import type { Metadata } from "next";
import { DemoNominees } from "./DemoNominees";

export const metadata: Metadata = { title: "Demo · Nominados" };

export default function DemoNomineesPage() {
  return (
    <main className="flex w-full flex-1 flex-col">
      <DemoNominees />
    </main>
  );
}
