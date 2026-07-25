import type { ReactNode } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-foreground" aria-hidden />
            <span className="text-[14px] font-medium tracking-tight">InsightOS</span>
          </Link>

          <nav className="hidden items-center gap-8 sm:flex">
            <Link href="/#features" className="text-[13px] text-muted-foreground hover:text-foreground">
              Features
            </Link>
            <Link href="/#architecture" className="text-[13px] text-muted-foreground hover:text-foreground">
              Architecture
            </Link>
            <Link href="/pricing" className="text-[13px] text-muted-foreground hover:text-foreground">
              Pricing
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/register">Get started</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border/60">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded bg-foreground" aria-hidden />
            <span className="text-[13px] font-medium">InsightOS</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Built on Snowflake Cortex AI. © {new Date().getFullYear()} InsightOS.
          </p>
        </div>
      </footer>
    </div>
  );
}
