import type { Metadata } from "next";
import { DemoVote } from "./DemoVote";

export const metadata: Metadata = { title: "Demo · Votar" };

export default function DemoVotePage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 space-y-4 px-2.5 pt-2 pb-8 sm:px-4 lg:max-w-5xl lg:pt-6">
      <DemoVote />
    </main>
  );
}
