import type { Metadata } from "next";
import Reveal from "@/components/Reveal";
import { DualCta } from "@/components/CtaButtons";
import { philosophy } from "@/app/util/content/text-philosophy";

export const metadata: Metadata = {
    title: "Philosophy",
    description: philosophy.hero.text_secondary,
};

export default function PhilosophyPage() {
    const approaches = [philosophy.approaches.iterative, philosophy.approaches.deliberate];

    return (
        <main>
            <section className="pf-page-hero">
                <div className="pf-shell pf-page-hero__panel pf-page-hero__panel--gray">
                    <Reveal><p className="pf-eyebrow">{philosophy.hero.eyebrow}</p></Reveal>
                    <Reveal delay={60}><h1>{philosophy.hero.text_primary}</h1></Reveal>
                    <Reveal delay={120}><p className="pf-page-hero__copy">{philosophy.hero.text_secondary}</p></Reveal>
                </div>
            </section>

            <section className="pf-section pf-section--tight">
                <div className="pf-shell pf-page-grid">
                    <Reveal className="pf-block pf-block--wide pf-block--coral">
                        <p className="pf-eyebrow">The shift</p>
                        <h2>{philosophy.belief.text_primary}</h2>
                    </Reveal>
                    <Reveal delay={70} className="pf-block pf-block--narrow pf-block--dark">
                        <p className="pf-eyebrow">Why now</p>
                        <h2>Knowing what to build is still the hard part.</h2>
                        <p>{philosophy.belief.text_secondary}</p>
                    </Reveal>
                </div>
            </section>

            <section className="pf-section">
                <div className="pf-shell">
                    <div className="pf-section-heading">
                        <div><p className="pf-eyebrow">Two modes</p><h2>Move fast or study deeply.</h2></div>
                        <p className="pf-section-heading__copy">Both approaches work when they begin close to demand. Immensity supports the builder who learns by launching and the builder who moves with conviction.</p>
                    </div>
                    <div className="pf-page-grid">
                        {approaches.map((approach, index) => (
                            <Reveal
                                key={approach.eyebrow}
                                delay={index * 80}
                                className={`pf-block ${index === 0 ? "pf-block--wide pf-block--peach" : "pf-block--narrow"}`}
                            >
                                <p className="pf-eyebrow">{approach.eyebrow}</p>
                                <h2>{approach.text_primary}<br />{approach.text_secondary}</h2>
                                {approach.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                            </Reveal>
                        ))}
                    </div>
                </div>
            </section>

            <section className="pf-section">
                <div className="pf-shell">
                    <div className="pf-section-heading">
                        <div><p className="pf-eyebrow">{philosophy.shared_belief.eyebrow}</p><h2>{philosophy.shared_belief.text_primary} {philosophy.shared_belief.text_secondary}</h2></div>
                        <p className="pf-section-heading__copy">{philosophy.shared_belief.text_description}</p>
                    </div>
                    <div className="pf-page-grid">
                        {philosophy.shared_belief.cards.map((card, index) => (
                            <Reveal
                                key={card.id}
                                delay={index * 80}
                                className={`pf-block ${index === 0 ? "pf-block--narrow pf-block--dark" : "pf-block--wide pf-block--coral"}`}
                            >
                                <p className="pf-eyebrow">{card.eyebrow}</p>
                                <h2>{card.title}</h2>
                                <p>{card.description}</p>
                            </Reveal>
                        ))}
                    </div>
                </div>
            </section>

            <section className="pf-section">
                <div className="pf-shell pf-cta">
                    <p className="pf-eyebrow">{philosophy.cta.eyebrow}</p>
                    <h2>{philosophy.cta.text_primary}</h2>
                    <p>{philosophy.cta.text_secondary}</p>
                    <DualCta />
                </div>
            </section>
        </main>
    );
}
