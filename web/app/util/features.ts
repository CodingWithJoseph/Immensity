import { routes } from '@/app/util/routes'

// ────────────────────────────────────────────────────────────────────────────

export type DownstreamRoom = {
    key: string
    label: string
    href: string
}

export const DOWNSTREAM_ROOMS: DownstreamRoom[] = [
    { key: 'signal',      label: 'Signal',      href: routes.core.signal },
    { key: 'posts',       label: 'Posts',       href: routes.core.posts },
    { key: 'problems',    label: 'Breakdown',     href: routes.core.problems },
    { key: 'tasks',       label: 'Task List',    href: routes.core.tasks },
]
