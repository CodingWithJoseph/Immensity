type LearnCard = {
    eyebrow?: string;
    title: string;
    description: string;
    img?: string;
};
type LearnSection = {
    id: string;
    label: string;
    muted: string;
    dark: boolean;
    cols: 2 | 3;
    topBorder: boolean;
    cards: LearnCard[];
};
type LearnText = {
    hero: {
        eyebrow: string;
        text_primary: string;
        text_cta: string;
    };
    anchors: {
        label: string;
        href: string;
    }[];
    sections: {
        discover: LearnSection;
        research: LearnSection;
        validate: LearnSection;
        build: LearnSection;
        pipeline: LearnSection;
        opportunity: LearnSection;
        faq: LearnSection;
    };
};
export const learn: LearnText = {
    hero: {
        eyebrow: "How Immensity works",
        text_primary: "Everything you need to know.",
        text_cta: "Start free",
    },

    anchors: [
        {
            label: "Discover",
            href: "#discover",
        },
        {
            label: "Research",
            href: "#research",
        },
        {
            label: "Validate",
            href: "#validate",
        },
        {
            label: "Build",
            href: "#build",
        },
        {
            label: "Pipeline",
            href: "#pipeline",
        },
        {
            label: "Opportunity",
            href: "#opportunity",
        },
        {
            label: "FAQ",
            href: "#faq",
        },
    ],

    sections: {
        discover: {
            id: "discover",
            label: "Discover.",
            muted: "Find what to build next.",
            dark: false,
            cols: 3,
            topBorder: false,
            cards: [
                {
                    eyebrow: "Signal Feed",
                    title: "Every problem worth solving, surfaced daily.",
                    description:
                        "Fresh opportunities arrive scored and ranked. You skim what matters instead of digging through noise.",
                    img: "/img/placeholder.svg",
                },
                {
                    eyebrow: "Search",
                    title: "Find demand in any space you care about.",
                    description:
                        "Type a topic, an industry, or a frustration and instantly pull up the real problems people have around it.",
                    img: "/img/placeholder.svg",
                },
                {
                    eyebrow: "Signals",
                    title: "One voice is an anecdote.",
                    description:
                        "A signal is a single moment where someone reveals a real problem — a complaint, a question, an “I’d pay for this.” It is the starting unit of everything here.",
                    img: "/img/placeholder.svg",
                },
                {
                    eyebrow: "Clusters",
                    title: "A crowd is a market.",
                    description:
                        "When many people describe the same underlying problem, Immensity groups those signals into a cluster — not one person venting, but a crowd pointing at the same gap.",
                    img: "/img/placeholder.svg",
                },
                {
                    eyebrow: "Signal Score",
                    title: "One number for “is this worth my time?”",
                    description:
                        "Every signal and cluster gets a 0–100 score. Green is strong, amber is worth a look, red is weak. Higher simply means more worth your attention.",
                    img: "/img/placeholder.svg",
                },
                {
                    eyebrow: "Similarity",
                    title: "Same problem, different words.",
                    description:
                        "Immensity understands meaning, not just keywords — so “this is maddening” and “why is there no tool for this?” land together when they are about the same thing.",
                    img: "/img/placeholder.svg",
                },
            ],
        },

        research: {
            id: "research",
            label: "Research.",
            muted: "Understand the problem before you build.",
            dark: true,
            cols: 3,
            topBorder: true,
            cards: [
                {
                    eyebrow: "Pain level",
                    title: "How much does this actually hurt?",
                    description:
                        "A mild annoyance and a daily headache are very different opportunities. High pain means people are motivated to change.",
                    img: "/img/placeholder.svg",
                },
                {
                    eyebrow: "Urgency",
                    title: "Do they need it now, or someday?",
                    description:
                        "Urgency is what turns a nice idea into “take my money today.”",
                    img: "/img/placeholder.svg",
                },
                {
                    eyebrow: "Willingness to pay",
                    title: "Will anyone open their wallet?",
                    description:
                        "Immensity reads the signs that people would pay — asking for paid tools, resenting the cost of alternatives, saying so outright. It separates a business from a free side project.",
                    img: "/img/placeholder.svg",
                },
                {
                    eyebrow: "Workarounds",
                    title: "The strongest buying signal there is.",
                    description:
                        "When people duct-tape their own fix — a messy spreadsheet, three apps stitched together — they are already doing the work by hand, waiting for a better way.",
                    img: "/img/placeholder.svg",
                },
                {
                    eyebrow: "Momentum",
                    title: "Is demand rising or fading?",
                    description:
                        "Immensity tracks how fast a cluster is growing. Trending means demand is accelerating now. Rising means you are early; fading means the window may be closing.",
                    img: "/img/placeholder.svg",
                },
                {
                    eyebrow: "Your angle",
                    title: "There is always more than one way in.",
                    description:
                        "Capture the different ways you could attack the problem, so you pick the sharpest one instead of the most obvious one.",
                    img: "/img/placeholder.svg",
                },
            ],
        },

        validate: {
            id: "validate",
            label: "Validate.",
            muted: "Decide what would prove you right — or wrong.",
            dark: false,
            cols: 3,
            topBorder: true,
            cards: [
                {
                    eyebrow: "Problems",
                    title: "Turn a fuzzy cluster into something solvable.",
                    description:
                        "“People hate X” is a cluster. “Freelancers waste an hour a week reconciling invoices by hand” is a problem. Naming the real problems is how you test whether an idea is real.",
                    img: "/img/placeholder.svg",
                },
                {
                    eyebrow: "Current alternatives",
                    title: "Know what you are really up against.",
                    description:
                        "What people use today — a competitor, a workaround, or nothing at all — is your true competition, and the bar you have to clear.",
                    img: "/img/placeholder.svg",
                },
                {
                    eyebrow: "Kill criteria",
                    title: "Decide now what would make you walk away.",
                    description:
                        "Counterintuitive but freeing. Writing down what would kill the idea before you are attached is how good builders avoid pouring a year into a dead end.",
                    img: "/img/placeholder.svg",
                },
                {
                    eyebrow: "Recommended next step",
                    title: "Never stare at a blank board.",
                    description:
                        "Immensity reads your problem, its signals, and its momentum, then suggests the single most valuable thing to do next.",
                    img: "/img/placeholder.svg",
                },
            ],
        },

        build: {
            id: "build",
            label: "Build.",
            muted: "Go from validated idea to shipped product.",
            dark: true,
            cols: 3,
            topBorder: true,
            cards: [
                {
                    eyebrow: "Tasks",
                    title: "Conviction becomes a checklist.",
                    description:
                        "A task is one concrete, finishable step toward shipping. Tasks hang off the problems they solve, so you never lose sight of why you are building something.",
                    img: "/img/placeholder.svg",
                },
                {
                    eyebrow: "Distribution",
                    title: "Answer “how will anyone hear about this?” early.",
                    description:
                        "Capture the channels you will use to reach people before launch, not after.",
                    img: "/img/placeholder.svg",
                },
                {
                    eyebrow: "Launch",
                    title: "Ship the smallest thing that proves demand.",
                    description:
                        "Do not build the whole product. Build the smallest test of whether people actually want it, then let the evidence decide.",
                    img: "/img/placeholder.svg",
                },
                {
                    eyebrow: "Portfolio",
                    title: "Build a track record.",
                    description:
                        "Launched ideas graduate to your Portfolio, where you record the outcome and track revenue over time — so you learn which signals turn into real businesses.",
                    img: "/img/placeholder.svg",
                },
            ],
        },

        pipeline: {
            id: "pipeline",
            label: "The pipeline.",
            muted: "Signal → problem → task.",
            dark: false,
            cols: 3,
            topBorder: true,
            cards: [
                {
                    eyebrow: "Step 01",
                    title: "Start with a signal.",
                    description:
                        "Someone described a problem. Immensity caught it, scored it, and surfaced it to you.",
                },
                {
                    eyebrow: "Step 02",
                    title: "Zoom out to the cluster.",
                    description:
                        "One signal is an anecdote. A cluster of them is a market. You decide based on the crowd, not the individual.",
                },
                {
                    eyebrow: "Step 03",
                    title: "Open a pipeline.",
                    description:
                        "A pipeline is your workspace for one idea. It moves through five stages — Watching, Discovery, Research, Validate, Build — and holds the signals, problems, tasks, and notes for that idea in one place.",
                },
                {
                    eyebrow: "Step 04",
                    title: "Break it into problems.",
                    description:
                        "Sharpen the fuzzy cluster into a few specific, solvable problems.",
                },
                {
                    eyebrow: "Step 05",
                    title: "Break problems into tasks.",
                    description:
                        "Each problem becomes a short list of concrete things to do. Now you have a plan, not just a feeling.",
                },
                {
                    eyebrow: "Step 06",
                    title: "Launch, then track.",
                    description:
                        "Ship it, send it to your Portfolio, and record how it does. Every cycle teaches you which signals turn into real products.",
                },
            ],
        },

        opportunity: {
            id: "opportunity",
            label: "What to do with an opportunity.",
            muted: "You found a strong one. Now what?",
            dark: false,
            cols: 3,
            topBorder: true,
            cards: [
                {
                    eyebrow: "01",
                    title: "Read it raw.",
                    description:
                        "Open the cluster and read the real signals in people’s own words. Scores point you to the right place; the quotes tell you the truth.",
                },
                {
                    eyebrow: "02",
                    title: "Run the painkiller test.",
                    description:
                        "High pain, high urgency, real willingness to pay, people already building workarounds? That is a painkiller, not a vitamin — and people pay for painkillers.",
                },
                {
                    eyebrow: "03",
                    title: "Check the direction.",
                    description:
                        "Rising momentum means you are early. Fading momentum means the window may be closing.",
                },
                {
                    eyebrow: "04",
                    title: "Name three problems.",
                    description:
                        "Break the cluster into specific, solvable problems. The exercise alone tells you how real it is.",
                },
                {
                    eyebrow: "05",
                    title: "Pick your angle.",
                    description:
                        "Write down a few ways in, then choose the sharpest — ideally one others would overlook.",
                },
                {
                    eyebrow: "06",
                    title: "Write your kill criteria.",
                    description:
                        "Decide now what would make you walk away. Future you will be grateful.",
                },
                {
                    eyebrow: "07",
                    title: "Talk to five real people.",
                    description:
                        "The audience is right there in the signals. Go ask them. Nothing validates faster than a real conversation.",
                },
                {
                    eyebrow: "08",
                    title: "Build the smallest test.",
                    description:
                        "Not the product — the smallest thing that proves people want it. Immensity shows you where demand is; you decide what to build.",
                },
            ],
        },

        faq: {
            id: "faq",
            label: "FAQ.",
            muted: "Before and after you sign up.",
            dark: false,
            cols: 2,
            topBorder: true,
            cards: [
                {
                    title: "What is Immensity?",
                    description:
                        "Immensity is a product from Immensity that finds real, unmet problems people already describe online, scores how promising each one is, and walks you from that first signal to a shipped product.",
                },
                {
                    title: "Where do these opportunities come from?",
                    description:
                        "From what people reveal in public every day — complaints, questions, workarounds, and “I’d pay for this” moments. Immensity gathers them, understands what they mean, and groups the ones pointing at the same problem.",
                },
                {
                    title: "Do I need to be technical?",
                    description:
                        "No. Every number answers one human question: is this worth my time? Immensity is built for builders of every kind.",
                },
                {
                    title: "Does Immensity tell me what to build?",
                    description:
                        "No — and that is deliberate. It shows you where real demand is. The angle, the product, and the execution are yours.",
                },
                {
                    title: "Will ideas get saturated if everyone sees them?",
                    description:
                        "Signals are a starting point, not a finish line. Ten people can see the same problem and build ten different products. Your angle and execution are the moat.",
                },
                {
                    title: "How is this different from forums or Google Trends?",
                    description:
                        "Trends tell you a keyword is popular. Immensity reads the actual problems behind the noise, scores them on pain and willingness to pay, and tells you whether demand is rising.",
                },
                {
                    title: "Is the free plan really free?",
                    description:
                        "Yes. Free includes daily searches, the full Signal experience, custom clusters, and room to take a real idea from discovery to a first build. No card required to start.",
                },
                {
                    title: "What is a good Signal Score?",
                    description:
                        "Think traffic light: 70+ is strong, 40–69 is worth a look, under 40 is weak. But never stop at the number — pair it with rising momentum and clear willingness to pay.",
                },
                {
                    title: "Signal, cluster, problem — what is the difference?",
                    description:
                        "A signal is one person describing one problem. A cluster is many signals about the same problem, which is a market. A problem is the specific, solvable statement you write when you decide to act.",
                },
                {
                    title: "What does trending mean — should I chase it?",
                    description:
                        "Trending means demand is accelerating now. It is a tailwind, not the whole story — a steady, painful, high willingness-to-pay problem can beat a fast-moving fad.",
                },
                {
                    title: "What happens when I launch?",
                    description:
                        "Your pipeline graduates to your Portfolio, where you record the outcome and track revenue over time.",
                },
                {
                    title: "What does upgrading unlock?",
                    description:
                        "Pro removes the limits — unlimited searches, pipelines, problems, and tasks — and turns on automatic cluster detection. Higher tiers add automation and advanced AI as they roll out.",
                },
            ],
        },
    },
};