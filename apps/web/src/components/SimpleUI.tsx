import Link from "next/link";
import type { ReactNode } from "react";

export function SectionHeader({
  label,
  title,
  copy,
  id,
}: {
  label: string;
  title: string;
  copy?: string;
  id?: string;
}) {
  return (
    <header className="simple-heading">
      <p className="simple-label">{label}</p>
      <h2 id={id}>{title}</h2>
      {copy ? <p>{copy}</p> : null}
    </header>
  );
}

export function SimpleCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <article className={`simple-card ${className}`.trim()}>{children}</article>;
}

export function StepCard({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <SimpleCard className="step-card">
      <span className="step-card__number" aria-hidden="true">{number}</span>
      <h3>{title}</h3>
      <p>{children}</p>
    </SimpleCard>
  );
}

export function ActionGroup() {
  return (
    <div className="simple-actions">
      <Link className="simple-button simple-button--primary" href="/create">ابدأ جلسة</Link>
      <Link className="simple-button simple-button--secondary" href="/join">عندي رمز</Link>
    </div>
  );
}

export function SimplePageHero({
  label,
  title,
  copy,
  action = true,
}: {
  label: string;
  title: string;
  copy: string;
  action?: boolean;
}) {
  return (
    <header className="simple-page-hero">
      <div className="simple-container">
        <p className="simple-label">{label}</p>
        <h1>{title}</h1>
        <p>{copy}</p>
        {action ? <ActionGroup /> : null}
      </div>
    </header>
  );
}
