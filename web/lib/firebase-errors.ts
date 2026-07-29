const AUTH_ERROR_MAP: Record<string, string> = {
    "auth/invalid-credential": "Incorrect email or password.",
    "auth/wrong-password": "Incorrect email or password.",
    "auth/user-not-found": "Incorrect email or password.",
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/user-disabled": "This account has been disabled. Contact support.",
    "auth/too-many-requests": "Too many failed attempts. Please wait a few minutes and try again.",
    "auth/operation-not-allowed": "This sign-in method is not enabled.",
    "auth/email-already-in-use": "An account with this email already exists. Try signing in.",
    "auth/weak-password": "Password must be at least 6 characters.",
    "auth/expired-action-code": "This reset link has expired. Please request a new one.",
    "auth/invalid-action-code": "This reset link is invalid or has already been used.",
    "auth/network-request-failed": "Network error. Check your connection and try again.",
    "auth/internal-error": "Something went wrong on our end. Please try again.",
    "auth/requires-recent-login": "For security, please sign out and sign back in before making this change.",
    "auth/popup-closed-by-user": "Sign-in was cancelled.",
    "auth/cancelled-popup-request": "Sign-in was cancelled.",
    "auth/timeout": "The request timed out. Please try again.",
}

const FIRESTORE_ERROR_MAP: Record<string, string> = {
    "permission-denied": "You don't have permission to do that.",
    "unavailable": "Service temporarily unavailable. Please try again.",
    "not-found": "The requested data could not be found.",
    "already-exists": "This record already exists.",
    "resource-exhausted": "Too many requests. Please slow down.",
    "unauthenticated": "You must be signed in to do that.",
    "deadline-exceeded": "Request timed out. Please try again.",
    "internal": "An internal error occurred. Please try again.",
    "cancelled": "The operation was cancelled.",
}

export function getFirebaseErrorMessage(error: unknown): string {
    if (!error || typeof error !== "object") {
        return "An unexpected error occurred. Please try again."
    }

    const err = error as { code?: string; message?: string }
    const code = err.code ?? ""

    if (code.startsWith("auth/")) {
        return AUTH_ERROR_MAP[code] ?? "Authentication failed. Please try again."
    }

    if (FIRESTORE_ERROR_MAP[code]) {
        return FIRESTORE_ERROR_MAP[code]
    }

    if (
        err.message?.toLowerCase().includes("network") ||
        err.message?.toLowerCase().includes("failed to fetch") ||
        err.message?.toLowerCase().includes("net::err")
    ) {
        return "Network error. Check your connection and try again."
    }

    return "Something went wrong. Please try again."
}