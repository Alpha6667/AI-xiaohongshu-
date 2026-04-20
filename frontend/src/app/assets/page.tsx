import { SectionCard, SectionHeading, StatusPill } from "../../components/ui";
import { apiClient } from "../../lib/api/client";

export default function AssetsPage() {
  const assets = apiClient.assets.list();

  return (
    <div className="page-stack">
      <SectionCard>
        <SectionHeading eyebrow="Assets" title="素材库" description="本轮只建立静态素材展示和字段边界，后续接上传与关联。" />

        <div className="asset-grid">
          {assets.map((asset) => (
            <article key={asset.id} className="asset-card">
              <div className="asset-cover" style={{ backgroundImage: `url(${asset.url})` }} />
              <div className="asset-copy">
                <StatusPill label={asset.type} />
                <h3>{asset.name}</h3>
                <p>
                  {asset.width} x {asset.height} / {asset.sizeKb} KB
                </p>
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
