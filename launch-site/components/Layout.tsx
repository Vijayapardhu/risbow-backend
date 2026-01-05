import Link from "next/link";
import { ReactNode } from "react";

type LayoutProps = {
  children: ReactNode;
};

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-soft via-white to-white">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-accent text-lg font-semibold text-white">
              RB
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.4em] text-brand-accent">
                Risbow
              </p>
              <p className="text-sm text-slate-500">Unified Commerce Platform</p>
            </div>
          </div>
          <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
            <Link href="#payments" className="transition hover:text-brand-accent">
              Razor Rules
            </Link>
            <Link href="#messaging" className="transition hover:text-brand-accent">
              SMS Readiness
            </Link>
            <Link href="#timeline" className="transition hover:text-brand-accent">
              Launch Plan
            </Link>
            <Link href="#faq" className="transition hover:text-brand-accent">
              FAQ
            </Link>
          </nav>
          <Link
            href="#signup"
            className="rounded-full bg-brand-accent px-6 py-2 text-sm font-semibold text-white shadow-lg shadow-brand-accent/30 transition hover:bg-indigo-600"
          >
            Join the beta
          </Link>
        </div>
      </header>
      <main>{children}</main>
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-8 text-sm text-slate-500">
          <p>© {new Date().getFullYear()} Risbow Org. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="#faq" className="hover:text-brand-accent">
              Support
            </Link>
            <Link href="#" className="hover:text-brand-accent">
              Privacy
            </Link>
            <Link href="#" className="hover:text-brand-accent">
              Compliance
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
