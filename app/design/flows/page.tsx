import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FlowsDemo } from "./demo";

export const metadata: Metadata = { title: "Flows (dev)", robots: { index: false } };

/** Dev-only: renders the real officer and agent components with a throwaway identity and a synthetic sample sheet. */
export default async function FlowsPage(props: PageProps<"/design/flows">) {
  if (process.env.NODE_ENV === "production") notFound();
  const q = await props.searchParams;
  const pick = (k: string) => (typeof q[k] === "string" ? (q[k] as string) : undefined);
  return <FlowsDemo role={pick("role") === "agent" ? "agent" : "officer"} index={pick("i") ? Number(pick("i")) : 0} />;
}
