import Link from 'next/link';
import { Database, ShieldCheck, Workflow, TrendingUp, FileSearch, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';

const FEATURES = [
  {
    icon: Database,
    title: 'Ask in plain language, get a query that proves it',
    description:
      'Every data answer comes with the actual SQL that ran, validated against a strict allowlist before it ever touches Snowflake — not a black box.',
  },
  {
    icon: FileSearch,
    title: 'Your documents, searchable in the same chat',
    description:
      'Upload a contract or a policy PDF once. The Copilot cites the exact source when it answers from it.',
  },
  {
    icon: Workflow,
    title: 'Automations that run without you',
    description:
      'If inventory drops below a threshold, notify the warehouse and draft a purchase request — no dashboard-checking required.',
  },
  {
    icon: TrendingUp,
    title: 'Forecasts you can defend in a room',
    description:
      'Revenue projections come from a plain linear fit with a confidence band, not a model guessing at a number.',
  },
];

export default function LandingPage() {
  return (
    <>
      {/* ---------- HERO ---------- */}
      <section className="mx-auto max-w-6xl px-6 pb-20 pt-20 sm:pt-28">
        <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2">
          <div>
            <h1 className="text-[40px] font-semibold leading-[1.1] tracking-tight sm:text-[52px]">
              Talk to your business.
              <br />
              <span className="text-muted-foreground">Get an answer you can check.</span>
            </h1>
            <p className="mt-6 max-w-md text-[16px] leading-relaxed text-muted-foreground">
              InsightOS is an AI copilot built directly on Snowflake Cortex — every number it gives
              you traces back to a real query against your live data, and every document answer
              cites its source.
            </p>
            <div className="mt-8 flex items-center gap-3">
              <Button asChild size="lg">
                <Link href="/register">Get started free</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/#features">See how it works</Link>
              </Button>
            </div>
          </div>

          {/* Signature element: a real example exchange, not a stock
              chart or a gradient blob — this is the actual product. */}
          <div className="rounded-2xl border border-border/60 bg-card p-1.5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_16px_48px_-12px_rgba(0,0,0,0.12)]">
            <div className="rounded-xl border border-border/60 bg-background p-5">
              <div className="flex gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-[11px] font-medium">
                  You
                </div>
                <p className="mt-1 text-[13.5px]">Why did revenue drop last month?</p>
              </div>

              <div className="mt-4 flex gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-foreground text-[11px] font-medium text-background">
                  AI
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <p className="text-[13.5px] leading-relaxed">
                    Revenue was down 12% month over month, driven mostly by the Retail segment.
                  </p>
                  <div className="rounded-lg border border-border/60 bg-muted/40 px-3 py-2 font-mono text-[11px] text-muted-foreground">
                    select source, sum(amount) from REVENUE where …
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <Database className="h-3 w-3" />
                    Live query result · Snowflake ANALYTICS
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- FEATURES ---------- */}
      <section id="features" className="border-t border-border/60 bg-muted/20 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-[26px] font-semibold tracking-tight">
            Not a chatbot bolted onto a dashboard.
          </h2>
          <p className="mt-2 max-w-lg text-[15px] text-muted-foreground">
            Four things that only work because the whole system was built around explainability
            from the start.
          </p>

          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-2xl border border-border/60 bg-card p-6">
                <f.icon className="h-5 w-5 text-muted-foreground" strokeWidth={1.75} />
                <h3 className="mt-4 text-[15px] font-medium">{f.title}</h3>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted-foreground">
                  {f.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- ARCHITECTURE / TRUST ---------- */}
      <section id="architecture" className="py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-3">
            <div>
              <ShieldCheck className="h-5 w-5 text-muted-foreground" strokeWidth={1.75} />
              <h3 className="mt-3 text-[14px] font-medium">Tenant isolation, enforced twice</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                A dedicated Snowflake role per workspace, plus a row access policy — a bug in the
                app layer alone can&apos;t leak another company&apos;s data.
              </p>
            </div>
            <div>
              <Lock className="h-5 w-5 text-muted-foreground" strokeWidth={1.75} />
              <h3 className="mt-3 text-[14px] font-medium">Generated SQL is never trusted blind</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                Every AI-written query passes a strict validator — SELECT-only, allowlisted
                tables, no exceptions — before it can run.
              </p>
            </div>
            <div>
              <Database className="h-5 w-5 text-muted-foreground" strokeWidth={1.75} />
              <h3 className="mt-3 text-[14px] font-medium">Reasoning lives next to your data</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                Cortex AI runs inference and search inside Snowflake&apos;s governed compute — no
                separate vector database, no data leaving the warehouse.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- CTA ---------- */}
      <section className="border-t border-border/60">
        <div className="mx-auto max-w-6xl px-6 py-20 text-center">
          <h2 className="text-[26px] font-semibold tracking-tight">
            Set up your workspace in under a minute.
          </h2>
          <div className="mt-6">
            <Button asChild size="lg">
              <Link href="/register">Get started free</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
