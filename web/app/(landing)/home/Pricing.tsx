import Link from "next/link";
import SectionHeading from "@/app/(landing)/home/SectionHeading";
import PricingPlans from "@/components/PricingPlans";
import { routes } from "@/app/util/routes";

export default function Pricing() {
    return (
        <section id="pricing" className="pf-section pf-pricing-section">
            <div className="pf-shell">
                <SectionHeading
                    eyebrow="Pricing"
                    title="Simple plans for serious curiosity."
                    subhead="Start free. Upgrade when the evidence is worth acting on."
                />
                <PricingPlans />
                <div style={{ marginTop: 24, textAlign: "center" }}>
                    <Link href={routes.landing.pricing} className="pf-button">Compare every detail â†’</Link>
                </div>
            </div>
        </section>
    );
}

