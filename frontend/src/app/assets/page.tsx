import { SectionCard, SectionHeading, StatusPill } from "../../components/ui";
import { apiClient } from "../../lib/api/client";

export default async function AssetsPage() {
  const assets = await apiClient.assets.list();

  return (
    <div className="page-stack">
      <SectionCard>
        <SectionHeading eyebrow="Assets" title="素材库" description="当前直接读取真实素材列表，优先保证与帖子关联素材展示保持一致。" />

        <div className="asset-grid">
          {assets.map((asset) => (
            <article key={asset.id} className="asset-card">
              <div className="asset-cover" style={{ backgroundImage: `url(${asset.url})` }} />
              <div className="asset-copy">
                <StatusPill label={asset.contentType} />
                <h3>{asset.name}</h3>
                <p>{asset.fileName}</p>
              </div>
            </article>
          ))}
        </div>

        <div className="endpoint-stack single-endpoint">
          <code>{apiClient.assets.uploadEndpoint}</code>
        </div>
      </SectionCard>
    </div>
  );
}
