const signals = [
    "Is there a tool that automates this?",
    "I pay for three apps to fake this.",
    "Spent all weekend on a workaround.",
];

export default function HeroVisual() {
    return (
        <div className="pf-product-card" aria-label="Example opportunity cluster">
            <div className="pf-product-card__top">
                <span>Opportunity cluster</span>
                <span className="pf-product-card__status">Trending</span>
            </div>
            <h3>Invoice reconciliation for solo freelancers</h3>
            <div className="pf-product-card__score">
                <div>
                    <div className="pf-product-card__number">87</div>
                    <span className="pf-eyebrow">Opportunity score</span>
                </div>
                <div className="pf-product-card__metrics">
                    <Metric label="Pain" value="8.4" />
                    <Metric label="WTP" value="High" />
                </div>
            </div>
            <div className="pf-product-card__signals">
                {signals.map((signal) => <div key={signal} className="pf-product-card__signal">{signal}</div>)}
            </div>
        </div>
    );
}

function Metric({ label, value }: { label: string; value: string }) {
    return (
        <div className="pf-product-card__metric">
            <strong>{value}</strong>
            <span>{label}</span>
        </div>
    );
}
