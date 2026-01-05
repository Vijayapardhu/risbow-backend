type FAQItem = {
  question: string;
  answer: string;
};

type FAQProps = {
  items: FAQItem[];
};

export function FAQ({ items }: FAQProps) {
  return (
    <section id="faq" className="mt-20 rounded-3xl border border-slate-200 bg-white p-10 shadow-sm shadow-slate-200/50">
      <h3 className="text-2xl font-semibold text-brand-primary">Frequently Asked Compliance Questions</h3>
      <div className="mt-8 space-y-6">
        {items.map((item) => (
          <details key={item.question} className="group rounded-2xl border border-slate-200/70 bg-brand-soft/50 px-6 py-4 transition">
            <summary className="flex cursor-pointer items-center justify-between text-sm font-semibold text-brand-primary">
              {item.question}
              <span className="text-brand-accent transition group-open:rotate-45">+</span>
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
