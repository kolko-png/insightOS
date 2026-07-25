import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function PricingPage() {
  return (
    <section className="mx-auto max-w-2xl px-6 py-28 text-center">
      <h1 className="text-[32px] font-semibold tracking-tight">Pricing</h1>
      <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
        InsightOS is in early access. Reach out for workspace pricing while we finalize plans —
        every workspace created today keeps its current terms.
      </p>
      <div className="mt-8">
        <Button asChild size="lg">
          <Link href="/register">Start free during early access</Link>
        </Button>
      </div>
    </section>
  );
}
