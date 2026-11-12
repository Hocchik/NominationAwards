import type { Metadata } from "next";
import { DemoNominees } from "./DemoNominees";

export const metadata: Metadata = { title: "Demo · Nominados" };

export default function DemoNomineesPage() {
  return (
    <main className="mx-auto w-full max-w-[80rem] flex-1 space-y-5 px-4 pt-4 pb-10 sm:px-6 lg:space-y-8 lg:px-10 lg:pb-14">
      <DemoNominees />
    </main>
  );
}
