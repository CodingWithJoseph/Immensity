import WideContainer from "@/components/WideContainer";
import Reveal from "@/components/Reveal";
import { DualCta } from "@/components/CtaButtons";

export default function DemoCta() {
    return (
        <section className="border-t border-(--border) py-24 md:py-32">
            <WideContainer>
                <Reveal className="mx-auto flex max-w-2xl flex-col items-center text-center">
                    <h2 className="text-3xl font-extrabold leading-[1.06] tracking-[-0.03em] text-(--ink) md:text-5xl">
                        Ready to find your opportunity?
                    </h2>
                    <p className="mt-5 max-w-md text-lg leading-7 text-(--ink-muted)">
                        Start from evidence. Explore the signal, score the demand, and pick what to build.
                    </p>
                    <DualCta className="mt-9 sm:justify-center" />
                </Reveal>
            </WideContainer>
        </section>
    );
}
