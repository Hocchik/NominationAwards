import type { Metadata } from "next";
import { DemoWinner } from "./DemoWinner";

export const metadata: Metadata = { title: "Demo · Ganador" };

export default function DemoWinnerPage() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-8 pb-16 sm:px-6">
      <DemoWinner />
    </main>
  );
}
