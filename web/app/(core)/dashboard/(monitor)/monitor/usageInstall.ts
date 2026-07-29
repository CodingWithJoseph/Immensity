import type { PortfolioProduct, UsageSource } from './types'

export function usageScriptSnippet(origin: string, product: PortfolioProduct, source: UsageSource) {
    return `<script src="${origin}/pf-usage.js" data-product-id="${product.id}" data-key="${source.publicKey}"></script>`
}

export function usageAssistantPrompt(origin: string, product: PortfolioProduct, source: UsageSource) {
    return `Install Problem Finder usage monitoring in this app.

Use this product id: ${product.id}
Use this public key: ${source.publicKey}
Load this script once in the app shell or root layout:
${origin}/pf-usage.js

The script tag should include:
data-product-id="${product.id}"
data-key="${source.publicKey}"

After installing it, make sure page views are recorded automatically and expose a safe helper for custom events such as signup and activation.`
}

export function usageReactSnippet(origin: string, product: PortfolioProduct, source: UsageSource) {
    return `import { useEffect } from 'react'

export function UsageMonitor() {
  useEffect(() => {
    const script = document.createElement('script')
    script.src = '${origin}/pf-usage.js'
    script.dataset.productId = '${product.id}'
    script.dataset.key = '${source.publicKey}'
    script.async = true
    document.body.appendChild(script)
    return () => script.remove()
  }, [])

  return null
}`
}

export function usagePackageSnippet(product: PortfolioProduct, source: UsageSource) {
    return `import { initUsage } from '@problemfinder/usage'

initUsage({
  productId: '${product.id}',
  key: '${source.publicKey}',
})`
}

export function customEventsSnippet() {
    return `window.problemFinderUsage.record('signup')
window.problemFinderUsage.record('activation', { plan: 'pro' })`
}
