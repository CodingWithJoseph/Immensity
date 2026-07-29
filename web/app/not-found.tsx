import Link from "next/link";

export default function NotFound() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center bg-(--color-bg)">
            <p className="text-(--color-text-muted) text-sm font-mono mb-4">404</p>
            <h1 className="text-4xl font-bold text-(--color-text) mb-3">Page not found</h1>
            <p className="text-(--color-text-muted) mb-8 max-w-sm">
                This page does not exist or has been moved.
            </p>
            <Link href="/" className="rounded-xl bg-(--color-button) px-6 py-3 font-medium text-(--color-on-button) transition-colors hover:bg-(--color-button-hover)">
                Go home
            </Link>
        </div>
    )
}
