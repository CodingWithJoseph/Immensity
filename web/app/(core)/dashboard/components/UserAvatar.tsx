import { UserRound, UsersRound } from 'lucide-react'

type AvatarSize = 'xs' | 'sm' | 'md'

const sizeClass: Record<AvatarSize, string> = {
    xs: 'h-5 w-5',
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
}

const iconSize: Record<AvatarSize, number> = { xs: 12, sm: 16, md: 19 }

export default function UserAvatar({
    name,
    photoUrl,
    kind = 'user',
    size = 'sm',
    inverted = false,
}: {
    name: string
    photoUrl?: string | null
    kind?: 'user' | 'team'
    size?: AvatarSize
    inverted?: boolean
}) {
    const tone = inverted
        ? 'bg-(--color-button) text-(--color-on-button) hover:bg-(--color-button-hover)'
        : 'border border-(--color-border) bg-(--color-bg) text-(--color-text-muted)'

    if (photoUrl) {
        return (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoUrl} alt="" title={name} className={`${sizeClass[size]} shrink-0 rounded-full object-cover`} />
        )
    }

    const Icon = kind === 'team' ? UsersRound : UserRound
    return (
        <span title={name} aria-hidden className={`grid ${sizeClass[size]} shrink-0 place-items-center rounded-full ${tone}`}>
            <Icon size={iconSize[size]} strokeWidth={1.8} />
        </span>
    )
}
