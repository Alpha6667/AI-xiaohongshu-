import type { ReactNode } from "react";

export function SectionCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`ui-card ${className}`.trim()}>{children}</section>;
}

export function SectionHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description?: string }) {
  return (
    <header className="section-heading">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
      </div>
      {description ? <HelpTip label="说明" content={description} /> : null}
    </header>
  );
}

export function StatusPill({ label, tone = "neutral" }: { label: string; tone?: "neutral" | "warm" | "positive" | "critical" }) {
  return <span className={`status-pill status-${tone}`}>{label}</span>;
}

export function HelpTip({ label = "说明", content }: { label?: string; content: ReactNode }) {
  return (
    <span className="help-tip" tabIndex={0} aria-label={typeof content === "string" ? content : label}>
      ?
      <span className="help-tip-content">{content}</span>
    </span>
  );
}

export function CompactStatus({ label, value, tone = "neutral" }: { label: string; value: ReactNode; tone?: "neutral" | "warm" | "positive" | "critical" }) {
  return (
    <article className={`compact-status compact-status-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

export function CollapsibleDetails({ summary, children, defaultOpen = false }: { summary: ReactNode; children: ReactNode; defaultOpen?: boolean }) {
  return (
    <details className="collapsible-details" open={defaultOpen}>
      <summary>{summary}</summary>
      <div>{children}</div>
    </details>
  );
}
