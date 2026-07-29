import Reveal from "@/components/Reveal";

export default function SectionHeading({
    eyebrow,
    title,
    subhead,
    className = "",
}: {
    eyebrow?: string;
    title: string;
    subhead?: string;
    align?: "center" | "left";
    className?: string;
}) {
    return (
        <div className={`pf-section-heading ${className}`}>
            <div>
                {eyebrow && <Reveal><p className="pf-eyebrow">{eyebrow}</p></Reveal>}
                <Reveal delay={60}><h2>{title}</h2></Reveal>
            </div>
            {subhead && <Reveal delay={100}><p className="pf-section-heading__copy">{subhead}</p></Reveal>}
        </div>
    );
}
