"use client";

import { startTransition, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { apiClient } from "../lib/api/client";

const AUTO_REFRESH_INTERVAL_MS = 60_000;

function getMetricsRefreshMessage(message: string) {
  if (!message.startsWith("metrics_fetch_failed:")) {
    return message;
  }

  const errorCode = message.replace("metrics_fetch_failed:", "").trim();

  if (errorCode === "metrics_fetch_login_required") {
    return "刷新数据失败：当前抓取账号还没恢复登录态，请先处理登录状态后再重试。";
  }

  if (errorCode === "post_needs_manual_verification") {
    return "刷新数据失败：需要在小红书官方页面完成人工验证后再刷新数据。";
  }

  if (errorCode === "metrics_fetch_page_structure_mismatch") {
    return "刷新数据失败：页面结构暂未命中，当前还拿不到这条内容的互动数据。";
  }

  if (errorCode === "metrics_fetch_timeout") {
    return "刷新数据失败：这次拉数超时了，请稍后再试一次。";
  }

  if (errorCode === "metrics_fetch_post_not_found") {
    return "刷新数据失败：当前平台帖子还没找到，请确认平台帖子标识是否已经稳定回写。";
  }

  if (errorCode === "metrics_fetch_network_error") {
    return "刷新数据失败：抓取链路网络异常，请稍后再试。";
  }

  if (errorCode === "metrics_fetch_not_available") {
    return "刷新数据失败：当前内容暂时还没有可用的互动数据。";
  }

  if (errorCode === "metrics_fetch_browser_error") {
    return "刷新数据失败：浏览器抓取过程异常，请稍后再试。";
  }

  return `刷新数据失败：${errorCode}`;
}

export function RefreshMetricsButton({ postId }: { postId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function doRefresh(silent = false) {
    if (!silent) setPending(true);
    setNotice(null);

    try {
      await apiClient.posts.refreshMetrics(postId);
      setLastUpdated(new Date().toLocaleString("zh-CN"));
      if (!silent) {
        setNotice("已刷新这条内容的最新数据。");
      }
      startTransition(() => router.refresh());
    } catch (error) {
      const msg = getMetricsRefreshMessage(error instanceof Error ? error.message : "刷新数据失败");
      setNotice(msg);
    } finally {
      if (!silent) setPending(false);
    }
  }

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      doRefresh(true);
    }, AUTO_REFRESH_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  return (
    <div className="refresh-metrics-actions">
      <button type="button" className="ghost-button" onClick={() => doRefresh(false)} disabled={pending}>
        {pending ? "刷新中..." : "刷新指标数据"}
      </button>
      {lastUpdated ? (
        <p className="muted-copy">上次自动刷新：{lastUpdated}</p>
      ) : null}
      {notice ? <p className="feedback-text">{notice}</p> : null}
    </div>
  );
}
