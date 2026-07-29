import UserAvatar from '@/app/(core)/dashboard/components/UserAvatar'

export default function UserIdentity({
    name,
    photoUrl,
    kind = 'user',
}: {
    name: string
    photoUrl?: string | null
    kind?: 'user' | 'team'
}) {
    return (
        <span className="inline-flex min-w-0 items-center justify-end gap-2">
            <UserAvatar name={name} photoUrl={photoUrl} kind={kind} size="xs" />
            <span className="truncate">{name}</span>
        </span>
    )
}
