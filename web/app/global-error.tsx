"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
    useEffect(() => {
        console.error("[GlobalError]", error);
    }, [error]);

    return (
        <html>
        <body style={{ background: "#F5F5F7", color: "#1D1D1F", fontFamily: "sans-serif", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", textAlign: "center" }}>
        <h1>Critical error</h1>
        <p style={{ color: "#6E6E73" }}>Please refresh the page.</p>
        <button onClick={reset} style={{ marginTop: "1rem", padding: "0.5rem 1.5rem", background: "#1D1D1F", color: "#F5F5F7", border: "none", borderRadius: "8px", cursor: "pointer" }}>
            Try again
        </button>
        </body>
        </html>
    );
}
