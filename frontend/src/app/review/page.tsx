import { SectionCard, SectionHeading } from "../../components/ui";
import { apiClient } from "../../lib/api/client";

export default function ReviewPage() {
  const queue = apiClient.review.list();

  return (
    <div className="page-stack">
      <SectionCard>
        <SectionHeading eyebrow="Review" title="审核页" description="突出当前版本内容、审核意见输入区和批准/退回操作区的优先级。" />

        <div className="review-layout">
          {queue.map((item) => (
            <article key={item.postId} className="review-panel">
              <div className="review-main">
                <span className="eyebrow">待审核内容</span>
                <h3>{item.title}</h3>
                <p>{item.topic}</p>
                <div className="review-snippet">
                  <strong>审核备注</strong>
                  <p>{item.reviewComment}</p>
                </div>
              </div>

              <div className="review-actions-panel">
                <label className="field-block">
                  <span>审核意见输入区</span>
                  <textarea rows={8} defaultValue={item.reviewComment} readOnly />
                </label>
                <div className="action-row">
                  <button type="button">批准</button>
                  <button type="button">退回</button>
                </div>
                <div className="endpoint-stack">
                  <code>{apiClient.posts.approveEndpoint(item.postId)}</code>
                  <code>{apiClient.posts.rejectEndpoint(item.postId)}</code>
                </div>
              </div>
            </article>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
