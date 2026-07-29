import React from 'react'

const PRODUCT_ID = process.env.NEXT_PUBLIC_PF_PRODUCT_ID
const USAGE_KEY = process.env.NEXT_PUBLIC_PF_USAGE_KEY

/**
 * Self-monitoring: emits Immensity's own usage tracker — the very same
 * `pf-usage.js` a customer pastes into their site — so the app reports its own
 * pageviews, custom events, and uncaught errors through the identical
 * client-script → ingestion → dashboard path.
 *
 * Rendered as a classic <script> tag on purpose: the tracker reads its config
 * from `document.currentScript`, so it must be parser-inserted. A loader like
 * next/script (or createElement + appendChild) leaves currentScript null and
 * the tracker bails out silently.
 *
 * Only active in production with both env vars set, so local and preview builds
 * never emit events.
 */
export function UsageMonitor() {
    if (process.env.NODE_ENV !== 'production' || !PRODUCT_ID || !USAGE_KEY) {
        return null
    }
    return (
        <script
            src="/pf-usage.js"
            data-product-id={PRODUCT_ID}
            data-key={USAGE_KEY}
            async
        />
    )
}
