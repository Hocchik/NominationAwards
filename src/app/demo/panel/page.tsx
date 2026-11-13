import type { Metadata } from "next";
import { DemoPanel } from "./DemoPanel";

export const metadata: Metadata = { title: "Demo · Panel" };

export default function DemoPanelPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-8 pb-16 sm:px-6">
      <DemoPanel />
    </main>
  );
}
