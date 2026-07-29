import { ReactNode } from 'react'

export default function Container({ children, className = '' }: { children: ReactNode; className?: string }) {
    return (
        <div className={`w-full max-w-245 mx-auto px-6 ${className}`}>
            {children}
        </div>
    )
}