import { ReviewQueue } from "../../components/review-queue";
import { SectionCard, SectionHeading } from "../../components/ui";
import { apiClient } from "../../lib/api/client";

export default async function ReviewPage() {
  const queue = await apiClient.review.list();

  return (
    <div className="page-stack">
      <SectionCard>
        <SectionHeading eyebrow="Review" title="审核页" description="突出当前版本内容、审核意见输入区和批准/退回操作区的优先级。" />
        {queue.length > 0 ? <ReviewQueue items={queue} /> : <p className="muted-copy">当前没有待审核内容。</p>}
      </SectionCard>
    </div>
  );
}
