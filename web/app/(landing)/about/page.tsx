import Image from "next/image";
import type { Metadata } from "next";
import Reveal from "@/components/Reveal";
import { DualCta } from "@/components/CtaButtons";
import { about } from "@/app/util/content/text-about";

export const metadata: Metadata = {
    title: "About",
    description: about.hero.text_secondary,
};

const principles = [
    { title: "Evidence over instinct.", body: "Start from what the market already says, not from a hunch.", tone: "peach" },
    { title: "Signal over noise.", body: "Score and cluster real demand so the few things that matter rise to the top.", tone: "dark" },
    { title: "Builders everywhere.", body: "Opportunity should not depend on where you start or who you know.", tone: "coral" },
];

export default function AboutPage() {
    return (
        <main>
            <section className="pf-page-hero">
                <div className="pf-shell pf-page-hero__panel">
                    <Reveal><p className="pf-eyebrow">{about.hero.eyebrow}</p></Reveal>
                    <Reveal delay={60}><h1>{about.hero.text_primary}</h1></Reveal>
                    <Reveal delay={120}><p className="pf-page-hero__copy">{about.hero.text_secondary}</p></Reveal>
                </div>
            </section>

            <section className="pf-section pf-section--tight">
                <div className="pf-shell pf-page-grid">
                    <Reveal className="pf-block pf-block--wide pf-block--gray">
                        <p className="pf-eyebrow">The reason</p>
                        <h2>Start closer to the truth.</h2>
                        <p>{about.hero.text_body}</p>
                    </Reveal>
                    <Reveal delay={80} className="pf-block pf-block--narrow pf-block--dark pf-founder">
                        <div>
                            <p className="pf-eyebrow">Built by a builder</p>
                            <h2>{about.hero.founder_name}</h2>
                            <p className="pf-founder__meta">{about.hero.founder_title}</p>
                        </div>
                        <div className="pf-founder__image">
                            <Image
                                src={about.hero.founder_image}
                                alt={about.hero.founder_image_alt}
                                width={300}
                                height={360}
                            />
                        </div>
                    </Reveal>
                </div>
            </section>

            <section className="pf-section">
                <div className="pf-shell">
                    <div className="pf-section-heading">
                        <div><p className="pf-eyebrow">What we believe</p><h2>Three principles. One useful place to start.</h2></div>
                        <p className="pf-section-heading__copy">Immensity is designed to help good builders spend their conviction on problems the market has already made visible.</p>
                    </div>
                    <div className="pf-page-grid">
                        {principles.map((principle, index) => (
                            <Reveal
                                key={principle.title}
                                delay={index * 70}
                                className={`pf-block pf-block--${index === 0 ? "wide" : index === 1 ? "narrow" : "full"} pf-block--${principle.tone}`}
                            >
                                <p className="pf-eyebrow">0{index + 1}</p>
                                <h3>{principle.title}</h3>
                                <p>{principle.body}</p>
                            </Reveal>
                        ))}
                    </div>
                </div>
            </section>

            <section className="pf-section">
                <div className="pf-shell pf-cta">
                    <p className="pf-eyebrow">Start here</p>
                    <h2>Build from evidence, not instinct.</h2>
                    <DualCta />
                </div>
            </section>
        </main>
    );
}
