// One entry in a chart/calendar legend: a small colour swatch plus its label.
// `shape` picks a round dot (calendar event colours) or a squared-off chip
// (Gantt bar colours); `swatch` supplies the Tailwind background/border classes.
export function LegendKey({ swatch, label, shape = 'dot' }: { swatch: string; label: string; shape?: 'dot' | 'square' }) {
    const rounding = shape === 'dot' ? 'rounded-full' : 'rounded-[2px]'
    return (
        <span className="inline-flex items-center gap-1.5 text-[11px] text-(--color-text-muted)">
            <span className={`h-2 w-2 ${rounding} ${swatch}`} />
            {label}
        </span>
    )
}
