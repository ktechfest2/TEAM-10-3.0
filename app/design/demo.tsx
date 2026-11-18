"use client";
import { useState } from "react";
import { HoldToSign } from "@/components/hold-to-sign";
import { Seal } from "@/components/seal";

export function DesignDemo() {
  const [signed, setSigned] = useState<string[]>([]);
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-around">
      <HoldToSign ariaLabel="Press and hold to sign as APC agent" onComplete={() => setSigned((s) => [...s, "APC"])} />
      <Seal state={signed.length >= 2 ? "sealed" : signed.length === 1 ? "witnessed" : "none"} signed={signed} className="h-24 w-36" />
      <HoldToSign label="Second party" ariaLabel="Press and hold to sign as PDP agent" onComplete={() => setSigned((s) => [...s, "PDP"])} />
    </div>
  );
}
