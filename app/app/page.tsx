import type { Metadata } from "next";
import { TallyApp } from "@/components/app/tally-app";
import { getLang } from "@/lib/server/lang";

export const metadata: Metadata = { title: "App" };

export default async function AppPage(props: PageProps<"/app">) {
  const lang = await getLang((await props.searchParams).lang);
  return <TallyApp lang={lang} />;
}
