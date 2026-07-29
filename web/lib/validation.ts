export interface ValidationResult {
    valid: boolean
    error?: string
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateEmail(email: string): ValidationResult {
    if (!email.trim()) return { valid: false, error: "Email is required." }
    if (!EMAIL_REGEX.test(email.trim())) return { valid: false, error: "Please enter a valid email address." }
    return { valid: true }
}

export function validatePassword(password: string): ValidationResult {
    if (!password) return { valid: false, error: "Password is required." }
    if (password.length < 8) return { valid: false, error: "Password must be at least 8 characters." }
    return { valid: true }
}

export interface SignUpFields {
    displayName: string
    email: string
    password: string
    confirmPassword: string
}

export interface SignUpErrors {
    displayName?: string
    email?: string
    password?: string
    confirmPassword?: string
}

export function validateSignUpForm(fields: SignUpFields): { valid: boolean; errors: SignUpErrors } {
    const errors: SignUpErrors = {}

    if (!fields.displayName?.trim()) errors.displayName = "Name is required."

    const emailResult = validateEmail(fields.email)
    if (!emailResult.valid) errors.email = emailResult.error

    const passwordResult = validatePassword(fields.password)
    if (!passwordResult.valid) errors.password = passwordResult.error

    if (!fields.confirmPassword) {
        errors.confirmPassword = "Please confirm your password."
    } else if (fields.password !== fields.confirmPassword) {
        errors.confirmPassword = "Passwords do not match."
    }

    return { valid: Object.keys(errors).length === 0, errors }
}

export interface SignInFields {
    email: string
    password: string
}

export interface SignInErrors {
    email?: string
    password?: string
}

export function validateSignInForm(fields: SignInFields): { valid: boolean; errors: SignInErrors } {
    const errors: SignInErrors = {}

    const emailResult = validateEmail(fields.email)
    if (!emailResult.valid) errors.email = emailResult.error

    if (!fields.password) errors.password = "Password is required."

    return { valid: Object.keys(errors).length === 0, errors }
}