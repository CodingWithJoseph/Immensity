'use client'
import { PipelineCard } from '@/lib/types/cluster'
import { timelineProgress } from '@/lib/timeline'
import { auth } from '@/lib/firebase'
import UserAvatar from '@/app/(core)/dashboard/components/UserAvatar'
import { formatRelativeUpdate } from '@/lib/pipelineLifecycle'
import SemanticChip from '@/app/(core)/dashboard/components/SemanticChip'
import { issueCountChip, killCriteriaCountChip } from '@/app/(core)/dashboard/components/chipSets'
import ProgressBar from '@/app/(core)/dashboard/components/ProgressBar'

interface Props {
    card: PipelineCard
    onClick: () => void
}

export default function PipelineCardItem({ card, onClick }: Props) {
    const {
        killCriteria,
        updatedAt,
        createdAt,
        postIds,
        name,
        displayName,
        timelineDays,
        timelineStart,
        launchedAt,
        openIssueCount,
        openKillCriteriaCount,
        notes,
    } = card

    const timeline = timelineDays && timelineStart
        ? timelineProgress(timelineStart, timelineDays, launchedAt ?? null)
        : null
    const updated = updatedAt ?? createdAt
    const user = auth.currentUser
    const description = notes || (killCriteria ? `Stop if: ${killCriteria}` : null)

    return (
        <div
            onClick={onClick}
            className="flex cursor-pointer flex-col gap-3 rounded-md border border-(--color-border) bg-(--color-card) p-4 shadow-sm transition-all hover:border-(--color-text-muted) hover:bg-(--color-bg)">

            <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-(--color-text) leading-snug truncate">
                    {displayName ?? name}
                </p>
                <span className="shrink-0 text-xs text-(--color-text-muted)">
                    {postIds.length} post{postIds.length !== 1 ? 's' : ''}
                </span>
            </div>

            {description && (
                <p className="truncate text-xs text-(--color-text-muted)">
                    {description}
                </p>
            )}

            <div className="flex flex-wrap items-center gap-1.5">
                <SemanticChip
                    definition={issueCountChip(openIssueCount)}
                    label={openIssueCount === 1 ? 'issue' : 'issues'}
                    count={openIssueCount}
                />
                <SemanticChip
                    definition={killCriteriaCountChip(openKillCriteriaCount)}
                    label={openKillCriteriaCount === 1 ? 'kill criterion' : 'kill criteria'}
                    count={openKillCriteriaCount}
                />
            </div>

            <div className="flex items-center justify-between gap-2 text-[10px] text-(--color-text-muted)">
                <span className="inline-flex items-center gap-1.5">
                    <UserAvatar name={user?.displayName || user?.email || 'Project owner'} photoUrl={user?.photoURL} size="xs" />
                    Updated {formatRelativeUpdate(updated).toLowerCase()}
                </span>
                {timeline && <span className="font-medium tabular-nums text-(--color-text)">{Math.round(timeline.percent)}%</span>}
            </div>

            {timeline && (
                <ProgressBar
                    value={timeline.percent}
                    max={100}
                    size="xs"
                    rounded="rounded-b-md"
                    className="-mx-4 -mb-4 mt-1"
                />
            )}
        </div>
    )
}
