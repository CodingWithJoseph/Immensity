'use client'
import { useEffect, useState } from 'react'
import { deleteUser, EmailAuthProvider, reauthenticateWithCredential, updatePassword, updateProfile } from 'firebase/auth'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import { routes } from '@/app/util/routes'
import PasswordInput from '@/components/PasswordInput'
import { useDashboardTheme } from '@/components/ThemeContext'
import { isPaidUser } from '@/lib/db/subscriptions'
import { useAuth } from '@/lib/auth-context'
import { fetchJson } from '@/lib/fetchJson'
import PageHeader from '@/app/(core)/dashboard/components/PageHeader'

type Section = 'profile' | 'notifications' | 'appearance' | 'workspace' | 'plan' | 'account' | 'data' | 'monitoring'

interface AdminSetting {
    key: string
    kind: 'choice' | 'toggle'
    label: string
    group: string
    options: number[]
    unit: string | null
    value: number | boolean
    isDefault: boolean
}

interface UserPrefs {
    alertsEmailEnabled: boolean
    digestCadence: 'instant' | 'daily' | 'weekly'
    alertEmail: string | null
    defaultPipelineId: string | null
    defaultLanding: string | null
}

interface AlertSettings {
    newIssueEnabled: boolean
    errorSpikeEnabled: boolean
    signupsDropEnabled: boolean
    revenueDropEnabled: boolean
    errorSpikeMultiplier: number
    signupsDropPct: number
    revenueDropPct: number
}

interface ProductLite {
    id: string
    name: string
}

const baseNavItems: { id: Section; label: string }[] = [
    { id: 'profile', label: 'Profile' },
    { id: 'notifications', label: 'Notifications' },
    { id: 'appearance', label: 'Appearance' },
    { id: 'workspace', label: 'Workspace' },
    { id: 'plan', label: 'Plan' },
    { id: 'account', label: 'Account' },
    { id: 'data', label: 'Data & Privacy' },
]

const panelClass = 'rounded-md bg-(--color-surface) p-5'
const inputClass = 'rounded-md border border-(--color-border) bg-(--color-bg) px-3 py-2 text-sm text-(--color-text) outline-none focus:ring-2 focus:ring-(--color-text) disabled:cursor-not-allowed disabled:opacity-50'
const buttonClass = 'rounded-md bg-(--color-button) px-4 py-2 text-sm font-medium text-(--color-on-button) transition-colors hover:bg-(--color-button-hover) disabled:opacity-40'
const selectClass = 'rounded-md border border-(--color-border) bg-(--color-surface) px-3 py-2 text-sm text-(--color-text) outline-none focus:ring-2 focus:ring-(--color-text) disabled:opacity-50'

function SettingsToggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            disabled={disabled}
            onClick={() => onChange(!checked)}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${checked ? 'bg-(--color-success)' : 'bg-(--color-border)'}`}
        >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-(--color-surface-raised) shadow-[var(--shadow-sm)] transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
    )
}

function LightPreview() {
    return (
        <div className="flex h-28 w-full flex-col gap-1.5 overflow-hidden rounded-md border border-(--color-border) bg-(--color-bg) p-2">
            <div className="h-2.5 w-1/2 rounded-full bg-(--color-text)" />
            <div className="h-2 w-3/4 rounded-full bg-(--color-border)" />
            <div className="h-2 w-2/3 rounded-full bg-(--color-border)" />
            <div className="mt-auto flex gap-1.5">
                <div className="h-6 w-16 rounded-full bg-(--color-text)" />
                <div className="h-6 w-16 rounded-full bg-(--color-accent)" />
            </div>
        </div>
    )
}

function DarkPreview() {
    return (
        <div className="flex h-28 w-full flex-col gap-1.5 overflow-hidden rounded-md border border-(--color-border-strong) bg-(--surface-ink) p-2">
            <div className="h-2.5 w-1/2 rounded-full bg-(--on-dark)" />
            <div className="h-2 w-3/4 rounded-full bg-white/20" />
            <div className="h-2 w-2/3 rounded-full bg-white/20" />
            <div className="mt-auto flex gap-1.5">
                <div className="h-6 w-16 rounded-full bg-(--on-dark)" />
                <div className="h-6 w-16 rounded-full bg-(--color-accent)" />
            </div>
        </div>
    )
}

export default function SettingsPage() {
    const router = useRouter()
    const { user, authReady } = useAuth()
    const { theme, toggleTheme } = useDashboardTheme()
    const [section, setSection] = useState<Section>('profile')
    const [displayName, setDisplayName] = useState('')
    const [email, setEmail] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [currentPassword, setCurrentPassword] = useState('')
    const [deletePassword, setDeletePassword] = useState('')
    const [savedCount, setSavedCount] = useState(0)
    const [plan, setPlan] = useState<'free' | 'pro' | 'elite' | 'admin'>('free')
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [loadingProfile, setLoadingProfile] = useState(false)
    const [loadingPassword, setLoadingPassword] = useState(false)
    const [loadingDelete, setLoadingDelete] = useState(false)
    const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState(false)
    const [currentPeriodEnd, setCurrentPeriodEnd] = useState<string | null>(null)
    const [dataLoading, setDataLoading] = useState(false)
    const [monSettings, setMonSettings] = useState<AdminSetting[] | null>(null)
    const [monLoading, setMonLoading] = useState(false)
    const [monSavingKey, setMonSavingKey] = useState<string | null>(null)
    const [prefs, setPrefs] = useState<UserPrefs | null>(null)
    const [savingPrefs, setSavingPrefs] = useState(false)
    const [alertEmailDraft, setAlertEmailDraft] = useState('')
    const [products, setProducts] = useState<ProductLite[] | null>(null)
    const [productAlerts, setProductAlerts] = useState<Record<string, AlertSettings>>({})
    const [savingAlertId, setSavingAlertId] = useState<string | null>(null)
    const [exporting, setExporting] = useState(false)

    const loading = !authReady || dataLoading

    useEffect(() => {
        if (!authReady || !user) return
        const currentUser = user

        async function loadData() {
            setDisplayName(currentUser.displayName ?? '')
            setEmail(currentUser.email ?? '')
            setDataLoading(true)
            try {
                const token = await currentUser.getIdToken()
                const headers = { Authorization: `Bearer ${token}` }
                const [pipelineJson, planJson] = await Promise.all([
                    fetchJson<{ data: { launchedAt: string | null; removedAt: string | null }[] }>('/api/pipeline', { headers }),
                    fetchJson<{ plan: string; cancelAtPeriodEnd: boolean; currentPeriodEnd: string | null }>('/api/account/plan', { headers }),
                ])
                const active = (pipelineJson?.data ?? []).filter(c => !c.launchedAt && !c.removedAt)
                setSavedCount(active.length)
                if (planJson?.plan) setPlan(planJson.plan as 'free' | 'pro' | 'elite' | 'admin')
                setCancelAtPeriodEnd(planJson?.cancelAtPeriodEnd ?? false)
                setCurrentPeriodEnd(planJson?.currentPeriodEnd ?? null)
            } finally {
                setDataLoading(false)
            }
        }

        void loadData()
    }, [authReady, user])

    const loadPlan = async () => {
        if (!user) return
        const token = await user.getIdToken()
        const json = await fetchJson<{ plan: string; cancelAtPeriodEnd: boolean; currentPeriodEnd: string | null }>('/api/account/plan', {
            headers: { Authorization: `Bearer ${token}` },
        })
        if (json?.plan) setPlan(json.plan as 'free' | 'pro' | 'elite' | 'admin')
        setCancelAtPeriodEnd(json?.cancelAtPeriodEnd ?? false)
        setCurrentPeriodEnd(json?.currentPeriodEnd ?? null)
    }

    const loadMonitoring = async () => {
        if (!user) return
        setMonLoading(true)
        try {
            const token = await user.getIdToken()
            const json = await fetchJson<{ data: AdminSetting[] }>('/api/portfolio/admin/settings', {
                headers: { Authorization: `Bearer ${token}` },
            })
            setMonSettings(json?.data ?? [])
        } catch {
            toast.error('Could not load monitoring settings')
        } finally {
            setMonLoading(false)
        }
    }

    const saveSetting = async (key: string, value: number | boolean) => {
        if (!user) return
        setMonSavingKey(key)
        try {
            const token = await user.getIdToken()
            const json = await fetchJson<{ data: AdminSetting[] }>('/api/portfolio/admin/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ updates: { [key]: value } }),
            })
            if (json?.data) setMonSettings(json.data)
            toast.success('Saved')
        } catch {
            toast.error('Could not save setting')
        } finally {
            setMonSavingKey(null)
        }
    }

    const loadPreferences = async () => {
        if (!user) return
        try {
            const token = await user.getIdToken()
            const json = await fetchJson<{ data: UserPrefs }>('/api/account/preferences', {
                headers: { Authorization: `Bearer ${token}` },
            })
            if (json?.data) {
                setPrefs(json.data)
                setAlertEmailDraft(json.data.alertEmail ?? '')
            }
        } catch {
            toast.error('Could not load preferences')
        }
    }

    const savePreferences = async (updates: Partial<UserPrefs>) => {
        if (!user) return
        setSavingPrefs(true)
        try {
            const token = await user.getIdToken()
            const json = await fetchJson<{ data: UserPrefs }>('/api/account/preferences', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    alerts_email_enabled: updates.alertsEmailEnabled,
                    digest_cadence: updates.digestCadence,
                    alert_email: updates.alertEmail,
                    default_pipeline_id: updates.defaultPipelineId,
                    default_landing: updates.defaultLanding,
                }),
            })
            if (json?.data) {
                setPrefs(json.data)
                setAlertEmailDraft(json.data.alertEmail ?? '')
            }
            toast.success('Saved')
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Could not save preferences')
        } finally {
            setSavingPrefs(false)
        }
    }

    const loadProductsAndAlerts = async () => {
        if (!user) return
        try {
            const token = await user.getIdToken()
            const headers = { Authorization: `Bearer ${token}` }
            const list = await fetchJson<{ data: ProductLite[] }>('/api/portfolio', { headers })
            const items = list?.data ?? []
            setProducts(items)
            const entries = await Promise.all(items.map(async p => {
                try {
                    const a = await fetchJson<{ data: AlertSettings }>(`/api/monitor/${p.id}/alert-settings`, { headers })
                    return a?.data ? ([p.id, a.data] as const) : null
                } catch {
                    return null
                }
            }))
            setProductAlerts(Object.fromEntries(entries.filter(Boolean) as [string, AlertSettings][]))
        } catch {
            toast.error('Could not load product alerts')
        }
    }

    const saveProductAlerts = async (pipelineId: string, next: AlertSettings) => {
        if (!user) return
        setSavingAlertId(pipelineId)
        setProductAlerts(prev => ({ ...prev, [pipelineId]: next }))
        try {
            const token = await user.getIdToken()
            await fetchJson(`/api/monitor/${pipelineId}/alert-settings`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    new_issue_enabled: next.newIssueEnabled,
                    error_spike_enabled: next.errorSpikeEnabled,
                    signups_drop_enabled: next.signupsDropEnabled,
                    revenue_drop_enabled: next.revenueDropEnabled,
                    error_spike_multiplier: next.errorSpikeMultiplier,
                    signups_drop_pct: next.signupsDropPct,
                    revenue_drop_pct: next.revenueDropPct,
                }),
            })
        } catch {
            toast.error('Could not save alert settings')
        } finally {
            setSavingAlertId(null)
        }
    }

    const exportData = async () => {
        if (!user) return
        setExporting(true)
        try {
            const token = await user.getIdToken()
            const json = await fetchJson<{ data: unknown }>('/api/account/export', {
                headers: { Authorization: `Bearer ${token}` },
            })
            const blob = new Blob([JSON.stringify(json?.data ?? {}, null, 2)], { type: 'application/json' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `immensity-export-${new Date().toISOString().slice(0, 10)}.json`
            a.click()
            URL.revokeObjectURL(url)
        } catch {
            toast.error('Could not export data')
        } finally {
            setExporting(false)
        }
    }

    const handleSection = (id: Section) => {
        setSection(id)
        if (id === 'monitoring' && plan === 'admin' && monSettings === null) void loadMonitoring()
        if ((id === 'notifications' || id === 'workspace') && prefs === null) void loadPreferences()
        if ((id === 'notifications' || id === 'workspace') && products === null) void loadProductsAndAlerts()
    }

    const handleUpdateProfile = async () => {
        if (!user) return
        setLoadingProfile(true)
        try {
            await updateProfile(user, { displayName })
            toast.success('Profile updated')
        } catch {
            toast.error('Failed to update profile')
        } finally {
            setLoadingProfile(false)
        }
    }

    const handleChangePassword = async () => {
        if (!user || !user.email) return
        if (newPassword.length < 8) {
            toast.error('Password must be at least 8 characters')
            return
        }
        setLoadingPassword(true)
        try {
            const credential = EmailAuthProvider.credential(user.email, currentPassword)
            await reauthenticateWithCredential(user, credential)
            await updatePassword(user, newPassword)
            toast.success('Password updated')
            setCurrentPassword('')
            setNewPassword('')
        } catch (err: unknown) {
            const code = (err as { code?: string })?.code
            if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') toast.error('Current password is incorrect')
            else if (code === 'auth/weak-password') toast.error('New password must be at least 6 characters')
            else toast.error('Failed to update password')
        } finally {
            setLoadingPassword(false)
        }
    }

    const handleDeleteAccount = async () => {
        if (!user || !user.email) return
        setLoadingDelete(true)
        try {
            const credential = EmailAuthProvider.credential(user.email, deletePassword)
            await reauthenticateWithCredential(user, credential)
            await fetchJson('/api/account', { method: 'DELETE' })
            await deleteUser(user)
            router.push(routes.landing.home)
        } catch {
            toast.error('Failed to delete account. Check your password.')
        } finally {
            setLoadingDelete(false)
        }
    }

    const handleManageSubscription = async () => {
        if (!user) return
        const token = await user.getIdToken()
        const json = await fetchJson<{ url?: string }>('/api/stripe/portal', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
        })
        if (json?.url) window.location.href = json.url
    }

    const isPaid = isPaidUser(plan)
    const navItems = plan === 'admin'
        ? [...baseNavItems, { id: 'monitoring' as Section, label: 'Monitoring' }]
        : baseNavItems
    const activeItem = navItems.find(item => item.id === section) ?? navItems[0]

    return (
        <div className="flex min-h-full flex-col gap-6 px-8 py-10">
            <PageHeader
                eyebrow="Settings"
                title={activeItem.label}
                description="Manage account preferences, appearance, plan, and workspace defaults."
            />

            <div className="flex flex-wrap gap-2 rounded-md border border-(--color-border) bg-(--color-surface) p-2">
                {navItems.map(item => (
                    <button
                        key={item.id}
                        onClick={() => handleSection(item.id)}
                        className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${section === item.id ? 'bg-(--color-text) text-(--color-bg)' : 'text-(--color-text-muted) hover:bg-(--color-bg) hover:text-(--color-text)'}`}
                    >
                        {item.label}
                    </button>
                ))}
            </div>

            <main className="flex w-full max-w-5xl flex-col gap-5">
                {loading && (
                    <section className={`${panelClass} animate-pulse`}>
                        <div className="h-5 w-28 rounded bg-(--color-surface-tint)" />
                        <div className="mt-5 h-36 rounded-md bg-(--color-surface-tint)" />
                    </section>
                )}

                {!loading && section === 'profile' && (
                    <section className={panelClass}>
                        <div>
                            <h2 className="text-lg font-semibold text-(--color-text)">Profile</h2>
                            <p className="mt-1 text-sm text-(--color-text-muted)">Update your display name.</p>
                        </div>
                        <div className="mt-5 flex max-w-xl flex-col gap-4">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-medium text-(--color-text)">Display name</label>
                                <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} disabled={loadingProfile} className={inputClass} />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-medium text-(--color-text)">Email</label>
                                <input type="email" value={email} disabled className={inputClass} />
                                <p className="text-xs text-(--color-text-muted)">Email cannot be changed.</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <button onClick={handleUpdateProfile} disabled={loadingProfile || !displayName.trim()} className={buttonClass}>
                                    {loadingProfile ? 'Saving...' : 'Save changes'}
                                </button>
                                <span className="text-xs text-(--color-text-muted)">{savedCount} saved pipeline cards</span>
                            </div>
                        </div>
                    </section>
                )}

                {!loading && section === 'appearance' && (
                    <section className={panelClass}>
                        <div>
                            <h2 className="text-lg font-semibold text-(--color-text)">Appearance</h2>
                            <p className="mt-1 text-sm text-(--color-text-muted)">Choose how the dashboard looks to you.</p>
                        </div>
                        <div className="mt-5 flex flex-wrap gap-4">
                            <button onClick={() => theme === 'dark' && toggleTheme()} className={`flex w-44 flex-col gap-2 rounded-md border p-3 transition-colors ${theme === 'light' ? 'border-(--color-text)' : 'border-(--color-border) hover:border-(--color-text-muted)'}`}>
                                <LightPreview />
                                <span className="text-sm font-medium text-(--color-text)">Light</span>
                                {theme === 'light' && <span className="text-xs text-(--color-text-muted)">Currently active</span>}
                            </button>
                            <button onClick={() => theme === 'light' && toggleTheme()} className={`flex w-44 flex-col gap-2 rounded-md border p-3 transition-colors ${theme === 'dark' ? 'border-(--color-text)' : 'border-(--color-border) hover:border-(--color-text-muted)'}`}>
                                <DarkPreview />
                                <span className="text-sm font-medium text-(--color-text)">Dark</span>
                                {theme === 'dark' && <span className="text-xs text-(--color-text-muted)">Currently active</span>}
                            </button>
                        </div>
                    </section>
                )}

                {!loading && section === 'plan' && (
                    <section className={panelClass}>
                        <div>
                            <h2 className="text-lg font-semibold text-(--color-text)">Plan</h2>
                            <p className="mt-1 text-sm text-(--color-text-muted)">Plan controls are paused while Immensity is being built.</p>
                        </div>
                        <div className="mt-5 flex flex-col gap-4 rounded-md border border-(--color-border) bg-(--color-bg) p-5">
                            <div className="flex items-center justify-between gap-4">
                                <div>
                                    <p className="text-sm font-semibold text-(--color-text)">All features are temporarily unlocked.</p>
                                    <p className="mt-1 text-xs text-(--color-text-muted)">Stripe and subscription settings remain connected, but upgrade prompts and plan gates are hidden for now.</p>
                                </div>
                                <span className="rounded-md bg-(--color-surface) px-2.5 py-1 text-xs font-medium capitalize text-(--color-text-muted)">{plan}</span>
                            </div>
                            {cancelAtPeriodEnd && currentPeriodEnd && (
                                <p className="text-xs text-(--color-text-muted)">Cancels at period end: {currentPeriodEnd}</p>
                            )}
                            {isPaid && (
                                <button onClick={handleManageSubscription} className="self-start rounded-md border border-(--color-border) px-4 py-2 text-sm font-medium text-(--color-text) transition-colors hover:bg-(--color-surface)">
                                    Manage subscription
                                </button>
                            )}
                            {!isPaid && (
                                <button onClick={() => void loadPlan()} className="self-start rounded-md border border-(--color-border) px-4 py-2 text-sm font-medium text-(--color-text) transition-colors hover:bg-(--color-surface)">
                                    Refresh plan
                                </button>
                            )}
                        </div>
                    </section>
                )}

                {!loading && section === 'account' && (
                    <section className={panelClass}>
                        <div>
                            <h2 className="text-lg font-semibold text-(--color-text)">Account</h2>
                            <p className="mt-1 text-sm text-(--color-text-muted)">Change your password or delete your account.</p>
                        </div>
                        <div className="mt-5 flex max-w-xl flex-col gap-4">
                            <p className="text-xs font-semibold uppercase tracking-widest text-(--color-text-muted)">Change password</p>
                            <PasswordInput value={currentPassword} onChangeAction={e => setCurrentPassword(e.target.value)} disabled={loadingPassword} label="Current password" />
                            <PasswordInput value={newPassword} onChangeAction={e => setNewPassword(e.target.value)} disabled={loadingPassword} label="New password" />
                            <button onClick={handleChangePassword} disabled={loadingPassword || !currentPassword || !newPassword} className={buttonClass}>
                                {loadingPassword ? 'Updating...' : 'Update password'}
                            </button>
                        </div>
                        <div className="mt-6 flex flex-col gap-4 border-t border-(--color-border) pt-6">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-widest text-(--color-error)">Danger zone</p>
                                <p className="mt-1 text-sm text-(--color-text-muted)">Permanently delete your account and all data.</p>
                            </div>
                            {!showDeleteConfirm ? (
                                <button onClick={() => setShowDeleteConfirm(true)} className="self-start rounded-md border border-(--color-error) px-4 py-2 text-sm font-medium text-(--color-error) transition-colors hover:bg-(--color-error-soft)">
                                    Delete account
                                </button>
                            ) : (
                                <div className="flex max-w-xl flex-col gap-3">
                                    <PasswordInput value={deletePassword} onChangeAction={e => setDeletePassword(e.target.value)} disabled={loadingDelete} label="Enter your password to confirm deletion" />
                                    <div className="flex items-center gap-3">
                                        <button onClick={handleDeleteAccount} disabled={loadingDelete || !deletePassword} className="rounded-md bg-(--color-error) px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-80 disabled:opacity-40">
                                            {loadingDelete ? 'Deleting...' : 'Confirm delete'}
                                        </button>
                                        <button onClick={() => { setShowDeleteConfirm(false); setDeletePassword('') }} disabled={loadingDelete} className="px-3 py-2 text-sm text-(--color-text-muted) transition-colors hover:text-(--color-text) disabled:opacity-50">
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>
                )}

                {!loading && section === 'notifications' && (
                    <section className={panelClass}>
                        <div>
                            <h2 className="text-lg font-semibold text-(--color-text)">Notifications</h2>
                            <p className="mt-1 text-sm text-(--color-text-muted)">Control alert emails and per-product alerts.</p>
                        </div>
                        {!prefs ? (
                            <p className="mt-5 text-sm text-(--color-text-muted)">Loading...</p>
                        ) : (
                            <div className="mt-5 flex flex-col gap-6">
                                <div className="flex flex-col divide-y divide-(--color-border) rounded-md border border-(--color-border) bg-(--color-bg)">
                                    <div className="flex items-center justify-between gap-4 px-4 py-3">
                                        <div>
                                            <p className="text-sm font-medium text-(--color-text)">Email me alerts</p>
                                            <p className="text-xs text-(--color-text-muted)">Turn all monitoring alert emails on or off.</p>
                                        </div>
                                        <SettingsToggle checked={prefs.alertsEmailEnabled} disabled={savingPrefs} onChange={v => void savePreferences({ alertsEmailEnabled: v })} />
                                    </div>
                                    <div className="flex items-center justify-between gap-4 px-4 py-3">
                                        <div>
                                            <p className="text-sm font-medium text-(--color-text)">Delivery</p>
                                            <p className="text-xs text-(--color-text-muted)">Send each alert instantly or batch into a digest.</p>
                                        </div>
                                        <select value={prefs.digestCadence} disabled={savingPrefs} onChange={e => void savePreferences({ digestCadence: e.target.value as UserPrefs['digestCadence'] })} className={selectClass}>
                                            <option value="instant">Instant</option>
                                            <option value="daily">Daily digest</option>
                                            <option value="weekly">Weekly digest</option>
                                        </select>
                                    </div>
                                    <div className="flex flex-col gap-2 px-4 py-3">
                                        <div>
                                            <p className="text-sm font-medium text-(--color-text)">Alert email</p>
                                            <p className="text-xs text-(--color-text-muted)">Where alerts are sent. Defaults to your account email.</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <input value={alertEmailDraft} onChange={e => setAlertEmailDraft(e.target.value)} placeholder={email} className={`${inputClass} flex-1`} />
                                            <button type="button" disabled={savingPrefs} onClick={() => void savePreferences({ alertEmail: alertEmailDraft.trim() || null })} className={buttonClass}>Save</button>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-3">
                                    <p className="text-xs font-semibold uppercase tracking-widest text-(--color-text-muted)">Per-product alerts</p>
                                    {products && products.length === 0 && (
                                        <p className="text-sm text-(--color-text-muted)">Launched products will appear here when they can receive alert rules.</p>
                                    )}
                                    {(products ?? []).map(p => {
                                        const a = productAlerts[p.id]
                                        return (
                                            <div key={p.id} className="rounded-md border border-(--color-border) bg-(--color-bg)">
                                                <p className="px-4 pt-3 text-sm font-medium text-(--color-text)">{p.name}</p>
                                                {!a ? (
                                                    <p className="px-4 py-3 text-xs text-(--color-text-muted)">No alert settings.</p>
                                                ) : (
                                                    <div className="mt-2 divide-y divide-(--color-border)">
                                                        {([
                                                            ['newIssueEnabled', 'New error issue'],
                                                            ['errorSpikeEnabled', 'Error spike'],
                                                            ['signupsDropEnabled', 'Signups drop'],
                                                            ['revenueDropEnabled', 'Revenue drop'],
                                                        ] as [keyof AlertSettings, string][]).map(([key, label]) => (
                                                            <div key={key} className="flex items-center justify-between gap-4 px-4 py-2.5">
                                                                <p className="text-sm text-(--color-text)">{label}</p>
                                                                <SettingsToggle checked={Boolean(a[key])} disabled={savingAlertId === p.id} onChange={v => void saveProductAlerts(p.id, { ...a, [key]: v })} />
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                                    <p className="text-xs text-(--color-text-muted)">Fine-tune thresholds in Monitor &rarr; Setup &rarr; Alerts.</p>
                                </div>
                            </div>
                        )}
                    </section>
                )}

                {!loading && section === 'workspace' && (
                    <section className={panelClass}>
                        <div>
                            <h2 className="text-lg font-semibold text-(--color-text)">Workspace</h2>
                            <p className="mt-1 text-sm text-(--color-text-muted)">Defaults applied when you open the dashboard.</p>
                        </div>
                        {!prefs ? (
                            <p className="mt-5 text-sm text-(--color-text-muted)">Loading...</p>
                        ) : (
                            <div className="mt-5 flex flex-col divide-y divide-(--color-border) rounded-md border border-(--color-border) bg-(--color-bg)">
                                <div className="flex items-center justify-between gap-4 px-4 py-3">
                                    <div>
                                        <p className="text-sm font-medium text-(--color-text)">Default product</p>
                                        <p className="text-xs text-(--color-text-muted)">Pre-selected in Monitor.</p>
                                    </div>
                                    <select value={prefs.defaultPipelineId ?? ''} disabled={savingPrefs} onChange={e => void savePreferences({ defaultPipelineId: e.target.value || null })} className={selectClass}>
                                        <option value="">None</option>
                                        {(products ?? []).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                </div>
                                <div className="flex items-center justify-between gap-4 px-4 py-3">
                                    <div>
                                        <p className="text-sm font-medium text-(--color-text)">Landing page</p>
                                        <p className="text-xs text-(--color-text-muted)">Where you start after sign-in.</p>
                                    </div>
                                    <select value={prefs.defaultLanding ?? ''} disabled={savingPrefs} onChange={e => void savePreferences({ defaultLanding: e.target.value || null })} className={selectClass}>
                                        <option value="">Default</option>
                                        <option value="dashboard">Dashboard</option>
                                        <option value="monitor">Monitor</option>
                                        <option value="discover">Build</option>
                                        <option value="pipeline">Pipeline</option>
                                    </select>
                                </div>
                            </div>
                        )}
                    </section>
                )}

                {!loading && section === 'data' && (
                    <section className={panelClass}>
                        <div>
                            <h2 className="text-lg font-semibold text-(--color-text)">Data &amp; Privacy</h2>
                            <p className="mt-1 text-sm text-(--color-text-muted)">Export your data. Account deletion lives under Account.</p>
                        </div>
                        <div className="mt-5 flex items-center justify-between gap-4 rounded-md border border-(--color-border) bg-(--color-bg) p-4">
                            <div>
                                <p className="text-sm font-medium text-(--color-text)">Export my data</p>
                                <p className="text-xs text-(--color-text-muted)">Download your pipelines, problems, and tasks as JSON.</p>
                            </div>
                            <button type="button" disabled={exporting} onClick={() => void exportData()} className="rounded-md border border-(--color-border) px-4 py-2 text-sm font-medium text-(--color-text) transition-colors hover:bg-(--color-bg) disabled:opacity-40">
                                {exporting ? 'Exporting...' : 'Export JSON'}
                            </button>
                        </div>
                    </section>
                )}

                {!loading && section === 'monitoring' && plan === 'admin' && (
                    <section className={panelClass}>
                        <div>
                            <h2 className="text-lg font-semibold text-(--color-text)">Monitoring</h2>
                            <p className="mt-1 text-sm text-(--color-text-muted)">Global analytics and alert configuration. Applies to every monitored product.</p>
                        </div>
                        {monLoading && !monSettings && <p className="mt-5 text-sm text-(--color-text-muted)">Loading...</p>}
                        {monSettings && (
                            <div className="mt-5 flex flex-col gap-6">
                                {Array.from(new Set(monSettings.map(s => s.group))).map(group => (
                                    <div key={group} className="flex flex-col gap-3">
                                        <p className="text-xs font-semibold uppercase tracking-widest text-(--color-text-muted)">{group}</p>
                                        <div className="flex flex-col divide-y divide-(--color-border) rounded-md border border-(--color-border) bg-(--color-bg)">
                                            {monSettings.filter(s => s.group === group).map(s => (
                                                <div key={s.key} className="flex items-center justify-between gap-4 px-4 py-3">
                                                    <div>
                                                        <p className="text-sm font-medium text-(--color-text)">{s.label}</p>
                                                        <p className="text-xs text-(--color-text-muted)">{s.isDefault ? 'Default' : 'Custom'}</p>
                                                    </div>
                                                    {s.kind === 'toggle' ? (
                                                        <button
                                                            type="button"
                                                            role="switch"
                                                            aria-checked={Boolean(s.value)}
                                                            disabled={monSavingKey === s.key}
                                                            onClick={() => void saveSetting(s.key, !(s.value as boolean))}
                                                            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${s.value ? 'bg-(--color-success)' : 'bg-(--color-border)'}`}
                                                        >
                                                            <span className={`inline-block h-4 w-4 transform rounded-full bg-(--color-surface-raised) shadow-[var(--shadow-sm)] transition-transform ${s.value ? 'translate-x-6' : 'translate-x-1'}`} />
                                                        </button>
                                                    ) : (
                                                        <select
                                                            value={Number(s.value)}
                                                            disabled={monSavingKey === s.key}
                                                            onChange={e => void saveSetting(s.key, Number(e.target.value))}
                                                            className="rounded-md border border-(--color-border) bg-(--color-surface) px-3 py-2 text-sm text-(--color-text) outline-none focus:ring-2 focus:ring-(--color-text) disabled:opacity-50"
                                                        >
                                                            {s.options.map(opt => (
                                                                <option key={opt} value={opt}>{opt}{s.unit ? ` ${s.unit}` : ''}</option>
                                                            ))}
                                                        </select>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                )}
            </main>
        </div>
    )
}
