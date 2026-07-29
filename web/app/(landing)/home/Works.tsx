import Reveal from "@/components/Reveal";
import SectionHeading from "@/app/(landing)/home/SectionHeading";
import { home } from "@/app/util/content/text-home";

export default function Works() {
    return (
        <section id="how-it-works" className="pf-section">
            <div className="pf-shell">
                <SectionHeading
                    eyebrow={home.works.eyebrow}
                    title={home.works.text_primary}
                    subhead={home.works.text_secondary}
                />
                <div className="pf-steps-panel">
                    <div className="pf-steps-list">
                        {home.works.cards.map((card, index) => (
                            <Reveal key={card.id} delay={index * 55} className="pf-step">
                                <span className="pf-step__number">{card.step}</span>
                                <h3>{card.label}</h3>
                                <p>{card.description}</p>
                            </Reveal>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
