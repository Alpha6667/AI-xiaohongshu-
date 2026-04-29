import { ImageProviderSettingsPanel } from "../../../components/image-provider-settings-panel";
import { SectionCard, SectionHeading } from "../../../components/ui";

export default function ImageModelSettingsPage() {
  return (
    <div className="page-stack">
      <SectionCard>
        <SectionHeading eyebrow="AI 生成设置" title="配置生图厂商、API Key 和默认模型" description="这里配置的是服务端生图能力，不是浏览器端直连第三方模型的凭据。" />
        <ImageProviderSettingsPanel />
      </SectionCard>
    </div>
  );
}
