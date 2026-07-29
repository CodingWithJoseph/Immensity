import { MetadataRoute } from 'next'
import { config } from '@/lib/config'

const base = config.site.url

export default function sitemap(): MetadataRoute.Sitemap {
    const lastModified = new Date()
    return [
        { url: base, lastModified, changeFrequency: 'weekly', priority: 1 },
        { url: `${base}/demo`, lastModified, changeFrequency: 'daily', priority: 0.9 },
        { url: `${base}/pricing`, lastModified, changeFrequency: 'monthly', priority: 0.8 },
        { url: `${base}/learn`, lastModified, changeFrequency: 'monthly', priority: 0.8 },
        { url: `${base}/about`, lastModified, changeFrequency: 'monthly', priority: 0.6 },
        { url: `${base}/philosophy`, lastModified, changeFrequency: 'monthly', priority: 0.6 },
        { url: `${base}/sign-in`, lastModified, changeFrequency: 'yearly', priority: 0.5 },
        { url: `${base}/sign-up`, lastModified, changeFrequency: 'yearly', priority: 0.5 },
        { url: `${base}/legal/terms`, lastModified, changeFrequency: 'yearly', priority: 0.3 },
        { url: `${base}/legal/privacy`, lastModified, changeFrequency: 'yearly', priority: 0.3 },
        { url: `${base}/legal/cookie-policy`, lastModified, changeFrequency: 'yearly', priority: 0.3 },
    ]
}
