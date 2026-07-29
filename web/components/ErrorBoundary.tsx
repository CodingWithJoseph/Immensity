"use client";

import React from "react";

interface Props {
    children: React.ReactNode;
    fallback?: (error: Error, reset: () => void) => React.ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
        console.error("[ErrorBoundary]", error, info.componentStack);
    }

    reset = () => this.setState({ hasError: false, error: null });

    render() {
        if (this.state.hasError && this.state.error) {
            if (this.props.fallback) {
                return this.props.fallback(this.state.error, this.reset);
            }
            return <DefaultErrorFallback error={this.state.error} reset={this.reset} />;
        }
        return this.props.children;
    }
}

function DefaultErrorFallback({ error, reset }: { error: Error; reset: () => void }) {
    return (
        <div className="flex min-h-50 flex-col items-center justify-center rounded-2xl border border-(--color-error) bg-(--color-error-soft) p-8 text-center">
            <p className="text-sm text-(--color-error) mb-4">Something went wrong.</p>
            <p className="text-xs text-(--color-text-muted) mb-6 font-mono">{error.message}</p>
            <button
                onClick={reset}
                className="rounded-lg bg-(--color-button) px-4 py-2 text-sm text-(--color-on-button) transition-colors hover:bg-(--color-button-hover)"
            >
                Try again
            </button>
        </div>
    );
}
