import Reveal from "@/components/Reveal";
import SectionHeading from "@/app/(landing)/home/SectionHeading";
import { home } from "@/app/util/content/text-home";

const visualRows: Record<string, { label: string; value: string }[]> = {
    score: [
        { label: "Pain intensity", value: "8.4" },
        { label: "Buying intent", value: "High" },
        { label: "Opportunity score", value: "87" },
    ],
    momentum: [
        { label: "30 day change", value: "+38%" },
        { label: "New signals", value: "412" },
        { label: "Direction", value: "Rising" },
    ],
    discovery: [
        { label: "Invoice reconciliation", value: "92" },
        { label: "Receipt syncing", value: "81" },
        { label: "Duplicate charges", value: "67" },
    ],
    pipeline: [
        { label: "Watching", value: "12" },
        { label: "Validating", value: "04" },
        { label: "Building", value: "01" },
    ],
};

export default function Features() {
    return (
        <section className="pf-section">
            <div className="pf-shell">
                <SectionHeading
                    eyebrow={home.features.eyebrow}
                    title={home.features.text_primary}
                    subhead={home.features.text_secondary}
                />
                <div className="pf-feature-grid">
                    {home.features.cards.map((card, index) => (
                        <Reveal key={card.id} delay={index * 70} className="pf-feature-card">
                            <div className="pf-feature-card__copy">
                                <p className="pf-eyebrow">Feature 0{index + 1}</p>
                                <h3>{card.label}</h3>
                                <p>{card.description}</p>
                            </div>
                            <div className="pf-feature-visual" aria-hidden>
                                {visualRows[card.kind].map((row) => (
                                    <div key={row.label} className="pf-feature-visual__row">
                                        <span>{row.label}</span>
                                        <span className="pf-feature-visual__value">{row.value}</span>
                                    </div>
                                ))}
                            </div>
                        </Reveal>
                    ))}
                </div>
            </div>
        </section>
    );
}
