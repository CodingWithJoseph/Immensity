'use client'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { signOut } from '@/lib/services/auth'
import { routes } from '@/app/util/routes'
import React, { Suspense, useEffect, useRef, useState } from 'react'
import { useSidebar } from '@/app/(core)/dashboard/contexts/SidebarContext'
import { useWorkspace } from '@/app/(core)/dashboard/contexts/WorkspaceContext'
import { fetchJson } from '@/lib/fetchJson'
import { MONITOR_NAV } from '@/lib/monitoring/lenses'
import { type FeatureCategory } from '@/app/(core)/dashboard/components/FeatureContextDot'
import { featureProfile, isFeatureEnabled, type AppFeature } from '@/lib/features'
import { useAuth } from '@/lib/auth-context'
import { usePlan } from '@/lib/usePlan'
import UserAvatar from '@/app/(core)/dashboard/components/UserAvatar'

type NavItem = {
    key: string
    href: string
    label: string
    // When set, this item starts a new visually-separated group in the submenu;
    // the string is the group's uppercase label.
    groupStart?: string
}

type NavSectionDef = {
    key: string
    label: string
    href: string
    items: NavItem[]
    feature?: FeatureCategory
    // Not yet shipped — rendered as a non-clickable "coming soon" chip.
    comingSoon?: boolean
}

// Manage items beyond Pipeline belong to deferred features; under the core
// release profile only Pipeline remains (see lib/features.ts).
const MANAGE_ITEM_FEATURES: Partial<Record<string, AppFeature>> = {
    portfolio: 'portfolio', goals: 'goals', calendar: 'timeline', teams: 'teams', issues: 'issues',
}
export const MANAGE_ITEMS: NavItem[] = [
    { key: 'pipeline', href: routes.core.pipeline, label: 'Pipeline' },
    { key: 'portfolio', href: routes.core.portfolio, label: 'Portfolio' },
    { key: 'goals', href: routes.core.goals, label: 'Goals' },
    { key: 'calendar', href: routes.core.calendar, label: 'Timeline' },
    { key: 'teams', href: routes.core.teams, label: 'Teams' },
    { key: 'issues', href: routes.core.issues, label: 'Issues' },
].filter(item => {
    const feature = MANAGE_ITEM_FEATURES[item.key]
    return !feature || isFeatureEnabled(feature)
})

const BUILD_ITEMS: NavItem[] = [
    { key: 'search', href: routes.core.explore, label: 'Search' },
    { key: 'signal', href: routes.core.signal, label: 'Signal' },
    { key: 'posts', href: routes.core.posts, label: 'Posts' },
    { key: 'breakdown', href: routes.core.problems, label: 'Breakdown' },
    { key: 'tasks', href: routes.core.tasks, label: 'Tasks' },
]

// The initial release is one focused workflow, so its destinations live in a
// single persistent sidebar. The full profile keeps the existing sectioned
// Build / Manage / Monitor navigation below.
export const CORE_ITEMS: NavItem[] = [
    { key: 'search', href: routes.core.explore, label: 'Search' },
    { key: 'pipeline', href: routes.core.pipeline, label: 'Pipeline' },
    { key: 'software-plan', href: routes.core.problems, label: 'Software Plan' },
    { key: 'signal', href: routes.core.signal, label: 'Signal' },
]

// Derived from the single monitor-lens registry (lib/monitoring/lenses.ts).
const MONITOR_ITEMS: NavItem[] = MONITOR_NAV

const NAV_SECTIONS: NavSectionDef[] = [
    { key: 'dashboard', label: 'Dashboard', href: routes.core.dashboard, items: [] },
    { key: 'build', label: 'Build', href: routes.core.explore, items: BUILD_ITEMS, feature: 'build' },
    { key: 'manage', label: 'Manage', href: routes.core.pipeline, items: MANAGE_ITEMS, feature: 'manage' },
    // Under the core release profile Monitor is a disabled "coming soon" entry
    // (same treatment as Market) rather than a navigable section.
    { key: 'monitor', label: 'Monitor', href: routes.core.monitorCommandCenter, items: MONITOR_ITEMS, feature: 'monitor', comingSoon: !isFeatureEnabled('monitor') },
    // Buyer intelligence — where the audience gathers and how to reach them. Last
    // feature, not built yet, so it's shown as a disabled "coming soon" item.
    { key: 'market', label: 'Market', href: '#', items: [], feature: 'market', comingSoon: true },
]

function isActiveItem(item: NavItem, pathname: string) {
    const nestedActive = item.href !== routes.core.dashboard
        && pathname.startsWith(`${item.href}/`)
    return pathname === item.href || nestedActive
}

function activeSectionFor(pathname: string) {
    if (pathname === routes.core.dashboard) return NAV_SECTIONS[0]
    return NAV_SECTIONS.find(section => section.items.some(item => isActiveItem(item, pathname))) ?? NAV_SECTIONS[0]
}

// The single active submenu item = the longest href that matches the path, so a
// nested page (e.g. /monitor/revenue/insights) highlights Insights, not Revenue.
function activeItemKey(items: NavItem[], pathname: string): string | null {
    let best: { key: string; len: number } | null = null
    for (const item of items) {
        if (isActiveItem(item, pathname) && (!best || item.href.length > best.len)) {
            best = { key: item.key, len: item.href.length }
        }
    }
    return best?.key ?? null
}

type WorkspaceOption = {
    id: string
    name: string
    displayName?: string
    postIds?: string[]
}

function TopNavLink({ section, active }: { section: NavSectionDef; active: boolean }) {
    return (
        <Link
            href={section.href}
            aria-current={active ? 'page' : undefined}
            className={`relative flex h-16 items-center gap-2 px-2 text-sm font-medium transition-colors lg:px-3 ${
                active
                    ? 'text-(--shell-highlight)'
                    : 'text-(--shell-muted) hover:text-(--shell-text)'
            }`}>
            {section.label}
            {active && <span aria-hidden className='absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-(--shell-highlight)' />}
        </Link>
    )
}

function TopNavComingSoon({ section }: { section: NavSectionDef }) {
    return (
        <span
            aria-disabled
            title='Coming soon'
            className='relative flex h-16 cursor-not-allowed items-center gap-1.5 px-2 text-sm font-medium text-(--shell-muted) opacity-60 lg:px-3'>
            {section.label}
            <sup className='text-[9px] font-semibold uppercase tracking-wide text-(--shell-muted)'>soon</sup>
        </span>
    )
}

function SubNavLink({ item, active, onClick }: { item: NavItem; active: boolean; onClick?: () => void }) {
    return (
        <Link
            href={item.href}
            title={item.label}
            aria-current={active ? 'page' : undefined}
            onClick={onClick}
            className={`relative flex min-h-9 items-center rounded-md border px-3.5 py-2 text-[13px] transition-colors ${
                active
                    ? 'border-(--shell-border) bg-(--shell-active-bg) font-semibold text-(--shell-text)'
                    : 'border-transparent text-(--shell-muted) hover:bg-(--shell-hover) hover:text-(--shell-text)'
            }`}
        >
            {active && <span aria-hidden className='absolute inset-y-2 left-0 w-0.5 rounded-full bg-(--shell-highlight)' />}
            <span className='truncate'>{item.label}</span>
        </Link>
    )
}

function AccountMenu() {
    const [menuOpen, setMenuOpen] = useState(false)
    const menuRef = useRef<HTMLDivElement>(null)
    const { user } = useAuth()
    const { plan, loading: planLoading } = usePlan()
    const accountName = user?.displayName?.trim() || user?.email || 'Account'
    const accountType = planLoading && !plan
        ? 'Loading plan...'
        : `${(plan ?? 'free').charAt(0).toUpperCase()}${(plan ?? 'free').slice(1)}`

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setMenuOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleSignOut = async () => {
        await signOut()
        document.cookie = 'firebase-token=; path=/; max-age=0'
        window.location.href = routes.auth.signIn
    }

    return (
        <div className='relative' ref={menuRef}>
            <button
                onClick={() => setMenuOpen(prev => !prev)}
                className='flex min-w-0 items-center gap-2 rounded-md px-1.5 py-1 transition-colors hover:bg-(--shell-hover)'
                title={`${accountName} - ${accountType}`}
                aria-label='Account menu'>
                <UserAvatar name={accountName} photoUrl={user?.photoURL} size='sm' inverted />
                <span className='hidden min-w-0 flex-col text-left sm:flex'>
                    <span className='max-w-44 truncate text-xs font-medium leading-4 text-(--shell-text)'>{accountName}</span>
                    <span className='text-[10px] leading-4 text-(--shell-muted)'>{accountType}</span>
                </span>
            </button>

            {menuOpen && (
                <div className='absolute right-0 top-full z-50 mt-3 min-w-44 rounded-md bg-(--shell-bg) p-1 shadow-lg'>
                    <Link
                        href={routes.core.settings}
                        onClick={() => setMenuOpen(false)}
                        className='flex rounded-lg px-3 py-2.5 text-sm text-(--shell-muted) transition-colors hover:bg-(--shell-hover) hover:text-(--shell-text)'>
                        Settings
                    </Link>
                    <div className='mx-3 my-1 h-px bg-(--shell-border)' />
                    <button
                        onClick={handleSignOut}
                        className='flex w-full rounded-lg px-3 py-2.5 text-left text-sm text-(--shell-muted) transition-colors hover:bg-(--shell-hover) hover:text-(--shell-text)'>
                        Sign out
                    </button>
                </div>
            )}
        </div>
    )
}

function WorkspacePickerInner({ pathname, disabled = false }: { pathname: string; disabled?: boolean }) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const { selectedPipelineId, setSelectedPipelineId } = useWorkspace()
    const [items, setItems] = useState<WorkspaceOption[]>([])
    const [loading, setLoading] = useState(true)
    const isMonitor = pathname.startsWith('/dashboard/monitor') || pathname.startsWith(routes.core.portfolio)
    const urlPipelineId = searchParams.get('pipelineId') ?? searchParams.get('clusterId')
    const currentId = urlPipelineId ?? selectedPipelineId ?? ''

    useEffect(() => {
        let active = true
        async function load() {
            setLoading(true)
            try {
                const json = await fetchJson<{ data: WorkspaceOption[] }>(isMonitor ? '/api/portfolio' : '/api/pipeline')
                if (!active) return
                setItems(json?.data ?? [])
            } catch {
                if (active) setItems([])
            } finally {
                if (active) setLoading(false)
            }
        }
        void load()
        return () => { active = false }
    }, [isMonitor])

    useEffect(() => {
        if (urlPipelineId && urlPipelineId !== selectedPipelineId) {
            setSelectedPipelineId(urlPipelineId)
        }
    }, [selectedPipelineId, setSelectedPipelineId, urlPipelineId])

    function handleChange(id: string) {
        // Empty selection = Account (top-level, no project). Clears the workspace
        // project and the URL param so account-scoped views (e.g. Goals) show.
        setSelectedPipelineId(id || null)
        const params = new URLSearchParams(searchParams.toString())
        if (id) params.set('pipelineId', id)
        else params.delete('pipelineId')
        params.delete('clusterId')
        const query = params.toString()
        router.replace(`${pathname}${query ? `?${query}` : ''}`)
    }

    return (
        <span className='relative inline-flex min-w-0 max-w-full'>
            <select
                value={currentId}
                onChange={event => handleChange(event.target.value)}
                disabled={loading || disabled}
                aria-label={isMonitor ? 'Select launched product' : 'Select project'}
                className={`max-w-full min-w-0 appearance-none truncate rounded-md border-0 bg-transparent py-1.5 pl-1 pr-5 text-sm font-semibold outline-none transition-colors focus:ring-2 focus:ring-(--color-focus) ${disabled ? 'cursor-not-allowed text-(--shell-muted)' : 'text-(--shell-text) hover:bg-(--shell-hover)'}`}>
                {/* Non-monitor: the empty option is a real "Account" (top-level) choice
                    so you can toggle between account and project scope. Monitor keeps
                    a disabled prompt (it needs a launched product). */}
                <option value='' disabled={isMonitor}>
                    {loading ? 'Loading...' : isMonitor ? 'Select launched product' : 'Account (all projects)'}
                </option>
                {items.map(item => (
                    <option key={item.id} value={item.id}>
                        {item.displayName ?? item.name}
                    </option>
                ))}
            </select>
            <svg className={`pointer-events-none absolute right-1 top-1/2 h-3.5 w-3.5 -translate-y-1/2 ${disabled ? 'text-(--shell-muted)' : 'text-(--shell-text)'}`} viewBox='0 0 20 20' fill='none' stroke='currentColor' strokeWidth='2' aria-hidden>
                <path d='m5 7 5 5 5-5' strokeLinecap='round' strokeLinejoin='round' />
            </svg>
        </span>
    )
}

function WorkspacePicker({ pathname, disabled = false }: { pathname: string; disabled?: boolean }) {
    return (
        <Suspense fallback={<span className='rounded-md bg-(--shell-subtle) px-3 py-1.5 text-sm text-(--shell-muted)'>Loading...</span>}>
            <WorkspacePickerInner pathname={pathname} disabled={disabled} />
        </Suspense>
    )
}

function TopBar({ pathname }: { pathname: string }) {
    const activeSection = activeSectionFor(pathname)
    const { openMobile } = useSidebar()
    const isCoreRelease = featureProfile === 'core'
    // The picker is always visible for a consistent top bar; it's only *enabled*
    // where selecting a project/account actually scopes the page.
    const pickerEnabled = activeSection.key !== 'manage'
        ? pathname !== routes.core.dashboard
        : pathname.startsWith(routes.core.calendar) || pathname.startsWith(routes.core.issues) || pathname.startsWith(routes.core.goals)

    return (
        <header className='fixed inset-x-0 top-0 z-50 flex h-16 items-center bg-(--shell-bg) text-(--shell-text)'>
            <div className='flex h-full w-56 shrink-0 items-center gap-3 px-5'>
                <button
                    onClick={openMobile}
                    className='grid h-9 w-9 place-items-center rounded-md bg-(--shell-subtle) text-(--shell-muted) transition-colors hover:text-(--shell-text) md:hidden'
                    aria-label='Open navigation'>
                    <svg width='19' height='19' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
                        <line x1='3' y1='6' x2='21' y2='6' />
                        <line x1='3' y1='12' x2='21' y2='12' />
                        <line x1='3' y1='18' x2='21' y2='18' />
                    </svg>
                </button>
                <Link href={isCoreRelease ? routes.core.explore : routes.core.dashboard} className='flex items-center gap-3 transition-opacity hover:opacity-80' title={isCoreRelease ? 'Search' : 'Dashboard'}>
                    <Image src='/brand/logo_orange.svg' alt='Logo' width={20} height={20} className='shrink-0' />
                    <span className='text-sm font-semibold'>Immensity</span>
                </Link>
            </div>

            {!isCoreRelease && (
                <div className='hidden min-w-0 flex-1 items-center justify-between gap-3 px-4 md:flex lg:px-6'>
                    <div className='flex min-w-0 max-w-44 shrink items-center gap-3 text-sm text-(--shell-muted) lg:max-w-56 xl:max-w-80'>
                        <WorkspacePicker pathname={pathname} disabled={!pickerEnabled} />
                    </div>
                    <nav aria-label='Dashboard sections' className='flex h-16 shrink-0 items-center gap-1 lg:gap-2'>
                        {NAV_SECTIONS.filter(section => section.key !== 'dashboard').map(section => (
                            section.comingSoon
                                ? <TopNavComingSoon key={section.key} section={section} />
                                : <TopNavLink key={section.key} section={section} active={section.key === activeSection.key} />
                        ))}
                    </nav>
                </div>
            )}

            <div className='ml-auto flex h-full items-center gap-3 px-4'>
                <AccountMenu />
            </div>
        </header>
    )
}

function SubMenu({ pathname, onLinkClick }: { pathname: string; onLinkClick?: () => void }) {
    const activeSection = activeSectionFor(pathname)
    const items = featureProfile === 'core' ? CORE_ITEMS : activeSection.items
    const activeKey = activeItemKey(items, pathname)
    const navigationLabel = featureProfile === 'core' ? 'Product navigation' : `${activeSection.label} submenu`

    return (
        <div className='flex h-full flex-col'>
            <nav className='flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4' aria-label={navigationLabel}>
                {items.map((item, index) => (
                    <React.Fragment key={item.key}>
                        {item.groupStart && (
                            <div className={`px-3.5 ${index > 0 ? 'mt-3 border-t border-(--shell-border) pt-3' : ''}`}>
                                <span className='text-[10px] font-semibold uppercase tracking-widest text-(--shell-muted) opacity-70'>{item.groupStart}</span>
                            </div>
                        )}
                        <SubNavLink item={item} active={item.key === activeKey} onClick={onLinkClick} />
                    </React.Fragment>
                ))}
            </nav>
        </div>
    )
}

export default function Sidebar() {
    const pathname = usePathname()
    const { mobileOpen, closeMobile, setCollapsed } = useSidebar()

    useEffect(() => {
        setCollapsed(false)
    }, [setCollapsed])

    return (
        <>
            <TopBar pathname={pathname} />

            <aside aria-label='Dashboard submenu' className='fixed bottom-0 left-0 top-16 z-40 hidden w-56 bg-(--shell-bg) md:block'>
                <SubMenu pathname={pathname} />
            </aside>

            <aside aria-hidden className='fixed bottom-0 right-0 top-16 z-40 hidden w-4 bg-(--shell-bg) md:block' />

            {mobileOpen && (
                <div
                    className='fixed inset-0 z-40 bg-black/50 pt-16 md:hidden'
                    onClick={closeMobile}
                />
            )}

            <aside aria-label='Mobile dashboard submenu' className={`fixed bottom-0 left-0 top-16 z-50 w-64 bg-(--shell-bg) transition-transform duration-300 md:hidden ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <SubMenu pathname={pathname} onLinkClick={closeMobile} />
            </aside>
        </>
    )
}
