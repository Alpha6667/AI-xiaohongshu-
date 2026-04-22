"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems: Array<{ href: Route; label: string }> = [
  { href: "/", label: "总览首页" },
  { href: "/review", label: "发帖工作台" },
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
          <span className="eyebrow">小红书日常模式</span>
          <strong>发帖工作台</strong>
          <p>今天发什么、选哪版、什么时候交给 OpenClaw、发完表现怎么样，都按真实操作顺序组织。</p>
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
            <span className="eyebrow">单账号日常发帖闭环</span>
            <h1>把今天要发的内容一路推进到发布和复盘</h1>
          </div>
          <div className="topbar-meta">
            <div>
              <span className="topbar-label">账号接入</span>
              <strong>单账号已接入</strong>
            </div>
            <div>
              <span className="topbar-label">执行链路</span>
              <strong>主题到复盘一条线</strong>
            </div>
          </div>
        </header>

        <main className="page-container">{children}</main>
      </div>
    </div>
  );
}
