import {routes} from "@/app/util/routes";

export const plans = [
    {
        name: 'Free',
        price: '$0',
        description: 'Get a feel for what\'s possible.',
        features: [
            'Search — 3 / day',
            'Signal room',
            'Problems — 10 / pipeline',
            'Tasks — 10 / pipeline',
            'Pipeline — 3 cards',
            'Custom clusters',
        ],
        cta: 'Start free',
        href: routes.auth.signUp,
        dark: false,
        badge: null,
    },
    {
        name: 'Pro',
        price: '$19',
        period: '/mo',
        description: 'Everything you need to find and launch your next product.',
        features: [
            'Everything unlimited',
            'AI-detected clusters',
            'All current tools',
            'Coming soon: Concept / Market / Validation / Build rooms',
        ],
        cta: 'Start free',
        href: routes.auth.signUp,
        dark: true,
        badge: 'Most popular',
    },
    {
        name: 'Elite',
        price: '$49',
        period: '/mo',
        description: 'Everything in Pro, plus the road ahead.',
        features: [
            'Everything in Pro',
            'Coming soon: Full automation',
            'Coming soon: MCP integrations',
            'Coming soon: Advanced AI',
        ],
        cta: 'Start free',
        href: routes.auth.signUp,
        dark: false,
        badge: 'Coming soon',
    },
]