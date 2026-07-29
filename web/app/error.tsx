"use client";

import { useEffect } from "react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
    useEffect(() => {
        console.error("[AppError]", error);
    }, [error]);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center bg-(--color-bg)">
            <h1 className="text-4xl font-bold text-(--color-text) mb-3">Oops</h1>
            <p className="text-(--color-text-muted) mb-8 max-w-sm">
                Something went wrong loading this page.
            </p>
            <button
                onClick={reset}
                className="rounded-xl bg-(--color-button) px-6 py-3 font-medium text-(--color-on-button) transition-colors hover:bg-(--color-button-hover)"
            >
                Try again
            </button>
        </div>
    );
}
