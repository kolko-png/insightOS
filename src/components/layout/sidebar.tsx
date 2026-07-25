'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  MessagesSquare,
  FolderOpen,
  Library,
  BarChart3,
  Workflow,
  FileText,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/copilot', label: 'AI Copilot', icon: MessagesSquare },
  { href: '/documents', label: 'Documents', icon: FolderOpen },
  { href: '/knowledge-base', label: 'Knowledge Base', icon: Library },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/automation', label: 'Automation', icon: Workflow },
  { href: '/reports', label: 'Reports', icon: FileText },
] as const;

export function Sidebar({ workspaceName }: { workspaceName: string }) {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col border-r border-border/60 bg-card">
      <div className="flex h-14 items-center gap-2 px-4">
        <div className="h-6 w-6 rounded-md bg-foreground" aria-hidden />
        <span className="truncate text-[13px] font-medium tracking-tight">{workspaceName}</span>
      </div>

      <nav className="flex-1 space-y-0.5 px-2 py-2">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] transition-colors',
                active
                  ? 'bg-accent font-medium text-accent-foreground'
                  : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border/60 px-2 py-2">
        <Link
          href="/settings/profile"
          className={cn(
            'flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] transition-colors',
            pathname.startsWith('/settings')
              ? 'bg-accent font-medium text-accent-foreground'
              : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
          )}
        >
          <Settings className="h-4 w-4 shrink-0" strokeWidth={1.75} />
          Settings
        </Link>
      </div>
    </aside>
  );
}
