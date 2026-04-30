"use client";

import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";

export function RefreshButton({ label = "刷新最新数据", className = "ghost-button" }: { label?: string; className?: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  return (
    <button
      type="button"
      className={className}
      disabled={pending}
      onClick={() => {
        setPending(true);
        startTransition(() => {
          router.refresh();
          setPending(false);
        });
      }}
    >
      {pending ? "刷新中..." : label}
    </button>
  );
}
