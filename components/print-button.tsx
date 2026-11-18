"use client";
import { Button } from "@/components/ui";

export function PrintButton({ label }: { label: string }) {
  return <Button onClick={() => window.print()} className="min-h-12 px-6">{label}</Button>;
}
