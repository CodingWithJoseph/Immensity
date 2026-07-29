export const routes = {
    landing: {
        home: '/',
        demo: '/demo',
        philosophy: '/philosophy',
        learn: '/learn',
        pricing: '/pricing',
        aboutUs: '/about',
    },
    auth: {
        signIn: '/sign-in',
        signUp: '/sign-up',
        forgotPassword: '/forgot-password',
    },
    misc: {
        terms: '/legal/terms',
        privacy: '/legal/privacy',
        cookiePolicy: '/legal/cookie-policy',
        sitemap: '/sitemap',
        contact: '/contact',

    },
    core: {
        dashboard: '/dashboard',
        onboarding: '/onboarding',
        // Management
        pipeline: '/dashboard/manage/pipeline',
        portfolio: '/dashboard/manage/portfolio',
        monitorPortfolio: '/dashboard/monitor/portfolio',
        monitorCommandCenter: '/dashboard/monitor/command-center',
        monitorTraffic: '/dashboard/monitor/traffic',
        monitorUsage: '/dashboard/monitor/usage',
        monitorFlow: '/dashboard/monitor/flow',
        monitorSessions: '/dashboard/monitor/sessions',
        monitorExperience: '/dashboard/monitor/experience',
        monitorErrors: '/dashboard/monitor/errors',
        monitorLogs: '/dashboard/monitor/logs',
        monitorProblems: '/dashboard/monitor/problems',
        monitorInvestigate: '/dashboard/monitor/investigate',
        monitorRevenue: '/dashboard/monitor/revenue',
        monitorRevenueInsights: '/dashboard/monitor/revenue/insights',
        portfolioSetup: '/dashboard/monitor/setup',
        monitorSetup: '/dashboard/monitor/setup',
        teams: '/dashboard/manage/teams',
        issues: '/dashboard/manage/issues',
        goals: '/dashboard/manage/goals',
        calendar: '/dashboard/manage/calendar',
        // Discovery
        explore: '/dashboard/discover/search',
        signal: '/dashboard/discover/signal',
        posts: '/dashboard/discover/posts',
        problems: '/dashboard/build/breakdown',
        // Research
        concept: '/dashboard/concept',
        market: '/dashboard/market',
        competition: '/dashboard/competition',
        // Validating
        validation: '/dashboard/validation',
        // Building
        building: '/dashboard/building',
        tasks: '/dashboard/build/tasks',
        report: '/dashboard/report',
        // Other
        settings: '/dashboard/settings',
    },
    payment: {
        success: '/success',
        cancel: '/cancel',
    },
}
