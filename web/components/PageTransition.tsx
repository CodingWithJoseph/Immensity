'use client'
import { motion, AnimatePresence } from 'framer-motion'
import { usePathname } from 'next/navigation'
import React from "react";

export default function PageTransition({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()

    if (pathname.startsWith('/dashboard')) {
        return <>{children}</>
    }

    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={pathname}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}>
                {children}
            </motion.div>
        </AnimatePresence>
    )
}
