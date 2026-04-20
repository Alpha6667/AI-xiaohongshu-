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
      {description ? <p>{description}</p> : null}
    </header>
  );
}

export function StatusPill({ label, tone = "neutral" }: { label: string; tone?: "neutral" | "warm" | "positive" }) {
  return <span className={`status-pill status-${tone}`}>{label}</span>;
}
