import type { Metadata } from "next";
import { TallyApp } from "@/components/app/tally-app";

export const metadata: Metadata = { title: "App" };

export default function AppPage() {
  return <TallyApp />;
}
