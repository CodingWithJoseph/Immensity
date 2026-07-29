import type { Metadata } from "next";
import Reveal from "@/components/Reveal";
import PricingPlans from "@/components/PricingPlans";
import { DualCta } from "@/components/CtaButtons";

export const metadata: Metadata = {
    title: "Pricing",
    description: "Simple, honest plans. Start free and upgrade when the evidence is worth acting on.",
};

const faqs = [
    { q: "Is the free plan really free?", a: "Yes. Free includes daily searches, the full signal experience, and room to take a real idea from discovery to a first build. No card required." },
    { q: "Can I change plans later?", a: "Anytime. Upgrade when the evidence is worth acting on, or downgrade if your needs change. There is no lock-in." },
    { q: "What does upgrading unlock?", a: "Pro removes limits on searches, pipelines, problems, and tasks, and turns on automatic cluster detection." },
    { q: "Where does the data come from?", a: "From public complaints, questions, workarounds, and buying signals, organized into opportunity clusters." },
];

export default function PricingPage() {
    return (
        <main>
            <section className="pf-page-hero">
                <div className="pf-shell pf-page-hero__panel pf-page-hero__panel--coral">
                    <Reveal><p className="pf-eyebrow">Pricing</p></Reveal>
                    <Reveal delay={60}><h1>Start free. Pay when it pays off.</h1></Reveal>
                    <Reveal delay={120}><p className="pf-page-hero__copy">Explore the signal for free. Upgrade when you find something worth moving on.</p></Reveal>
                </div>
            </section>

            <section className="pf-section pf-pricing-section">
                <div className="pf-shell">
                    <PricingPlans />
                    <p style={{ marginTop: 24, textAlign: "center", color: "var(--ink-faint)", fontSize: 12 }}>Prices in USD. Cancel anytime.</p>
                </div>
            </section>

            <section className="pf-section">
                <div className="pf-shell">
                    <div className="pf-section-heading">
                        <div><p className="pf-eyebrow">Questions</p><h2>Clear answers, no fine print.</h2></div>
                        <p className="pf-section-heading__copy">Get started without a card and make the paid decision only when the product is already useful.</p>
                    </div>
                    <div className="pf-faq-list">
                        {faqs.map((faq, index) => (
                            <Reveal key={faq.q} delay={index * 45} className="pf-faq-item">
                                <h3>{faq.q}</h3>
                                <p>{faq.a}</p>
                            </Reveal>
                        ))}
                    </div>
                </div>
            </section>

            <section className="pf-section">
                <div className="pf-shell pf-cta">
                    <p className="pf-eyebrow">Start today</p>
                    <h2>Start with signal.</h2>
                    <p>The first useful search is free. So is the next one.</p>
                    <DualCta />
                </div>
            </section>
        </main>
    );
}

