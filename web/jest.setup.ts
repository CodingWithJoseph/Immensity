import '@testing-library/jest-dom'

// jsdom's global doesn't expose structuredClone, which dagre (flow-graph layout)
// relies on. Polyfill it so graph-layout tests run under jest-environment-jsdom.
if (typeof globalThis.structuredClone === 'undefined') {
    globalThis.structuredClone = (value: unknown) => JSON.parse(JSON.stringify(value))
}

// jsdom does not implement matchMedia, which responsive hooks (useIsDesktop)
// call. Default to a non-matching query so components render their mobile
// layout in tests; suites needing the desktop layout override window.matchMedia.
if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
    window.matchMedia = (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
    }) as unknown as MediaQueryList
}

// Firebase reads these at import time (lib/firebase.ts calls getAuth/getFirestore
// on module load). Without a non-empty apiKey the client SDK throws
// `auth/invalid-api-key`, which crashes any test suite that transitively imports
// a component using Firebase. Dummy values keep init offline-safe in jsdom.
process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||= 'test-api-key'
process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ||= 'test.firebaseapp.com'
process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||= 'test-project'
process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||= 'test-project.appspot.com'
process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ||= '1234567890'
process.env.NEXT_PUBLIC_FIREBASE_APP_ID ||= '1:1234567890:web:testappid'
