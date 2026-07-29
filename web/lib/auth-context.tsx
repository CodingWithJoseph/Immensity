'use client'

import {createContext, useContext, useEffect, useState} from 'react'
import {onAuthStateChanged, User} from 'firebase/auth'
import {auth} from '@/lib/firebase'

interface AuthContextType {
    user: User | null
    authReady: boolean
}

const AuthContext = createContext<AuthContextType>({ user: null, authReady: false })

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [authReady, setAuthReady] = useState(false)

    useEffect(() => {
        return onAuthStateChanged(auth, (firebaseUser) => {
            setUser(firebaseUser)
            setAuthReady(true)
        })
    }, [])

    return (
        <AuthContext.Provider value={{ user, authReady }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => useContext(AuthContext)