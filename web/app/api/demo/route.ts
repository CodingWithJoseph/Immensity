import { NextResponse } from 'next/server'
import { getDemoData } from '@/lib/demoData'

// Public, read-only demo dataset: featured clusters, top signals, top
// opportunities. Queries the backend server-side (the real data source; there
// is no Supabase in this app) with graceful fallback to a representative
// snapshot. No credentials are exposed to the client. ISR-aligned with /demo.
export const revalidate = 2400

export async function GET() {
    const data = await getDemoData()
    return NextResponse.json(data)
}
