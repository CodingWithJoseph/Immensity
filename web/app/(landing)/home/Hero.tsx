import Reveal from "@/components/Reveal";
import HeroVisual from "@/app/(landing)/home/HeroVisual";
import HeroSearch from "@/app/(landing)/home/HeroSearch";
import { home } from "@/app/util/content/text-home";

export default function Hero() {
    return (
        <section className="pf-hero">
            <div className="pf-shell">
                <div className="pf-hero__intro">
                    <Reveal><p className="pf-eyebrow">Creativity starts with a real problem</p></Reveal>
                    <Reveal delay={60}>
                        <h1 className="pf-hero__title">{home.hero.text_primary}</h1>
                    </Reveal>
                    <Reveal delay={120}>
                        <p className="pf-hero__lede">{home.hero.text_secondary}</p>
                    </Reveal>
                </div>

                <div className="pf-hero__grid">
                    <Reveal className="pf-hero__coral">
                        <div className="pf-hero__coral-copy">
                            <p className="pf-eyebrow">Opportunity search</p>
                            <h2>Find demand before you build.</h2>
                            <p>Search real market conversations, see repeated pain, and turn scattered complaints into product direction.</p>
                            <HeroSearch />
                        </div>
                    </Reveal>
                    <Reveal delay={90} className="pf-hero__product">
                        <HeroVisual />
                    </Reveal>
                </div>
            </div>
        </section>
    );
}
