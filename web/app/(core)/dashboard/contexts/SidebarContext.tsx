'use client'
import React, { createContext, useContext, useEffect, useState } from 'react'

type SidebarContextType = {
    collapsed: boolean
    mobileOpen: boolean
    toggleCollapsed: () => void
    setCollapsed: (val: boolean) => void
    openMobile: () => void
    closeMobile: () => void
}

const SidebarContext = createContext<SidebarContextType>({
    collapsed: false,
    mobileOpen: false,
    toggleCollapsed: () => {},
    setCollapsed: () => {},
    openMobile: () => {},
    closeMobile: () => {},
})

export function SidebarProvider({ children }: { children: React.ReactNode }) {
    const [collapsed, setCollapsed] = useState(false)
    const [mobileOpen, setMobileOpen] = useState(false)

    useEffect(() => {
        const stored = localStorage.getItem('sidebar-collapsed')
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (stored !== null) setCollapsed(stored === 'true')
    }, [])

    const toggleCollapsed = () => {
        setCollapsed(prev => {
            localStorage.setItem('sidebar-collapsed', String(!prev))
            return !prev
        })
    }

    const setCollapsedValue = (val: boolean) => {
        localStorage.setItem('sidebar-collapsed', String(val))
        setCollapsed(val)
    }

    return (
        <SidebarContext.Provider value={{
        collapsed,
            mobileOpen,
            toggleCollapsed,
            setCollapsed: setCollapsedValue,
            openMobile: () => setMobileOpen(true),
            closeMobile: () => setMobileOpen(false),
    }}>
    {children}
    </SidebarContext.Provider>
)
}

export const useSidebar = () => useContext(SidebarContext)