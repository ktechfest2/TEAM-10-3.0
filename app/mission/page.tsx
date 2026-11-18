import type { Metadata } from "next";
import { MissionView } from "@/components/mission-view";

export const metadata: Metadata = { title: "Mission control" };

export default function MissionPage() {
  return <MissionView />;
}
