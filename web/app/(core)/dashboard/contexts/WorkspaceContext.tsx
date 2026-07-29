'use client'
import React, { createContext, useContext, useState, useEffect } from 'react'
import { fetchJson } from '@/lib/fetchJson'

type WorkspaceContextType = {
    selectedPipelineId: string | null
    setSelectedPipelineId: (id: string | null) => void
    hydrated: boolean
}

const WorkspaceContext = createContext<WorkspaceContextType>({
    selectedPipelineId: null,
    setSelectedPipelineId: () => {},
    hydrated: false,
})

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
    const [selectedPipelineId, setSelectedPipelineIdState] = useState<string | null>(null)
    const [hydrated, setHydrated] = useState(false)

    useEffect(() => {
        const stored = sessionStorage.getItem('selectedPipelineId')
        if (stored) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setSelectedPipelineIdState(stored)
            setHydrated(true)
            return
        }
        // No prior selection this session — fall back to the user's default
        // project preference (Settings → Workspace) when one is set.
        let active = true
        async function applyDefault() {
            try {
                const json = await fetchJson<{ data: { defaultPipelineId: string | null } }>('/api/account/preferences')
                const def = json?.data?.defaultPipelineId
                if (active && def) {
                    setSelectedPipelineIdState(def)
                    sessionStorage.setItem('selectedPipelineId', def)
                }
            } catch {
                // No default applied — leave the workspace unselected.
            } finally {
                if (active) setHydrated(true)
            }
        }
        void applyDefault()
        return () => { active = false }
    }, [])

    function setSelectedPipelineId(id: string | null) {
        setSelectedPipelineIdState(id)
        if (id) sessionStorage.setItem('selectedPipelineId', id)
        else sessionStorage.removeItem('selectedPipelineId')
    }

    return (
        <WorkspaceContext.Provider value={{ selectedPipelineId, setSelectedPipelineId, hydrated }}>
            {children}
        </WorkspaceContext.Provider>
    )
}

export const useWorkspace = () => useContext(WorkspaceContext)