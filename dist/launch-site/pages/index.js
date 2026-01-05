"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Home;
const head_1 = __importDefault(require("next/head"));
const link_1 = __importDefault(require("next/link"));
const Layout_1 = require("../components/Layout");
const MetricCard_1 = require("../components/MetricCard");
const ComplianceCard_1 = require("../components/ComplianceCard");
const Timeline_1 = require("../components/Timeline");
const FAQ_1 = require("../components/FAQ");
const outline_1 = require("@heroicons/react/24/outline");
const timelineItems = [
    {
        title: "Blueprint Alignment",
        period: "Week 1",
        detail: "Finalize Razorpay card network compliance and map mandatory SMS delivery workflows across domestic operators."
    },
    {
        title: "Sandbox Validation",
        period: "Week 2",
        detail: "Dry run refunds, partial captures, and UPI flows while validating DLT templates with telecom partners."
    },
    {
        title: "Risk and Audit Sign-off",
        period: "Week 3",
        detail: "Deliver consolidated transaction audit trails plus consent logs that satisfy both RBI and TRAI review boards."
    },
    {
        title: "Public Launch",
        period: "Week 4",
        detail: "Go live with automated rule monitoring, rollback guardrails, and proactive SMS fallbacks for critical events."
    }
];
const faqItems = [
    {
        question: "How are Razorpay rule updates surfaced?",
        answer: "Rule diffs are synced nightly through the Razorpay compliance feed and pushed to your dashboard with change impact analysis and mitigation playbooks."
    },
    {
        question: "What protections exist for SMS operator downtimes?",
        answer: "We triage sender IDs across three priority telecom routes and trigger WhatsApp or email fallbacks when delivery receipts stall beyond 90 seconds."
    },
    {
        question: "Can we export audit evidence?",
        answer: "Yes. Generate signed PDF reports or raw JSON for both payment and messaging channels at any time, fulfilling RBI and TRAI evidence formats."
    }
];
function Home() {
    return (<Layout_1.Layout>
      <head_1.default>
        <title>Risbow Launchpad | Razorpay + SMS Compliance</title>
        <meta name="description" content="Launch-ready compliance playbook covering Razorpay payment rules and SMS provider regulations with guided automation."/>
      </head_1.default>
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-6xl gap-16 px-6 py-20 md:grid-cols-2 md:py-24">
          <div className="space-y-8">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-accent/30 bg-brand-soft px-4 py-1 text-xs font-semibold uppercase tracking-widest text-brand-accent">
              Launching Soon
            </span>
            <h1 className="text-4xl font-semibold leading-tight text-brand-primary md:text-5xl">
              Payment and Messaging Compliance That Feels Effortless
            </h1>
            <p className="text-base leading-relaxed text-slate-600">
              Risbow Launchpad removes the chaos of Razorpay compliance audits and SMS provider rule management. Track every mandate, template, and fallback from a single control surface built for modern commerce teams.
            </p>
            <div className="flex flex-wrap gap-4" id="signup">
              <link_1.default href="mailto:hello@risbow.org?subject=Launch%20Waitlist" className="rounded-full bg-brand-accent px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-accent/30 transition hover:bg-indigo-600">
                Reserve beta seat
              </link_1.default>
              <link_1.default href="#payments" className="rounded-full border border-brand-accent/40 px-6 py-3 text-sm font-semibold text-brand-accent transition hover:border-brand-accent hover:text-brand-accent">
                See compliance pillars
              </link_1.default>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <MetricCard_1.MetricCard label="Audit prep time" value="↓ 72%" description="Prebuilt Razorpay evidence kits with automated version history."/>
              <MetricCard_1.MetricCard label="Delivery confidence" value="99.4%" description="Redundant SMS routes plus instant opt-in tracking."/>
              <MetricCard_1.MetricCard label="Rollback safety" value="< 30s" description="Time to restore previous rule set with safeguarded refunds."/>
            </div>
          </div>
          <div className="relative">
            <div className="absolute left-1/2 top-10 -z-10 h-72 w-72 -translate-x-1/2 rounded-full bg-brand-accent/10 blur-3xl"/>
            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xl shadow-brand-accent/20">
              <p className="text-sm font-semibold uppercase tracking-[0.4em] text-brand-accent">
                Launch Checklist Snapshot
              </p>
              <ul className="mt-6 space-y-5 text-sm text-slate-600">
                <li className="flex items-start gap-3">
                  <outline_1.ShieldCheckIcon className="h-6 w-6 text-brand-accent"/>
                  <span>Card network risk matrix auto-mapped to Razorpay rulebook v23.4.</span>
                </li>
                <li className="flex items-start gap-3">
                  <outline_1.ReceiptRefundIcon className="h-6 w-6 text-brand-accent"/>
                  <span>Refund, chargeback, and settlement reconciliations exported to RBI audit format.</span>
                </li>
                <li className="flex items-start gap-3">
                  <outline_1.BoltIcon className="h-6 w-6 text-brand-accent"/>
                  <span>DLT-approved templates sync with telecom operators and flag expirations before they break campaigns.</span>
                </li>
                <li className="flex items-start gap-3">
                  <outline_1.ChatBubbleBottomCenterTextIcon className="h-6 w-6 text-brand-accent"/>
                  <span>Two-way consent logging with traceable OTP callbacks and fallback messaging routes.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-16">
        <div className="grid gap-8 md:grid-cols-2">
          <ComplianceCard_1.ComplianceCard id="payments" title="Razorpay Payment Rule Engine" subtitle="Mapped to RBI, PCI DSS, and network circulars" icon={<outline_1.ShieldCheckIcon className="h-6 w-6"/>} bullets={[
            "Instant visibility into rule deltas with red, amber, green risk scoring.",
            "Automated reconciliation of settlement cycles, refunds, and dispute SLAs.",
            "Dynamic guardrails for tokenization, UPI, and mandate management to keep payment flows certified.",
            "Proactive alerts for Razorpay incident advisories with recommended mitigation scripts."
        ]}/>
          <ComplianceCard_1.ComplianceCard id="messaging" title="SMS Provider Trust Layer" subtitle="TRAI DLT compliant at every step" icon={<outline_1.ChatBubbleBottomCenterTextIcon className="h-6 w-6"/>} bullets={[
            "Centralized template registry with auto-renewal reminders and telecom approval status.",
            "Multi-route routing logic that shifts traffic when delivery receipts degrade.",
            "Consent, opt-out, and scrub workflows aligned to NDNC regulations.",
            "Delivery evidence and failure tagging surfaced to customer care and analytics teams."
        ]}/>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-16">
        <div className="rounded-3xl bg-brand-primary px-10 py-12 text-white shadow-2xl shadow-brand-accent/30">
          <p className="text-sm uppercase tracking-[0.4em] text-brand-soft">
            Harmonized compliance
          </p>
          <h2 className="mt-4 text-3xl font-semibold md:text-4xl">
            One launch plan. Two regulated surfaces. Zero surprises.
          </h2>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-slate-200">
            From Razorpay policy updates to telecom DLT mandates, Risbow Launchpad orchestrates evidence, approvals, and rollbacks. Configure once, get notified weekly, and stay two steps ahead of regulators.
          </p>
          <div className="mt-8 flex flex-wrap gap-4 text-sm font-semibold">
            <span className="rounded-full bg-white/10 px-4 py-2">Real-time rule diff feed</span>
            <span className="rounded-full bg-white/10 px-4 py-2">Consent intelligence dashboard</span>
            <span className="rounded-full bg-white/10 px-4 py-2">Fraud triage automations</span>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24">
        <h2 className="text-3xl font-semibold text-brand-primary md:text-4xl">
          Zero-drift launch timeline
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600">
          Follow this four-week playbook to ship with confidence. Each milestone includes embedded tasks for payment success, refunds, chargebacks, and messaging sender reputations.
        </p>
        <Timeline_1.Timeline items={timelineItems}/>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24">
        <FAQ_1.FAQ items={faqItems}/>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-32">
        <div className="grid gap-8 rounded-3xl border border-brand-accent/20 bg-brand-soft p-10 text-sm leading-relaxed text-slate-600 md:grid-cols-2">
          <div>
            <h3 className="text-2xl font-semibold text-brand-primary">Launch support packages</h3>
            <p className="mt-3">
              Choose the track that matches your go-live ambition. Every package includes a dedicated compliance specialist and a guaranteed Razorpay rule update SLA.
            </p>
            <ul className="mt-6 space-y-3">
              <li className="rounded-2xl bg-white p-4 shadow-sm">
                <p className="text-sm font-semibold text-brand-primary">Navigator</p>
                <p className="text-xs text-slate-500">Weekly syncs, alert setup, evidence export coaching.</p>
              </li>
              <li className="rounded-2xl bg-white p-4 shadow-sm">
                <p className="text-sm font-semibold text-brand-primary">Command</p>
                <p className="text-xs text-slate-500">Hands-on migration, template remediation, impact drills.</p>
              </li>
              <li className="rounded-2xl bg-white p-4 shadow-sm">
                <p className="text-sm font-semibold text-brand-primary">Mission Control</p>
                <p className="text-xs text-slate-500">24x7 response, premium teleco partnerships, quarterly audits.</p>
              </li>
            </ul>
          </div>
          <div className="rounded-3xl border border-brand-accent/20 bg-white p-6 shadow-lg shadow-brand-accent/20">
            <h4 className="text-lg font-semibold text-brand-primary">Policy trackers included</h4>
            <ul className="mt-4 space-y-3">
              <li>Razorpay Acquirer Directives (monthly)</li>
              <li>Reserve Bank payments circulars (fortnightly)</li>
              <li>TRAI and DLT sender compliance bulletins (weekly)</li>
              <li>Regional telecom fair usage thresholds (real time)</li>
            </ul>
            <p className="mt-6 text-xs text-slate-500">
              Need something specific? Mention it in your waitlist note and we will tailor the compliance feed for your vertical.
            </p>
          </div>
        </div>
      </section>
    </Layout_1.Layout>);
}
//# sourceMappingURL=index.js.map