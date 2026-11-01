'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useMemo } from 'react';
import {
  ChevronRight,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/components/auth-provider';
import {
  getHubSpotNavigation,
  type HubSpotNavCategory,
} from '@/lib/navigation';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { ROLE_LABELS, type UserRole } from '@/constants/roles';

// ─── Nav Item Component ──────────────────────────────────────────────────────

function HubSpotCategoryItem({
  category,
  collapsed,
  onNavigate,
}: {
  category: HubSpotNavCategory;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const children = category.children ?? [];
  const hasChildren = children.length > 0;

  // Single-child sections render as a direct link (no accordion)
  const isSingleChild = hasChildren && children.length === 1;
  const directHref = isSingleChild ? children[0].href : category.href;

  const isExactActive = directHref
    ? pathname === directHref
    : false;
  const isChildActive = children.some(
    (c) => pathname === c.href || pathname.startsWith(c.href + '/'),
  );
  const isActive = isExactActive || isChildActive;

  const [open, setOpen] = useState(() => isChildActive);

  useEffect(() => {
    if (isChildActive) setOpen(true);
  }, [isChildActive]);

  // ── Collapsed: multi-child → Flyout dropdown ────────────────────────────
  if (collapsed && hasChildren && !isSingleChild) {
    return (
      <li className="relative">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              aria-label={category.label}
              className={cn(
                'group relative flex h-10 w-10 mx-auto items-center justify-center rounded-xl text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
                isActive
                  ? 'bg-blue-500/15 text-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.35)]'
                  : 'text-slate-400 hover:bg-[#1E293B]/70 hover:text-white',
              )}
            >
              <category.icon className="h-5 w-5 shrink-0" />
              {isActive && (
                <span className="absolute right-1.5 top-1.5 flex h-2 w-2 rounded-full bg-[#14B8A6]" />
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="right"
            align="start"
            sideOffset={14}
            className="w-64 border-slate-800 bg-[#0B1220] text-slate-200 shadow-2xl p-2 rounded-xl z-50 animate-in fade-in zoom-in-95"
          >
            <DropdownMenuLabel className="px-2.5 py-2 font-semibold text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <category.icon className="h-4 w-4 text-blue-400" />
                <span className="text-sm font-bold tracking-tight">{category.label}</span>
              </div>
              {category.badge && (
                <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] font-semibold text-blue-400">
                  {category.badge}
                </span>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-slate-800 my-1" />
            <div className="space-y-0.5 max-h-72 overflow-y-auto py-1">
              {children.map((child) => {
                const isSubActive =
                  pathname === child.href || pathname.startsWith(child.href + '/');
                return (
                  <DropdownMenuItem key={child.id} asChild className="p-0 focus:bg-transparent">
                    <Link
                      href={child.href}
                      onClick={onNavigate}
                      className={cn(
                        'flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium transition-colors cursor-pointer',
                        isSubActive
                          ? 'bg-blue-500/10 text-blue-300 font-semibold'
                          : 'text-slate-300 hover:bg-[#1E293B]/60 hover:text-white',
                      )}
                    >
                      <span className="truncate">{child.label}</span>
                      {child.badge && (
                        <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[10px] text-emerald-400 font-mono">
                          {child.badge}
                        </span>
                      )}
                    </Link>
                  </DropdownMenuItem>
                );
              })}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </li>
    );
  }

  // ── Collapsed: direct link (no children, or single-child) → Tooltip ────
  if (collapsed) {
    const href = directHref!;
    return (
      <li>
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              href={href}
              onClick={onNavigate}
              aria-label={category.label}
              className={cn(
                'group relative flex h-10 w-10 mx-auto items-center justify-center rounded-xl text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
                isActive
                  ? 'bg-blue-500/15 text-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.35)]'
                  : 'text-slate-400 hover:bg-[#1E293B]/70 hover:text-white',
              )}
            >
              <category.icon className="h-5 w-5 shrink-0" />
              {category.badge && (
                <span className="absolute right-1 top-1 flex h-2 w-2 rounded-full bg-blue-500" />
              )}
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={14} className="bg-slate-900 text-white border-slate-800 font-semibold px-2.5 py-1">
            {isSingleChild ? `${category.label} › ${children[0].label}` : category.label}
          </TooltipContent>
        </Tooltip>
      </li>
    );
  }

  // ── Expanded: direct link (no children or single-child) ─────────────────
  if (!hasChildren || isSingleChild) {
    const href = directHref!;
    return (
      <li>
        <Link
          href={href}
          onClick={onNavigate}
          className={cn(
            'group relative flex items-center gap-3 rounded-lg px-2 py-2 text-xs font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
            isActive
              ? 'text-blue-300 [text-shadow:0_0_12px_rgba(147,197,253,0.5)]'
              : 'text-slate-400 hover:text-slate-200',
          )}
        >
          {/* Icon chip — active gets bg + glow */}
          <span
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-lg shrink-0 transition-all duration-150',
              isActive
                ? 'bg-blue-500/20 text-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.4)]'
                : 'text-slate-400 group-hover:text-slate-200',
            )}
          >
            <category.icon className="h-4 w-4" />
          </span>
          <span className="flex-1 truncate tracking-tight">
            {isSingleChild ? category.label : category.label}
          </span>
          {category.badge && (
            <span className="rounded-full bg-blue-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-blue-400">
              {category.badge}
            </span>
          )}
        </Link>
      </li>
    );
  }

  // ── Expanded: accordion (multi-child) ────────────────────────────────────
  return (
    <li>
      <div className="flex flex-col">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          aria-expanded={open}
          aria-controls={`submenu-${category.id}`}
          className={cn(
            'group relative flex w-full items-center gap-3 rounded-lg px-2 py-2 text-xs font-medium transition-all duration-150 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
            isActive
              ? 'text-blue-300 [text-shadow:0_0_12px_rgba(147,197,253,0.5)]'
              : 'text-slate-400 hover:text-slate-200',
          )}
        >
          <span
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-lg shrink-0 transition-all duration-150',
              isActive
                ? 'bg-blue-500/20 text-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.4)]'
                : 'text-slate-400 group-hover:text-slate-200',
            )}
          >
            <category.icon className="h-4 w-4" />
          </span>
          <span className="flex-1 truncate tracking-tight">{category.label}</span>
          {category.badge && (
            <span className="rounded-full bg-blue-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-blue-400">
              {category.badge}
            </span>
          )}
          <ChevronRight
            className={cn(
              'h-3.5 w-3.5 shrink-0 text-slate-500 transition-transform duration-200',
              open && 'rotate-90 text-slate-300',
            )}
          />
        </button>

        {/* Sub-items */}
        {open && (
          <ul
            id={`submenu-${category.id}`}
            role="group"
            className="ml-4 mt-0.5 space-y-0.5 border-l border-slate-700/50 pl-2.5 animate-in fade-in duration-150"
          >
            {children.map((child) => {
              const isChildItemActive =
                pathname === child.href || pathname.startsWith(child.href + '/');
              return (
                <li key={child.id}>
                  <Link
                    href={child.href}
                    onClick={onNavigate}
                    className={cn(
                      'group/child flex items-center justify-between rounded-md px-2.5 py-1.5 text-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500',
                      isChildItemActive
                        ? 'text-blue-300 font-semibold [text-shadow:0_0_10px_rgba(147,197,253,0.4)]'
                        : 'text-slate-400 hover:text-slate-200',
                    )}
                  >
                    <span className="truncate">{child.label}</span>
                    {child.badge && (
                      <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.2 text-[9px] text-emerald-400 font-mono">
                        {child.badge}
                      </span>
                    )}
                    {isChildItemActive && (
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-400 shrink-0" />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </li>
  );
}

// ─── Sidebar Root ────────────────────────────────────────────────────────────

export function Sidebar({
  collapsed,
  toggle,
  mobileOpen,
  setMobileOpen,
}: {
  collapsed: boolean;
  toggle: () => void;
  mobileOpen: boolean;
  setMobileOpen: (v: boolean) => void;
}) {
  const { profile } = useAuth();
  const role = (profile?.role ?? 'employee') as UserRole;
  const categories = getHubSpotNavigation(role);

  const [customName, setCustomName] = useState<string | null>(null);

  useEffect(() => {
    const readCustomProfile = () => {
      try {
        const stored = localStorage.getItem('cyberai_profile_custom');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.name) setCustomName(parsed.name);
        }
      } catch {}
    };
    readCustomProfile();
    window.addEventListener('storage', readCustomProfile);
    return () => window.removeEventListener('storage', readCustomProfile);
  }, []);

  const displayName = customName || profile?.full_name || profile?.email?.split('@')[0] || 'User';

  // Group categories by section
  const sectionGroups = useMemo(() => {
    const sectionOrder = [
      'Overview',
      'Work',
      'Operations',
      'Collaboration',
      'Organization',
      'Intelligence',
      'Configuration',
      'Personal',
    ];
    const groups: { section: string; items: HubSpotNavCategory[] }[] = [];
    sectionOrder.forEach((sec) => {
      const items = categories.filter((c) => c.section === sec);
      if (items.length > 0) groups.push({ section: sec, items });
    });
    const remaining = categories.filter((c) => !sectionOrder.includes(c.section || ''));
    if (remaining.length > 0) groups.push({ section: 'General', items: remaining });
    return groups;
  }, [categories]);

  return (
    <TooltipProvider delayDuration={150}>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        aria-label="Application Navigation"
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex h-full flex-col bg-[#0B1220] border-r border-[#1E293B]/80 text-slate-100 shadow-2xl transition-[width,transform] duration-200 ease-in-out lg:static lg:translate-x-0',
          collapsed ? 'lg:w-[68px]' : 'lg:w-64',
          'w-72',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        {/* Brand Header */}
        <div className="flex h-16 shrink-0 items-center gap-3 border-b border-slate-800/80 px-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-black shadow-md shadow-blue-500/25 ring-1 ring-white/10">
            G
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="truncate text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
                Gola CyberAI
                <Sparkles className="h-3 w-3 text-[#14B8A6]" />
              </span>
              <span className="truncate text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Platform
              </span>
            </div>
          )}

          {/* Mobile close button */}
          <button
            onClick={() => setMobileOpen(false)}
            className="ml-auto rounded-lg p-1.5 text-slate-400 hover:bg-[#1E293B] hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 lg:hidden"
            aria-label="Close navigation drawer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Navigation */}
        <ScrollArea className="flex-1">
          <nav className="p-2 space-y-4">
            {sectionGroups.map((group, groupIdx) => (
              <div key={group.section} className="space-y-0.5">
                {/* Section label — expanded only, skip Overview */}
                {!collapsed && group.section !== 'Overview' && (
                  <div className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 select-none">
                    {group.section}
                  </div>
                )}

                {/* Section divider in collapsed mode */}
                {collapsed && groupIdx > 0 && (
                  <div className="my-1.5 border-t border-slate-800/80 mx-2" />
                )}

                <ul className="space-y-0.5">
                  {group.items.map((cat) => (
                    <HubSpotCategoryItem
                      key={cat.id}
                      category={cat}
                      collapsed={collapsed}
                      onNavigate={() => setMobileOpen(false)}
                    />
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </ScrollArea>

        {/* Footer: user identity + collapse button */}
        <div className="shrink-0 border-t border-slate-800/80 p-2.5 bg-[#0B1220]/60">
          {!collapsed ? (
            <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg bg-slate-900/60 border border-slate-800/60 mb-2">
              <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-tr from-slate-800 to-slate-700 text-xs font-bold text-white shadow ring-1 ring-white/10">
                {displayName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-[#14B8A6] ring-2 ring-[#0B1220]" />
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="truncate text-xs font-semibold text-white">{displayName}</span>
                <span className="truncate text-[10px] text-slate-400 capitalize">{ROLE_LABELS[role]}</span>
              </div>
            </div>
          ) : (
            <div className="flex justify-center mb-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 text-xs font-bold text-white shadow ring-1 ring-white/10 cursor-default">
                    {displayName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                    <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-[#14B8A6] ring-[1.5px] ring-[#0B1220]" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={14} className="bg-slate-900 text-white border-slate-800 font-semibold px-2.5 py-1">
                  {displayName} ({ROLE_LABELS[role]})
                </TooltipContent>
              </Tooltip>
            </div>
          )}

          {/* Desktop collapse toggle */}
          <div className="hidden lg:block">
            {collapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggle}
                    className="w-full justify-center text-slate-400 hover:bg-[#1E293B] hover:text-white h-8 text-xs"
                    aria-label="Expand sidebar"
                  >
                    <PanelLeftOpen className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={14} className="bg-slate-900 text-white border-slate-800 font-semibold px-2.5 py-1">
                  Expand sidebar
                </TooltipContent>
              </Tooltip>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={toggle}
                className="w-full justify-center text-slate-400 hover:bg-[#1E293B] hover:text-white h-8 text-xs"
                aria-label="Collapse sidebar"
              >
                <PanelLeftClose className="h-4 w-4" />
                <span className="ml-2 text-xs font-medium">Collapse Sidebar</span>
              </Button>
            )}
          </div>
        </div>
      </aside>
    </TooltipProvider>
  );
}
