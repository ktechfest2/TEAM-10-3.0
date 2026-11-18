"use client";
import { useRouter } from "next/navigation";
import { PlaceSearch } from "@/components/app/place-search";

export function HomeSearch() {
  const router = useRouter();
  return <PlaceSearch onPick={(h) => router.push(`/p/${h.code}`)} placeholder="Find your polling unit (e.g. LEA Primary School)" />;
}
