# Production domain routing

The root `proxy.ts` separates the production marketing and application hosts:

- `useimmensity.com` and `www.useimmensity.com` serve public/marketing pages.
- `console.useimmensity.com` serves auth and application pages.
- Localhost and other development/preview hosts retain the existing routing behavior.

Cross-domain redirects preserve the requested pathname and query string. Requests for
Next.js internals, static files, favicon, and all web-app API
routes stay on their incoming host.

## Railway environment variables

Set these variables on the ProblemFinderWeb service:

```text
NEXT_PUBLIC_SITE_URL=https://useimmensity.com
NEXT_PUBLIC_APP_URL=https://console.useimmensity.com
```

The project uses Firebase Authentication and does not currently use `NEXTAUTH_URL` or
`AUTH_URL`.

Keep the existing Firebase variables, including `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, and
add `console.useimmensity.com` to the Firebase project's authorized domains.

## Local development

No `.env.local` file is committed. The console and auth pages live in the same
Next app, so local development should stay on the current origin and use paths
such as `/sign-in` and `/sign-up`. You can keep local origins in `.env.local`
for other code that reads them:

```text
NEXT_PUBLIC_SITE_URL=http://localhost:3001
NEXT_PUBLIC_MARKETING_URL=http://localhost:3001
NEXT_PUBLIC_APP_URL=http://localhost:3001
```

Do not point local `NEXT_PUBLIC_APP_URL` at the production console host. Public
Sign In and Sign Up links intentionally ignore `NEXT_PUBLIC_APP_URL` in
development and stay on the current app with `/sign-in` and `/sign-up`, so a
stale local port cannot send `localhost:3001` to `localhost:3000` or production.

Firebase Authentication must also allow local callbacks/sign-ins. Keep
`localhost` in the Firebase project's authorized domains for local development.

## Backend CORS

Most authenticated application requests use same-origin ProblemFinderWeb `/api/*` proxy
routes, which make server-to-server requests to `NEXT_PUBLIC_API_URL`. Browser-side code
also makes some direct backend requests. If ProblemFinderBackend restricts CORS origins,
it should allow `https://console.useimmensity.com`. That backend configuration is outside
the scope of this repository change.
