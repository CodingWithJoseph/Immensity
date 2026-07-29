import Reveal from "@/components/Reveal";
import { DualCta } from "@/components/CtaButtons";
import { home } from "@/app/util/content/text-home";

export default function CTA() {
    return (
        <section className="pf-section">
            <div className="pf-shell">
                <div className="pf-cta">
                    <Reveal><p className="pf-eyebrow">{home.cta.eyebrow}</p></Reveal>
                    <Reveal delay={60}><h2>{home.cta.text_primary}</h2></Reveal>
                    <Reveal delay={120}><p>{home.cta.text_secondary}</p></Reveal>
                    <Reveal delay={180}><DualCta /></Reveal>
                </div>
            </div>
        </section>
    );
}
