"use client";

import { useState, useEffect } from "react";
import { useProgressStore } from "@/stores/progressStore";

export default function TransferToggle() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isTransfer = useProgressStore((s) => s.isTransferStudent);
  const setTransfer = useProgressStore((s) => s.setTransferStudent);

  if (!mounted) return null;

  return (
    <button
      onClick={() => setTransfer(!isTransfer)}
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all border ${
        isTransfer
          ? "bg-amber-900/20 text-amber-400 border-amber-800/50"
          : "text-zinc-600 border-beach-border hover:text-zinc-400 hover:border-zinc-700"
      }`}
      title={
        isTransfer
          ? "Transfer: lower-division GE marked complete"
          : "Mark as transfer student (completes GE)"
      }
    >
      <span
        className={`w-2.5 h-2.5 rounded-full border-[1.5px] transition-all ${
          isTransfer ? "border-amber-400 bg-amber-400" : "border-zinc-600"
        }`}
      />
      Transfer
    </button>
  );
}
