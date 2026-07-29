import WideContainer from "@/components/WideContainer";

function Block({ className = "" }: { className?: string }) {
    return <div className={`rounded-[var(--radius)] bg-(--surface-2) ${className}`} />;
}

function CardSkeleton() {
    return (
        <div className="flex flex-col gap-4 rounded-[var(--radius-xl)] border border-(--border) bg-(--bg) p-6">
            <div className="flex items-start justify-between">
                <Block className="h-4 w-20" />
                <Block className="h-14 w-14 rounded-[var(--radius)]" />
            </div>
            <Block className="h-5 w-4/5" />
            <Block className="h-4 w-24" />
            <div className="space-y-2 border-t border-(--border) pt-4">
                <Block className="h-3 w-full" />
                <Block className="h-3 w-11/12" />
                <Block className="h-3 w-3/4" />
            </div>
        </div>
    );
}

export default function DemoSkeleton() {
    return (
        <div className="animate-pulse" aria-hidden>
            {/* Hero */}
            <section className="border-b border-(--border) bg-(--bg-warm)">
                <WideContainer className="flex flex-col items-center py-20 md:py-28">
                    <Block className="h-6 w-32 rounded-full" />
                    <Block className="mt-6 h-10 w-3/4 max-w-xl" />
                    <Block className="mt-4 h-5 w-2/3 max-w-md" />
                </WideContainer>
            </section>

            {/* Clusters grid */}
            <section className="py-20 md:py-28">
                <WideContainer>
                    <Block className="mb-3 h-4 w-32" />
                    <Block className="mb-12 h-8 w-72" />
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <CardSkeleton key={i} />
                        ))}
                    </div>
                </WideContainer>
            </section>

            {/* Leaderboard */}
            <section className="border-t border-(--border) bg-(--bg-warm) py-20 md:py-28">
                <WideContainer>
                    <Block className="mb-3 h-4 w-28" />
                    <Block className="mb-12 h-8 w-80" />
                    <div className="overflow-hidden rounded-[var(--radius-xl)] border border-(--border) bg-(--bg)">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="flex items-center gap-5 border-b border-(--border) px-7 py-4 last:border-0">
                                <Block className="h-4 w-5" />
                                <Block className="h-4 flex-1" />
                                <Block className="h-6 w-10" />
                            </div>
                        ))}
                    </div>
                </WideContainer>
            </section>
        </div>
    );
}
