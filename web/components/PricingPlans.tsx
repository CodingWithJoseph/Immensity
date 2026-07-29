import Link from "next/link";
import Reveal from "@/components/Reveal";
import { plans } from "@/app/util/pricing";

export default function PricingPlans({
    className = "",
    ctaHrefOverride,
}: {
    className?: string;
    ctaHrefOverride?: string;
}) {
    return (
        <div className={`pf-pricing-grid ${className}`}>
            {plans.map((plan, index) => (
                <Reveal
                    key={plan.name}
                    delay={index * 90}
                    className={`pf-plan ${plan.dark ? "pf-plan--featured" : ""}`}
                >
                    {plan.badge && <span className="pf-plan__badge">{plan.badge}</span>}
                    <p className="pf-plan__name">{plan.name}</p>
                    <div className="pf-plan__price">
                        <span>{plan.price}</span>
                        {plan.period && <small>{plan.period}</small>}
                    </div>
                    <p className="pf-plan__description">{plan.description}</p>
                    <ul className="pf-plan__features">
                        {plan.features.map((feature) => <li key={feature}>{feature}</li>)}
                    </ul>
                    <Link href={ctaHrefOverride ?? plan.href} className="pf-button">
                        {plan.cta}
                    </Link>
                </Reveal>
            ))}
        </div>
    );
}
