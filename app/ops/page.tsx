import type { Metadata } from "next";
import { OpsView } from "@/components/ops-view";

export const metadata: Metadata = { title: "Operations", robots: { index: false, follow: false } };

export default function OpsPage() {
  return <OpsView />;
}
