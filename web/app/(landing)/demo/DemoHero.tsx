import WideContainer from "@/components/WideContainer";
import { relativeTime } from "@/app/(landing)/demo/util";

export default function DemoHero({ live, generatedAt }: { live: boolean; generatedAt: string }) {
    return (
        <section className="relative overflow-hidden border-b border-(--border) bg-(--bg-warm)">
            <div
                aria-hidden
                className="pointer-events-none absolute inset-0 -z-10"
                style={{ background: "radial-gradient(800px 360px at 50% -10%, var(--accent-soft), transparent 70%)" }}
            />
            <WideContainer className="py-20 text-center md:py-28">
                <div className="mx-auto flex max-w-2xl flex-col items-center">
                    <span
                        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${
                            live
                                ? "border-(--color-success) bg-(--color-success-soft) text-(--ink)"
                                : "border-(--border) bg-(--bg) text-(--ink-muted)"
                        }`}
                    >
                        <span className={`h-1.5 w-1.5 rounded-full ${live ? "brand-pulse bg-(--color-success)" : "bg-(--ink-faint)"}`} />
                        {live ? "Live data" : "Sample snapshot"}
                    </span>

                    <h1 className="mt-6 text-4xl font-extrabold leading-[1.04] tracking-[-0.03em] text-(--ink) md:text-6xl">
                        See what the market is telling you.
                    </h1>

                    <p className="mt-6 max-w-xl text-lg leading-7 text-(--ink-muted)">
                        {live
                            ? "Live data from the Immensity pipeline, updated regularly. No account needed."
                            : "A representative snapshot of the Immensity pipeline. No account needed."}
                    </p>

                    <p className="stat-label mt-7">Updated {relativeTime(generatedAt)}</p>
                </div>
            </WideContainer>
        </section>
    );
}
