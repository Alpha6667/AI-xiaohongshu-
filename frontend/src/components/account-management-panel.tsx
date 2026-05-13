"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";

import { apiClient } from "../lib/api/client";
import type { AccountOverview } from "../lib/product";
import { getAccountConnectionStatusLabel, getAccountConnectionStatusTone, getAccountStatusLabel, getAccountStatusTone } from "../lib/product";
import { StatusPill } from "./ui";

export function AccountManagementPanel({ accounts }: { accounts: AccountOverview[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const activeAccount = accounts.find((account) => account.isActive) ?? null;

  async function handleActivate(accountId: string) {
    setPendingId(accountId);
    setNotice(null);
    try {
      await apiClient.accounts.activate(accountId);
      setNotice("已切换当前激活账号，后续发布会默认使用这个账号。");
      startTransition(() => router.refresh());
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "切换账号失败");
    } finally {
      setPendingId(null);
    }
  }

  async function handleDelete(accountId: string, accountName: string) {
    if (!window.confirm(`确认删除账号「${accountName}」？删除后需要重新添加和登录。`)) {
      return;
    }

    setPendingId(accountId);
    setNotice(null);
    try {
      await apiClient.accounts.delete(accountId);
      setNotice("账号已删除。");
      startTransition(() => router.refresh());
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "删除账号失败");
    } finally {
      setPendingId(null);
    }
  }

  async function handleCreate(formData: FormData) {
    const name = String(formData.get("name") ?? "").trim();
    const xhsId = String(formData.get("xhsId") ?? "").trim();
    const avatarUrl = String(formData.get("avatarUrl") ?? "").trim();
    const profileUrl = String(formData.get("profileUrl") ?? "").trim();

    if (!name || !xhsId) {
      setNotice("请填写昵称和小红书号。");
      return;
    }

    setCreating(true);
    setNotice(null);
    try {
      await apiClient.accounts.create({
        name,
        xhsId,
        avatarUrl: avatarUrl || null,
        profileUrl: profileUrl || null,
      });
      setNotice("账号已创建，请登录小红书。登录完成后刷新账号状态。");
      startTransition(() => router.refresh());
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "创建账号失败");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="account-manage-stack">
      {activeAccount ? (
        <section className="product-card active-account-panel">
          <span className="eyebrow">当前激活账号</span>
          <div className="account-identity">
            {activeAccount.avatarUrl ? <img src={activeAccount.avatarUrl} alt={`${activeAccount.name} 头像`} className="account-avatar" /> : <div className="account-avatar account-avatar-fallback">{activeAccount.name.slice(0, 1)}</div>}
            <div>
              <h3>{activeAccount.name}</h3>
              <p>{activeAccount.handle}</p>
            </div>
          </div>
          <p>当前发布流程默认使用这个账号。</p>
        </section>
      ) : null}

      <section className="product-card account-create-panel">
        <div className="product-section-head compact-section-head">
          <div>
            <span className="eyebrow">添加新账号</span>
            <h3>录入小红书账号资料</h3>
          </div>
        </div>
        <form action={handleCreate} className="account-create-form">
          <label className="field-block">
            <span>昵称</span>
            <input name="name" required placeholder="例如 AEziyo" />
          </label>
          <label className="field-block">
            <span>小红书号</span>
            <input name="xhsId" required placeholder="例如 364430981" />
          </label>
          <label className="field-block">
            <span>头像 URL（可选）</span>
            <input name="avatarUrl" placeholder="https://..." />
          </label>
          <label className="field-block">
            <span>主页 URL（可选）</span>
            <input name="profileUrl" placeholder="https://www.xiaohongshu.com/user/profile/..." />
          </label>
          <button type="submit" disabled={creating}>{creating ? "创建中..." : "添加新账号"}</button>
        </form>
      </section>

      <section className="product-grid product-grid-two">
        {accounts.map((account) => (
          <article key={account.id} className="product-card account-card">
            <div className="publish-card-head">
              <div className="account-identity">
                {account.avatarUrl ? <img src={account.avatarUrl} alt={`${account.name} 头像`} className="account-avatar" /> : <div className="account-avatar account-avatar-fallback">{account.name.slice(0, 1)}</div>}
                <div>
                  <span className="eyebrow">{account.handle}</span>
                  <h3>{account.name}</h3>
                  <p>小红书号 {account.xhsId ?? account.handle.replace(/^@/, "")}</p>
                </div>
              </div>
              <div className="tag-row">
                {account.isActive ? <StatusPill label="当前激活" tone="positive" /> : null}
                <StatusPill label={getAccountStatusLabel(account.status)} tone={getAccountStatusTone(account.status)} />
                <StatusPill label={getAccountConnectionStatusLabel(account.connectionStatus)} tone={getAccountConnectionStatusTone(account.connectionStatus)} />
              </div>
            </div>

            <div className="detail-meta-grid">
              <article className="detail-meta-card">
                <span className="eyebrow">登录态</span>
                <strong>{account.connectionStatus === "connected" ? "已连接" : "需登录"}</strong>
                <p>{account.lastValidatedAt ? `最近验证 ${new Date(account.lastValidatedAt).toLocaleString("zh-CN")}` : "暂无验证时间。"}</p>
              </article>
              <article className="detail-meta-card">
                <span className="eyebrow">同步状态</span>
                <strong>{account.lastSyncStatus}</strong>
                <p>{account.lastSyncError ?? "当前没有同步错误。"}</p>
              </article>
            </div>

            <div className="action-row">
              {account.isActive ? null : <button type="button" className="ghost-button" onClick={() => handleActivate(account.id)} disabled={pendingId === account.id}>设为当前账号</button>}
              <button type="button" className="ghost-button" disabled title="后端退出登录接口接入后启用">退出登录</button>
              <button type="button" className="secondary-button" onClick={() => handleDelete(account.id, account.name)} disabled={pendingId === account.id || account.isActive}>删除账号</button>
            </div>
          </article>
        ))}
      </section>

      {accounts.length === 0 ? (
        <section className="product-card">
          <article className="state-card state-card-neutral">
            <strong>当前没有账号</strong>
            <p>先添加小红书账号，再完成登录态配置。</p>
          </article>
        </section>
      ) : null}

      {notice ? <p className="feedback-text">{notice}</p> : null}
    </div>
  );
}
