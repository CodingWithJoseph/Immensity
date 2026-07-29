import type { Metadata } from "next";
import Reveal from "@/components/Reveal";
import { PrimaryCta } from "@/components/CtaButtons";
import { learn } from "@/app/util/content/text-learn";

export const metadata: Metadata = {
    title: "Learn",
    description: "A practical guide to finding, researching, validating, and building from real market signal.",
};

export default function LearnPage() {
    const sections = Object.values(learn.sections);

    return (
        <main>
            <section className="pf-page-hero">
                <div className="pf-shell pf-page-hero__panel">
                    <Reveal><p className="pf-eyebrow">{learn.hero.eyebrow}</p></Reveal>
                    <Reveal delay={60}><h1>{learn.hero.text_primary}</h1></Reveal>
                    <Reveal delay={120} className="pf-anchor-row">
                        {learn.anchors.map((anchor) => <a key={anchor.label} href={anchor.href}>{anchor.label}</a>)}
                    </Reveal>
                </div>
            </section>

            {sections.map((section, sectionIndex) => (
                <section key={section.id} id={section.id} className="pf-learn-section">
                    <div className="pf-shell">
                        <div className="pf-learn-section__header">
                            <Reveal><p className="pf-eyebrow">0{sectionIndex + 1} / {section.label}</p></Reveal>
                            <Reveal delay={50}><h2>{section.muted}</h2></Reveal>
                        </div>

                        {section.id === "faq" ? (
                            <div className="pf-faq-list">
                                {section.cards.map((card, index) => (
                                    <Reveal key={card.title} delay={index * 25} className="pf-faq-item">
                                        <h3>{card.title}</h3>
                                        <p>{card.description}</p>
                                    </Reveal>
                                ))}
                            </div>
                        ) : (
                            <div className="pf-learn-grid">
                                {section.cards.map((card, index) => (
                                    <Reveal key={card.title} delay={(index % 3) * 45} className="pf-learn-card">
                                        {card.eyebrow && <p className="pf-eyebrow">{card.eyebrow}</p>}
                                        <h3>{card.title}</h3>
                                        <p>{card.description}</p>
                                    </Reveal>
                                ))}
                            </div>
                        )}
                    </div>
                </section>
            ))}

            <section className="pf-section">
                <div className="pf-shell pf-cta">
                    <p className="pf-eyebrow">Ready when you are</p>
                    <h2>Put the guide into practice.</h2>
                    <p>Search the live signal, save the strongest patterns, and turn one opportunity into a plan.</p>
                    <div className="pf-cta__actions"><PrimaryCta size="lg" /></div>
                </div>
            </section>
        </main>
    );
}
