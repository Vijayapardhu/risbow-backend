import { ReactNode } from "react";

type ComplianceCardProps = {
  id: string;
  title: string;
  subtitle: string;
  bullets: string[];
  icon: ReactNode;
};

export function ComplianceCard({ id, title, subtitle, bullets, icon }: ComplianceCardProps) {
  return (
    <section id={id} className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-8 shadow-sm shadow-brand-accent/10 transition hover:-translate-y-1 hover:shadow-xl">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-accent via-indigo-400 to-blue-400 opacity-0 transition group-hover:opacity-100" />
      <div className="flex items-start gap-5">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-brand-accent">
          {icon}
        </div>
        <div>
          <h3 className="text-xl font-semibold text-brand-primary">{title}</h3>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        </div>
      </div>
      <ul className="mt-6 space-y-3 text-sm leading-relaxed text-slate-600">
        {bullets.map((item) => (
          <li key={item} className="flex items-start gap-3">
            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-brand-accent" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
