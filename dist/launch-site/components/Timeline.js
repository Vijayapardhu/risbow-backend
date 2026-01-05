"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Timeline = Timeline;
function Timeline({ items }) {
    return (<div id="timeline" className="relative mt-16">
      <div className="absolute left-4 top-0 h-full w-1 rounded-full bg-gradient-to-b from-brand-accent to-blue-300 md:left-1/2 md:-translate-x-1/2"/>
      <div className="space-y-12 md:space-y-16">
        {items.map((item, index) => (<div key={item.title} className={`relative flex flex-col gap-6 md:flex-row md:items-center ${index % 2 === 0 ? "md:flex-row-reverse" : ""}`}>
            <div className="md:w-1/2">
              <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm shadow-slate-200/60">
                <p className="text-xs font-semibold uppercase tracking-widest text-brand-accent">
                  {item.period}
                </p>
                <h4 className="mt-2 text-xl font-semibold text-brand-primary">{item.title}</h4>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{item.detail}</p>
              </div>
            </div>
            <div className="relative md:w-1/2">
              <div className="h-12 w-12 rounded-full border-4 border-white bg-brand-accent shadow-lg shadow-brand-accent/40 md:absolute md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2"/>
            </div>
          </div>))}
      </div>
    </div>);
}
//# sourceMappingURL=Timeline.js.map