'use client'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'

export function useOnlineStatus() {
    const [isOnline, setIsOnline] = useState(
        typeof navigator !== 'undefined' ? navigator.onLine : true
    )

    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true)
            toast.success('Back online', { id: 'network-status' })
        }

        const handleOffline = () => {
            setIsOnline(false)
            toast.error('No internet connection', {
                id: 'network-status',
                duration: Infinity, // stays until they're back online
            })
        }

        window.addEventListener('online', handleOnline)
        window.addEventListener('offline', handleOffline)

        return () => {
            window.removeEventListener('online', handleOnline)
            window.removeEventListener('offline', handleOffline)
        }
    }, [])

    return isOnline
}