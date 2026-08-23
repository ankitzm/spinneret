"use client";
import { useState } from "react";

export function CopyId({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(id); setCopied(true); setTimeout(() => setCopied(false), 1200); }}
      className="inline-flex items-center gap-2 rounded-md border border-line bg-kinari px-2 py-1 font-mono text-xs text-sumi transition-colors hover:border-ai active:scale-[0.98]"
      title="Copy Collector ID"
      aria-label={`Copy Collector ID ${id}`}
    >
      {id}
      <span className={copied ? "text-tokiwa" : "text-usu"}>{copied ? "copied" : "copy"}</span>
    </button>
  );
}
