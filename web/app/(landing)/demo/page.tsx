import type { Metadata } from "next";
import DemoClusters from "@/app/(landing)/demo/DemoClusters";
import { DualCta } from "@/components/CtaButtons";

export const metadata: Metadata = {
    title: "Live demo",
    description: "A live, read-only view of real opportunity clusters from the Immensity pipeline.",
};

export default async function DemoPage({ searchParams }: {
    searchParams: Promise<{ q?: string | string[] }>
}) {
    const params = await searchParams
    const initialQuery = typeof params.q === 'string' ? params.q : ''

    return (
        <main>
            <section className="pf-demo-header">
                <div className="pf-shell pf-demo-header__panel">
                    <p className="pf-eyebrow">Live opportunity signal</p>
                    <h1>See what the market is telling you.</h1>
                    <p>Search real opportunity clusters from the Immensity pipeline. No account needed.</p>
                </div>
            </section>

            <DemoClusters initialQuery={initialQuery} />

            <section className="pf-section">
                <div className="pf-shell pf-cta">
                    <p className="pf-eyebrow">Your turn</p>
                    <h2>Find your opportunity.</h2>
                    <p>Move from one promising cluster to a grounded product direction.</p>
                    <DualCta />
                </div>
            </section>
        </main>
    );
}
