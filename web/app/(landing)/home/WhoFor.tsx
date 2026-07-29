import Reveal from "@/components/Reveal";
import SectionHeading from "@/app/(landing)/home/SectionHeading";
import { home } from "@/app/util/content/text-home";

export default function WhoFor() {
    return (
        <section className="pf-section">
            <div className="pf-shell">
                <SectionHeading
                    eyebrow={home.who_for.eyebrow}
                    title={home.who_for.text_primary}
                    subhead={home.who_for.text_secondary}
                />
                <div className="pf-audience-grid">
                    {home.who_for.cards.map((card, index) => (
                        <Reveal key={card.id} delay={index * 70} className="pf-audience-card">
                            <span className="pf-audience-card__index">0{index + 1}</span>
                            <h3>{card.label}</h3>
                            <p>{card.description}</p>
                        </Reveal>
                    ))}
                </div>
            </div>
        </section>
    );
}
