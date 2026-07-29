'use client'
import React, { createContext, useContext, useState } from 'react'

type Theme = 'light' | 'dark'

const ThemeContext = createContext<{
    theme: Theme
    toggleTheme: () => void
}>({ theme: 'light', toggleTheme: () => {} })

export function DashboardThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setTheme] = useState<Theme>(() => {
        if (typeof window === 'undefined') return 'light'
        return (localStorage.getItem('dashboard-theme') as Theme) ?? 'light'
    })

    const toggleTheme = () => {
        setTheme(prev => {
            const next = prev === 'light' ? 'dark' : 'light'
            localStorage.setItem('dashboard-theme', next)
            return next
        })
    }

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            <div
                className={`${theme === 'dark' ? 'dark' : ''} bg-(--color-bg) min-h-screen`}
                suppressHydrationWarning>
                {children}
            </div>
        </ThemeContext.Provider>
    )
}

export const useDashboardTheme = () => useContext(ThemeContext)