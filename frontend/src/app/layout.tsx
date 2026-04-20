import type { Metadata } from "next";
import { AppShell } from "../components/app-shell";
import "../styles/globals.css";

export const metadata: Metadata = {
  title: "AI Xiaohongshu Posting Platform",
  description: "Single-account Xiaohongshu AI posting workspace",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
