import { auth } from '@/lib/firebase'
import {
    sendEmailVerification,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut as firebaseSignOut,
    updateProfile,
    type User,
} from 'firebase/auth'
import { createUserProfile } from '@/lib/db/users'
import { clearCachedPlan } from '@/lib/usePlan'

function generatedDisplayName(email: string) {
    const local = email.trim().split('@')[0] || 'Immensity User'
    return local
        .replace(/[._-]+/g, ' ')
        .split(' ')
        .filter(Boolean)
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ') || 'Immensity User'
}

async function recordLoginActivity(user: User) {
    try {
        const token = await user.getIdToken()
        await fetch('/api/dashboard/activity', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ kind: 'login' }),
            keepalive: true,
        })
    } catch (error) {
        console.warn('Login activity could not be recorded:', error)
    }
}

export async function signUp(email: string, password: string) {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password)
    const displayName = generatedDisplayName(email)
    await updateProfile(userCredential.user, { displayName })
    await sendEmailVerification(userCredential.user)
    await createUserProfile(userCredential.user.uid, email, displayName)
    await recordLoginActivity(userCredential.user)
    return userCredential.user
}

export async function signIn(email: string, password: string) {
    const userCredential = await signInWithEmailAndPassword(auth, email, password)
    await recordLoginActivity(userCredential.user)
    return userCredential.user
}

export async function signOut() {
    await firebaseSignOut(auth)
    document.cookie = 'firebase-token=; path=/; max-age=0'
    clearCachedPlan()
}
