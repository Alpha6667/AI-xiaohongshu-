"use client";

import Link from "next/link";
import { startTransition, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { apiClient } from "../lib/api/client";
import { adaptAccounts, type AccountOverview, getAccountConnectionStatusLabel, getAccountConnectionStatusTone } from "../lib/product";
import { StatusPill } from "./ui";

export function AccountSwitcher() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<AccountOverview[]>([]);
  const [open, setOpen] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadAccounts() {
      try {
        const records = await apiClient.accounts.list();
        if (!cancelled) {
          setAccounts(adaptAccounts(records));
        }
      } catch {
        if (!cancelled) {
          setAccounts([]);
          setNotice("账号列表暂不可用");
        }
      }
    }

    void loadAccounts();
    return () => {
      cancelled = true;
    };
  }, []);

  const activeAccount = accounts.find((account) => account.isActive) ?? accounts[0] ?? null;

  async function handleActivate(account: AccountOverview) {
    setPendingId(account.id);
    setNotice(null);
    try {
      await apiClient.accounts.activate(account.id);
      const records = await apiClient.accounts.list();
      setAccounts(adaptAccounts(records));
      setOpen(false);
      startTransition(() => router.refresh());
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "切换账号失败");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="account-switcher">
      <button type="button" className="account-switcher-trigger" onClick={() => setOpen((value) => !value)} aria-haspopup="menu" aria-expanded={open}>
        {activeAccount?.avatarUrl ? <img src={activeAccount.avatarUrl} alt={`${activeAccount.name} 头像`} className="account-avatar" /> : <span className="account-avatar account-avatar-fallback">{activeAccount?.name.slice(0, 1) ?? "?"}</span>}
        <span>
          <span className="topbar-label">当前账号</span>
          <strong>{activeAccount?.name ?? "暂无账号"}</strong>
        </span>
      </button>

      {open ? (
        <div className="account-switcher-menu" role="menu">
          <div className="account-switcher-current">
            <span className="eyebrow">正在使用</span>
            <strong>{activeAccount?.name ?? "暂无激活账号"}</strong>
            <p>{activeAccount?.handle ?? "请先添加账号"}</p>
          </div>

          <div className="account-switcher-list">
            {accounts.map((account) => (
              <button key={account.id} type="button" className={`account-switcher-item${account.isActive ? " account-switcher-item-active" : ""}`} onClick={() => handleActivate(account)} disabled={pendingId === account.id || account.isActive} role="menuitem">
                {account.avatarUrl ? <img src={account.avatarUrl} alt={`${account.name} 头像`} className="account-avatar" /> : <span className="account-avatar account-avatar-fallback">{account.name.slice(0, 1)}</span>}
                <span className="account-switcher-copy">
                  <strong>{account.name}</strong>
                  <span>{account.handle}</span>
                </span>
                <StatusPill label={account.isActive ? "当前" : getAccountConnectionStatusLabel(account.connectionStatus)} tone={account.isActive ? "positive" : getAccountConnectionStatusTone(account.connectionStatus)} />
              </button>
            ))}
          </div>

          {accounts.length === 0 ? <p className="muted-copy">当前没有账号，请先添加新账号。</p> : null}
          {notice ? <p className="feedback-text">{notice}</p> : null}

          <div className="account-switcher-actions">
            <Link href="/accounts/manage" onClick={() => setOpen(false)}>管理账号</Link>
            <Link href="/accounts/manage" onClick={() => setOpen(false)}>添加新账号</Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
