import Link from "next/link";

import { AccountManagementPanel } from "../../../components/account-management-panel";
import { RefreshButton } from "../../../components/refresh-button";
import { SectionCard, SectionHeading } from "../../../components/ui";
import { apiClient } from "../../../lib/api/client";
import { adaptAccounts } from "../../../lib/product";

async function getAccountsOrNull() {
  try {
    return await apiClient.accounts.list();
  } catch {
    return null;
  }
}

export default async function AccountManagePage() {
  const accountRecords = await getAccountsOrNull();
  const accounts = accountRecords ? adaptAccounts(accountRecords) : [];

  return (
    <div className="page-stack">
      <SectionCard>
        <SectionHeading eyebrow="账号管理" title="添加、切换和维护小红书账号" description="这里集中管理所有小红书账号。当前激活账号会作为默认发布账号。" />
        {accountRecords ? null : (
          <article className="state-card state-card-warm">
            <strong>真实账号接口暂不可用</strong>
            <p>`GET /api/accounts` 请求失败，当前只能展示空账号管理状态。</p>
          </article>
        )}
        <div className="action-row">
          <RefreshButton />
          <Link href="/accounts" className="text-link product-link">返回账号运营</Link>
        </div>
      </SectionCard>

      <AccountManagementPanel accounts={accounts} />
    </div>
  );
}
