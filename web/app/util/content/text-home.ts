import { config } from "@/lib/config";

export const home = {
    hero: {
        eyebrow: "Opportunity intelligence for builders",
        text_primary: "Become the founder who builds what people already need.",
        text_secondary: "Discover demand clusters across everyday problems and ambitious opportunities with Immensity.",
        cta_primary: "Explore Clusters",
        cta_secondary: "Try Immensity",
    },

    stats_break_section: {
        text_primary: "Live market signal, organized into builder-ready opportunities.",
        dataPoints_label: "Conversations analyzed",
        clusters_label: "Opportunity clusters detected",
        opportunities_label: "Builder-ready opportunities",
        footnote: "Every signal helps reveal where people are stuck, what patterns are forming, and which opportunities are starting to emerge.",
    },

    works: {
        eyebrow: "How it works",
        text_primary: "From raw signal to buildable opportunity.",
        text_secondary: "Immensity starts with what people are already asking for, then turns scattered posts into scored signals, clustered demand, and product direction.",
        cards: [
            {
                id: 1,
                step: "01",
                label: "Explore demand",
                description: "Search what people are already asking for across real market conversations.",
            },
            {
                id: 2,
                step: "02",
                label: "Signal processing",
                description: "Detect intent, urgency, pain, and buying signals inside each conversation.",
            },
            {
                id: 3,
                step: "03",
                label: "Opportunity clusters",
                description: "Group scattered posts into patterns that point to the same unmet need.",
            },
            {
                id: 4,
                step: "04",
                label: "Opportunity brief",
                description: "Turn each pattern into a clear opportunity with context and evidence.",
            },
            {
                id: 5,
                step: "05",
                label: "Problem breakdown",
                description: "Break the opportunity into specific pains, gaps, and unmet needs.",
            },
            {
                id: 6,
                step: "06",
                label: "Product direction",
                description: "Choose the strongest product angle before you commit to building.",
            },
        ],
    },

    who_for: {
        eyebrow: "Opportunities by type",
        text_primary: "Every kind of opportunity, classified.",
        text_secondary: `${config.company.name} classifies demand by what kind of opportunity it points to — so you know what you are looking at before you commit.`,
        cards: [
            {
                id: 1,
                label: "Software",
                description: "Pain points that could become apps, SaaS tools, platforms, marketplaces, or workflow software.",
            },
            {
                id: 2,
                label: "Physical products",
                description: "Demand for tangible products, tools, devices, and things people wish existed offline.",
            },
            {
                id: 3,
                label: "Hybrid",
                description: "Opportunities where hardware, software, data, and real-world behavior meet.",
            },
            {
                id: 4,
                label: "Services & emerging",
                description: "Services, communities, niche markets, and categories still taking shape.",
            },
        ],
    },

    features: {
        eyebrow: "Feature moments",
        text_primary: "Built to move you from signal to decision.",
        text_secondary: "Each tool does one job well — discover demand, score it, watch it move, and act on it.",
        cards: [
            {
                id: 1,
                kind: "score" as const,
                label: "Signal scoring",
                description: "Every signal and cluster gets a 0–100 score for pain, intent, and willingness to pay — so you know what is worth your time at a glance.",
            },
            {
                id: 2,
                kind: "momentum" as const,
                label: "Momentum",
                description: "Track which problems are getting louder, more urgent, and more commercially relevant over time.",
            },
            {
                id: 3,
                kind: "discovery" as const,
                label: "Discovery",
                description: "Search real conversations to find the problems people are already trying to solve.",
            },
            {
                id: 4,
                kind: "pipeline" as const,
                label: "Pipeline",
                description: "Move from first signal to validated direction, prototype, and first customer.",
            },
        ],
    },

    cta: {
        eyebrow: "Start here",
        text_primary: "Stop guessing. Start with signal.",
        text_secondary: `${config.company.name} helps you find the problems, patterns, and product opportunities worth building — before you waste time on the wrong idea.`,
        cta_primary: "Start free",
        cta_secondary: "See how it works",
    },
};
