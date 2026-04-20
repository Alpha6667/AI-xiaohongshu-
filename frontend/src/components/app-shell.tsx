"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "内容工作台" },
  { href: "/dashboard", label: "数据看板" },
  { href: "/posts", label: "帖子库" },
  { href: "/review", label: "审核台" },
  { href: "/assets", label: "素材库" },
];

function matchPath(pathname: string, href: string) {
  if (href === "/") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="shell">
      <aside className="shell-sidebar">
        <div className="brand-panel">
          <span className="eyebrow">AI Xiaohongshu</span>
          <strong>内容运营工作台</strong>
          <p>围绕生成、编辑、审核与发布组织内容流，不做通用 ERP 式后台。</p>
        </div>
        <nav className="main-nav" aria-label="后台导航">
          {navItems.map((item) => {
            const active = matchPath(pathname, item.href);

            return (
              <Link key={item.href} href={item.href} className={`nav-item${active ? " nav-item-active" : ""}`}>
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="shell-main">
        <header className="topbar">
          <div>
            <span className="eyebrow">First Iteration</span>
            <h1>小红书 AI 发帖平台</h1>
          </div>
          <div className="topbar-meta">
            <div>
              <span className="topbar-label">目标</span>
              <strong>可演示静态工作台</strong>
            </div>
            <div>
              <span className="topbar-label">数据源</span>
              <strong>Mock + API 边界预留</strong>
            </div>
          </div>
        </header>

        <main className="page-container">{children}</main>
      </div>
    </div>
  );
}
