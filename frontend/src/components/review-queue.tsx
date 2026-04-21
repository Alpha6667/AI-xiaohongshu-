"use client";

import { useRouter } from "next/navigation";
import { startTransition, useMemo, useState } from "react";

import { apiClient } from "../lib/api/client";
import type { ReviewQueueItem } from "../lib/api/types";

export function ReviewQueue({ items }: { items: ReviewQueueItem[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [comments, setComments] = useState<Record<string, string>>(
    Object.fromEntries(items.map((item) => [item.id, item.reviewRecords.at(-1)?.comment ?? "通过前请确认当前内容细节。"]))
  );

  const latestComments = useMemo(
    () =>
      Object.fromEntries(
        items.map((item) => [item.id, item.reviewRecords.at(-1)?.comment ?? "暂无审核记录"])
      ),
    [items]
  );

  async function handleAction(postId: string, action: "approve" | "reject") {
    setPendingId(postId);
    setMessages((current) => ({ ...current, [postId]: "" }));
    try {
      if (action === "approve") {
        await apiClient.posts.approve(postId, { comment: comments[postId] ?? "", operator: "frontend-reviewer" });
      } else {
        await apiClient.posts.reject(postId, { comment: comments[postId] ?? "", operator: "frontend-reviewer" });
      }
      setMessages((current) => ({ ...current, [postId]: action === "approve" ? "已批准。" : "已退回。" }));
      startTransition(() => router.refresh());
    } catch (error) {
      setMessages((current) => ({ ...current, [postId]: error instanceof Error ? error.message : "操作失败" }));
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="review-layout">
      {items.map((item) => (
        <article key={item.id} className="review-panel">
          <div className="review-main">
            <span className="eyebrow">待审核内容</span>
            <h3>{item.title}</h3>
            <p>{item.topic}</p>
            <div className="review-snippet">
              <strong>正文摘要</strong>
              <p>{item.body}</p>
            </div>
            <div className="review-snippet">
              <strong>最近审核记录</strong>
              <p>{latestComments[item.id]}</p>
            </div>
          </div>

          <div className="review-actions-panel">
            <label className="field-block">
              <span>审核意见输入区</span>
              <textarea
                rows={8}
                value={comments[item.id] ?? ""}
                onChange={(event) => setComments((current) => ({ ...current, [item.id]: event.target.value }))}
                disabled={pendingId === item.id}
              />
            </label>
            <div className="action-row">
              <button type="button" onClick={() => handleAction(item.id, "approve")} disabled={pendingId === item.id}>
                批准
              </button>
              <button type="button" onClick={() => handleAction(item.id, "reject")} disabled={pendingId === item.id}>
                退回
              </button>
            </div>
            <div className="endpoint-stack">
              <code>{apiClient.posts.approveEndpoint(item.id)}</code>
              <code>{apiClient.posts.rejectEndpoint(item.id)}</code>
            </div>
            {messages[item.id] ? <p className="feedback-text">{messages[item.id]}</p> : null}
          </div>
        </article>
      ))}
    </div>
  );
}
