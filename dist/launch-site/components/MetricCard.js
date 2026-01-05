"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetricCard = MetricCard;
function MetricCard({ label, value, description }) {
    return (<div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/40">
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
        {label}
      </p>
      <p className="mt-3 text-3xl font-semibold text-brand-primary">{value}</p>
      <p className="mt-3 text-sm text-slate-500">{description}</p>
    </div>);
}
//# sourceMappingURL=MetricCard.js.map