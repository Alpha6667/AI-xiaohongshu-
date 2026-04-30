"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";

import { apiClient } from "../lib/api/client";

export function AccountSyncButton({ accountId }: { accountId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleClick() {
    setPending(true);
    setNotice(null);

    try {
      const result = await apiClient.accounts.triggerWorksSync(accountId);
      setNotice(result.lastSyncError ?? `已触发同步，当前状态：${result.lastSyncStatus ?? "unknown"}`);
      startTransition(() => router.refresh());
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "触发同步失败");
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <button type="button" className="ghost-button" onClick={handleClick} disabled={pending}>
        {pending ? "同步中..." : "同步作品数据"}
      </button>
      {notice ? <p className="muted-inline">{notice}</p> : null}
    </div>
  );
}
