/** @jest-environment node */

import { proxyJson } from '@/lib/apiProxy'

const originalApiUrl = process.env.API_URL
const originalPublicApiUrl = process.env.NEXT_PUBLIC_API_URL

describe('proxyJson', () => {
    beforeEach(() => {
        delete process.env.API_URL
        delete process.env.NEXT_PUBLIC_API_URL
        jest.restoreAllMocks()
    })

    afterAll(() => {
        if (originalApiUrl === undefined) delete process.env.API_URL
        else process.env.API_URL = originalApiUrl

        if (originalPublicApiUrl === undefined) delete process.env.NEXT_PUBLIC_API_URL
        else process.env.NEXT_PUBLIC_API_URL = originalPublicApiUrl
    })

    it('returns a clear 503 when the backend URL is not configured', async () => {
        jest.spyOn(console, 'error').mockImplementation(() => undefined)

        const response = await proxyJson('/pipeline')

        expect(response.status).toBe(503)
        await expect(response.json()).resolves.toEqual({
            error: 'Backend API is not configured',
            code: 'BACKEND_NOT_CONFIGURED',
        })
    })

    it('returns a clear 503 when the backend cannot be reached', async () => {
        process.env.API_URL = 'http://backend.test'
        jest.spyOn(console, 'error').mockImplementation(() => undefined)
        jest.spyOn(global, 'fetch').mockRejectedValue(new TypeError('connection refused'))

        const response = await proxyJson('/dashboard/activity?weeks=26')

        expect(response.status).toBe(503)
        await expect(response.json()).resolves.toEqual({
            error: 'Backend API is unavailable',
            code: 'BACKEND_UNAVAILABLE',
        })
    })

    it('returns a clear 503 when the backend URL is invalid', async () => {
        process.env.API_URL = 'not a url'
        jest.spyOn(console, 'error').mockImplementation(() => undefined)

        const response = await proxyJson('/pipeline')

        expect(response.status).toBe(503)
        await expect(response.json()).resolves.toEqual({
            error: 'Backend API configuration is invalid',
            code: 'BACKEND_CONFIG_INVALID',
        })
    })

    it('forwards backend JSON and status codes', async () => {
        process.env.API_URL = 'http://backend.test/api'
        const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(
            new Response(JSON.stringify({ detail: 'upstream failure' }), {
                status: 422,
                headers: { 'Content-Type': 'application/json' },
            }),
        )

        const response = await proxyJson('/pipeline', {
            headers: { Authorization: 'Bearer token' },
        })

        expect(fetchMock).toHaveBeenCalledWith(
            new URL('http://backend.test/api/pipeline'),
            { headers: { Authorization: 'Bearer token' } },
        )
        expect(response.status).toBe(422)
        await expect(response.json()).resolves.toEqual({ detail: 'upstream failure' })
    })
})
