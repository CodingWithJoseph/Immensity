import Link from 'next/link'
import { routes } from '@/app/util/routes'
import {config} from "@/lib/config"

export default function SiteMapPage() {
    return (
        <main className="min-h-screen bg-(--color-bg)">
            <div className="max-w-3xl mx-auto px-6 py-16">

                <h1 className="text-2xl font-semibold text-(--color-text) mb-2">
                    {config.company.name} Site Map
                </h1>
                <hr className="border-(--color-border) mb-10"/>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-10">
                    <div>
                        <h2 className="text-sm font-semibold text-(--color-text) mb-3">Product</h2>
                        <ul className="space-y-2">
                            <li>
                                <Link href={routes.landing.home} className="text-sm text-(--color-link) transition-colors hover:text-(--color-link-hover) hover:underline">
                                    Home
                                </Link>
                            </li>
                            <li>
                                <Link href={routes.landing.learn} className="text-sm text-(--color-link) transition-colors hover:text-(--color-link-hover) hover:underline">
                                    Learn
                                </Link>
                            </li>
                            <li>
                                <Link href={routes.core.dashboard} className="text-sm text-(--color-link) transition-colors hover:text-(--color-link-hover) hover:underline">
                                    Dashboard
                                </Link>
                            </li>
                        </ul>
                    </div>

                    <div>
                        <h2 className="text-sm font-semibold text-(--color-text) mb-3">Account</h2>
                        <ul className="space-y-2">
                            <li>
                                <Link href={routes.auth.signIn} className="text-sm text-(--color-link) transition-colors hover:text-(--color-link-hover) hover:underline">
                                    Sign In
                                </Link>
                            </li>
                            <li>
                                <Link href={routes.auth.signUp} className="text-sm text-(--color-link) transition-colors hover:text-(--color-link-hover) hover:underline">
                                    Sign Up
                                </Link>
                            </li>
                            <li>
                                <Link href={routes.auth.forgotPassword} className="text-sm text-(--color-link) transition-colors hover:text-(--color-link-hover) hover:underline">
                                    Forgot Password
                                </Link>
                            </li>
                        </ul>
                    </div>

                    <div>
                        <h2 className="text-sm font-semibold text-(--color-text) mb-3">Legal</h2>
                        <ul className="space-y-2">
                            <li>
                                <Link href={routes.misc.terms} className="text-sm text-(--color-link) transition-colors hover:text-(--color-link-hover) hover:underline">
                                    Terms of Use
                                </Link>
                            </li>
                            <li>
                                <Link href={routes.misc.privacy} className="text-sm text-(--color-link) transition-colors hover:text-(--color-link-hover) hover:underline">
                                    Privacy Policy
                                </Link>
                            </li>
                            <li>
                                <Link href={routes.misc.cookiePolicy} className="text-sm text-(--color-link) transition-colors hover:text-(--color-link-hover) hover:underline">
                                    Cookie Policy
                                </Link>
                            </li>
                            <li>
                                <Link href={routes.misc.contact} className="text-sm text-(--color-link) transition-colors hover:text-(--color-link-hover) hover:underline">
                                    Contact
                                </Link>
                            </li>
                        </ul>
                    </div>

                </div>

                <div className="mt-16 pt-8 border-t border-(--color-border)">
                    <p className="text-xs text-(--color-text-muted)">
                        Copyright © 2025 {config.company.name}. All rights reserved.
                    </p>
                </div>

            </div>
        </main>
    )
}
