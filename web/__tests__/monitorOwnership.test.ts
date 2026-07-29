import fs from 'node:fs'
import path from 'node:path'
import { MONITOR_NAV, type MonitorView } from '@/lib/monitoring/lenses'
import { monitorWarRoomPlan } from '@/lib/monitoring/warRoom'

const root = process.cwd()

function read(file: string) {
    return fs.readFileSync(path.join(root, file), 'utf8')
}

function pageFiles(dir: string): string[] {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    return entries.flatMap(entry => {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) return pageFiles(full)
        return entry.name === 'page.tsx' ? [path.relative(root, full)] : []
    })
}

describe('Monitor ownership split', () => {
    it('keeps Monitor routes on Monitor-owned dashboard modules', () => {
        const monitorDir = path.join(root, 'app', '(core)', 'dashboard', '(monitor)', 'monitor')
        const pages = pageFiles(monitorDir)

        for (const file of pages) {
            const contents = read(file)
            expect(contents).not.toContain('@/app/(core)/dashboard/(manage)/portfolio/PortfolioDashboard')
            expect(contents).not.toContain('@/app/(core)/dashboard/(manage)/portfolio/PortfolioSetupDashboard')
        }
    })

    it('keeps Monitor panels out of the Portfolio component folder', () => {
        const portfolioComponents = fs.readdirSync(path.join(root, 'app', '(core)', 'dashboard', '(manage)', 'portfolio', 'components'))
        expect(portfolioComponents).toEqual(['PortfolioGrid.tsx'])
    })

    it('keeps Monitor dashboards free of Portfolio-only view wiring', () => {
        const dashboard = read('app/(core)/dashboard/(monitor)/monitor/MonitorDashboard.tsx')
        const setup = read('app/(core)/dashboard/(monitor)/monitor/MonitorSetupDashboard.tsx')

        expect(dashboard).not.toContain("view !== 'portfolio'")
        expect(dashboard).not.toContain('PortfolioOverview')
        expect(dashboard).not.toContain('CorrelationPanel')
        expect(dashboard).not.toContain('LaunchedProductsSelector')
        expect(setup).not.toContain('portfolioSetup')
    })

    it('gives every Monitor nav view a war-room investigation plan', () => {
        for (const item of MONITOR_NAV.filter(item => item.key !== 'setup')) {
            const plan = monitorWarRoomPlan(item.key as MonitorView, 'pipe-1')
            expect(plan.verdict).toBeTruthy()
            expect(plan.evidence).toBeTruthy()
            expect(plan.nextAction).toBeTruthy()
            expect(plan.links.length).toBeGreaterThan(0)
        }
    })
})
