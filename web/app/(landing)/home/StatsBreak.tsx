'use client'

import { useEffect, useRef, useState } from "react";
import type { HomepageStats } from "@/lib/types/homepageStats";
import { home } from "@/app/util/content/text-home";

type Props = { stats?: HomepageStats };

function compactNumber(value: number, approximate: boolean) {
    const formatted = new Intl.NumberFormat("en-US", {
        notation: "compact",
        maximumFractionDigits: value >= 10_000 ? 0 : 1,
    }).format(value).toUpperCase();
    return `${formatted}${approximate ? "+" : ""}`;
}

function useInView<T extends HTMLElement>() {
    const ref = useRef<T | null>(null);
    const [inView, setInView] = useState(false);
    useEffect(() => {
        if (!ref.current) return;
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                setInView(true);
                observer.disconnect();
            }
        }, { threshold: 0.25 });
        observer.observe(ref.current);
        return () => observer.disconnect();
    }, []);
    return { ref, inView };
}

function AnimatedNumber({ value, approximate, start }: { value: number; approximate: boolean; start: boolean }) {
    const [current, setCurrent] = useState(0);
    useEffect(() => {
        if (!start) return;
        const duration = 1200;
        const started = performance.now();
        let frame = 0;
        const animate = (now: number) => {
            const progress = Math.min((now - started) / duration, 1);
            setCurrent(Math.round(value * (1 - Math.pow(1 - progress, 3))));
            if (progress < 1) frame = requestAnimationFrame(animate);
        };
        frame = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(frame);
    }, [start, value]);
    return <>{compactNumber(current, approximate)}</>;
}

export default function StatsBreakSection({ stats: initialStats }: Props) {
    const { ref, inView } = useInView<HTMLElement>();
    const [stats, setStats] = useState<HomepageStats | undefined>(initialStats);

    useEffect(() => {
        let active = true;
        fetch("/api/stats")
            .then((response) => response.ok ? response.json() : null)
            .then((data) => {
                if (!active || !data) return;
                setStats((previous) => previous ? { ...previous, ...data } : previous);
            })
            .catch(() => {});
        return () => { active = false; };
    }, []);

    if (!stats) return null;
    const approximate = !stats.live;
    const dataPoints = stats.dataPointsAnalyzed ?? stats.conversationsAnalyzed;
    const items = [
        { value: dataPoints, label: home.stats_break_section.dataPoints_label, tone: "dark" },
        { value: stats.clustersDetected, label: home.stats_break_section.clusters_label, tone: "coral" },
    ];

    return (
        <section ref={ref} className="pf-section pf-section--tight">
            <div className="pf-shell pf-stats-grid">
                {items.map((item, index) => (
                    <div key={item.label} className={`pf-stat-card pf-stat-card--${item.tone}`}>
                        <div>
                            {index === 0 && <div className="pf-live">{stats.live ? "Live signal" : "Signal to date"}</div>}
                            <div className="pf-stat-card__number">
                                <AnimatedNumber value={item.value} approximate={approximate} start={inView} />
                            </div>
                            <div className="pf-stat-card__label">{item.label}</div>
                        </div>
                        {index === 1 && <p className="pf-stat-card__note">{home.stats_break_section.footnote}</p>}
                    </div>
                ))}
            </div>
        </section>
    );
}
