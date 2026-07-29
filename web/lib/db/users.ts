import { db } from '@/lib/firebase'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'

export async function createUserProfile(uid: string, email: string, displayName: string) {
    await setDoc(doc(db, 'users', uid), {
        uid,
        email,
        displayName,
        createdAt: serverTimestamp(),
        plan: 'free',
        savedCount: 0,
        searchCount: 0,
        searchResetDate: new Date().toISOString().split('T')[0],
        lastQuery: '',
        onboardingComplete: false,
        subscriptionId: null,
        stripeCustomerId: null,
    })
}
