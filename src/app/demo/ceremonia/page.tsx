import type { Metadata } from "next";
import { DemoCeremony } from "./DemoCeremony";

export const metadata: Metadata = { title: "Demo · Ceremonia" };

export default function DemoCeremonyPage() {
  return <DemoCeremony />;
}
