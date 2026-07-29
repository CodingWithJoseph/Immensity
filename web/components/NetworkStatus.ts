'use client'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'

export function NetworkStatus() {
    useOnlineStatus()
    return null
}