import type {NextConfig} from "next";

const deploymentFeatureProfile = (process.env.NEXT_PUBLIC_FEATURE_PROFILE ?? '').trim().toLowerCase()
if (process.env.NODE_ENV === 'production' && !['core', 'full'].includes(deploymentFeatureProfile)) {
    throw new Error(
        'NEXT_PUBLIC_FEATURE_PROFILE must be explicitly set to "core" or "full" for production builds',
    )
}

// Dev-only LAN origins for cross-origin HMR, comma-separated in
// NEXT_DEV_ORIGINS (e.g. "192.168.0.62,192.168.0.40"). Empty by default so a
// developer's LAN IP isn't hardcoded in source.
const devOrigins = (process.env.NEXT_DEV_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)

const nextConfig: NextConfig = {
    allowedDevOrigins: devOrigins,
    images: {
        minimumCacheTTL: 0,
    },
    async headers() {
        return [
            {
                source: "/:path*",
                headers: [
                    {key: "X-Frame-Options", value: "DENY"},

                    {key: "X-Content-Type-Options", value: "nosniff"},

                    {key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains"},

                    {key: "Referrer-Policy", value: "strict-origin-when-cross-origin"},

                    {key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()"},

                    {
                        key: "Content-Security-Policy",
                        value: [
                            "default-src 'self'",
                            "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.stripe.com",
                            "style-src 'self' 'unsafe-inline'",
                            "worker-src 'self' blob:",
                            "img-src 'self' blob: data:",
                            "font-src 'self'",
                            `connect-src 'self' https://*.firebaseio.com https://*.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://api.stripe.com ${process.env.NEXT_PUBLIC_API_URL ?? ''}`,
                            "frame-ancestors 'none'",
                            "frame-src https://js.stripe.com https://hooks.stripe.com",
                        ].join("; "),
                    },
                ],
            },
        ];
    },
};

export default nextConfig;
