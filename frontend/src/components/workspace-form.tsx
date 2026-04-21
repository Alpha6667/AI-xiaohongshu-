"use client";

import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";

import { apiClient } from "../lib/api/client";
import type { PostDetail } from "../lib/api/types";
import { StatusPill } from "./ui";

export function WorkspaceForm({ post }: { post: PostDetail }) {
  const router = useRouter();
  const [topic, setTopic] = useState(post.topic);
  const [title, setTitle] = useState(post.title);
  const [body, setBody] = useState(post.body);
  const [tags, setTags] = useState(post.tags.join(", "));
  const [comment, setComment] = useState(post.reviewRecords.at(-1)?.comment ?? "请确认语气与封面文案是否可提交审核。");
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSave() {
    setPending(true);
    setNotice(null);
    try {
      await apiClient.posts.update(post.id, {
        topic,
        title,
        body,
        tags: tags.split(",").map((tag) => tag.trim()).filter(Boolean),
      });
      setNotice("已保存到真实接口。");
      startTransition(() => router.refresh());
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "保存失败");
    } finally {
      setPending(false);
    }
  }

  async function handleSubmitReview() {
    setPending(true);
    setNotice(null);
    try {
      await apiClient.posts.submitReview(post.id, {
        comment,
        operator: "frontend-operator",
      });
      setNotice("已提交审核。");
      startTransition(() => router.refresh());
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "提交审核失败");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <div className="field-grid">
        <label className="field-block">
          <span>主题输入</span>
          <input value={topic} onChange={(event) => setTopic(event.target.value)} disabled={pending} />
        </label>
        <label className="field-block">
          <span>标题</span>
          <input value={title} onChange={(event) => setTitle(event.target.value)} disabled={pending} />
        </label>
      </div>

      <label className="field-block">
        <span>正文编辑</span>
        <textarea value={body} rows={8} onChange={(event) => setBody(event.target.value)} disabled={pending} />
      </label>

      <label className="field-block">
        <span>标签区域</span>
        <input value={tags} onChange={(event) => setTags(event.target.value)} disabled={pending} />
      </label>

      <div className="field-block">
        <span>当前状态</span>
        <div className="tag-row">
          <StatusPill label={post.status} tone={post.status === "approved" || post.status === "published" ? "positive" : post.status === "in_review" ? "warm" : "neutral"} />
          {tags.split(",").map((tag) => tag.trim()).filter(Boolean).map((tag) => (
            <StatusPill key={tag} label={`#${tag}`} />
          ))}
        </div>
      </div>

      <label className="field-block">
        <span>审核备注</span>
        <textarea value={comment} rows={4} onChange={(event) => setComment(event.target.value)} disabled={pending} />
      </label>

      <div className="action-row">
        <button type="button" onClick={handleSave} disabled={pending}>
          {pending ? "处理中..." : "保存草稿"}
        </button>
        <button type="button" disabled>
          生成文案
        </button>
        <button type="button" disabled>
          生成图片
        </button>
        <button type="button" onClick={handleSubmitReview} disabled={pending || post.status !== "draft"}>
          提交审核
        </button>
      </div>

      {notice ? <p className="feedback-text">{notice}</p> : null}
    </>
  );
}
