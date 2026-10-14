"use client";

import { shortenHash } from "@/lib/receipt/format";
import { useState } from "react";

type VerifyLineProps = {
  finalTextHash: string;
  chainHeadHash: string;
};

export function VerifyLine({ finalTextHash, chainHeadHash }: VerifyLineProps) {
  const [copied, setCopied] = useState<"text" | "chain" | null>(null);

  async function copy(kind: "text" | "chain", value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 1500);
    } catch {
      /* clipboard may be unavailable */
    }
  }

  return (
    <p className="font-ui text-[12px] text-page/55">
      Verify
      <span className="mx-2 text-page/30">·</span>
      <button
        type="button"
        className="underline-offset-2 hover:underline"
        title={finalTextHash}
        onClick={() => void copy("text", finalTextHash)}
      >
        text {shortenHash(finalTextHash)}
        {copied === "text" ? " (copied)" : ""}
      </button>
      <span className="mx-2 text-page/30">·</span>
      <button
        type="button"
        className="underline-offset-2 hover:underline"
        title={chainHeadHash}
        onClick={() => void copy("chain", chainHeadHash)}
      >
        chain {shortenHash(chainHeadHash)}
        {copied === "chain" ? " (copied)" : ""}
      </button>
    </p>
  );
}
