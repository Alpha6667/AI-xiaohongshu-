"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems: Array<{ href: Route; label: string }> = [
  { href: "/", label: "任务总览" },
  { href: "/tasks", label: "消息任务中心" },
  { href: "/accounts", label: "多账号运营" },
  { href: "/review", label: "内容确认台" },
  { href: "/dashboard", label: "发布中心" },
  { href: "/posts", label: "帖子与数据" },
];

function matchPath(pathname: string, href: Route) {
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
          <span className="eyebrow">OpenClaw 消息驱动模式</span>
          <strong>多账号发帖后台</strong>
          <p>先接住聊天里来的发帖需求，再把任务分发到账号、确认内容、执行发布，最后回到后台看结果和数据。</p>
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
            <span className="eyebrow">消息 / 任务 / 确认 / 发布 / 数据</span>
            <h1>把 OpenClaw 收到的发帖需求一路推进到多账号发布和复盘</h1>
          </div>
          <div className="topbar-meta">
            <div>
              <span className="topbar-label">消息入口</span>
              <strong>聊天任务直达后台</strong>
            </div>
            <div>
              <span className="topbar-label">运营模式</span>
              <strong>多账号并行处理</strong>
            </div>
          </div>
        </header>

        <main className="page-container">{children}</main>
      </div>
    </div>
  );
}
