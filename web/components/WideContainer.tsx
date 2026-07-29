import { ReactNode } from 'react'

export default function WideContainer({ children, className = '' }: { children: ReactNode; className?: string }) {
    return (
        <div className={`w-full max-w-300 mx-auto px-6 ${className}`}>
            {children}
        </div>
    )
}