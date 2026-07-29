import { config } from "@/lib/config"

export default function CookiePage() {
    return (
        <main className="min-h-screen bg-(--color-bg)">
            <div className="max-w-3xl mx-auto px-6 py-16">

                <h1 className="text-4xl font-semibold text-center text-(--color-text) mb-3">
                    Cookie Policy
                </h1>
                <p className="text-center text-(--color-text-muted) text-sm mb-2">
                    Last updated May 14, 2026
                </p>
                <p className="text-center text-(--color-text-muted) text-sm mb-8 max-w-xl mx-auto">
                    This Cookie Policy explains how {config.company.name} uses cookies and similar technologies when you use our service.
                </p>
                <hr className="border-(--color-border) mb-10"/>

                <section className="space-y-10">

                    <div>
                        <h2 className="text-lg font-semibold text-(--color-text) mb-3">What Are Cookies</h2>
                        <p className="text-sm text-(--color-text-muted) leading-relaxed">
                            Cookies are small text files placed on your device when you visit a website. They are widely used to make websites work efficiently and to provide information to the site owner. Cookies do not contain personally identifiable information on their own, but they may be linked to personal data we hold about you.
                        </p>
                    </div>

                    <div>
                        <h2 className="text-lg font-semibold text-(--color-text) mb-3">How We Use Cookies</h2>
                        <p className="text-sm text-(--color-text-muted) leading-relaxed mb-4">
                            {config.company.name} uses cookies for the following purposes:
                        </p>
                        <ul className="space-y-2 text-sm text-(--color-text-muted) leading-relaxed list-none">
                            <li><span className="font-medium text-(--color-text)">Authentication.</span> We use a session cookie to keep you signed in securely. This cookie is strictly necessary for the Service to function and cannot be disabled.</li>
                            <li><span className="font-medium text-(--color-text)">Payments.</span> Stripe may use cookies or similar technology when you complete payment-related flows.</li>
                        </ul>
                    </div>

                    <div>
                        <h2 className="text-lg font-semibold text-(--color-text) mb-3">Types of Cookies We Use</h2>
                        <ul className="space-y-2 text-sm text-(--color-text-muted) leading-relaxed list-none">
                            <li><span className="font-medium text-(--color-text)">Strictly Necessary Cookies.</span> Required for the Service to function. These include your authentication token and cannot be disabled.</li>
                            <li><span className="font-medium text-(--color-text)">Payment Cookies.</span> Used by Stripe during payment-related flows.</li>
                        </ul>
                    </div>

                    <div>
                        <h2 className="text-lg font-semibold text-(--color-text) mb-3">Third-Party Cookies</h2>
                        <p className="text-sm text-(--color-text-muted) leading-relaxed">
                            Some cookies may be set by payment services that appear during payment-related flows. We do not control those cookies. Please refer to the relevant payment provider privacy policy for more information.
                        </p>
                    </div>

                    <div>
                        <h2 className="text-lg font-semibold text-(--color-text) mb-3">Managing Cookies</h2>
                        <p className="text-sm text-(--color-text-muted) leading-relaxed">
                            Most browsers allow you to control cookies through their settings. You can choose to block or delete cookies at any time. Please note that disabling cookies may affect the functionality of {config.company.name}, including your ability to stay signed in.
                        </p>
                    </div>

                    <div>
                        <h2 className="text-lg font-semibold text-(--color-text) mb-3">Changes to This Policy</h2>
                        <p className="text-sm text-(--color-text-muted) leading-relaxed">
                            We may update this Cookie Policy from time to time. Any changes will be posted on this page with an updated date. Your continued use of the Service after changes are posted constitutes your acceptance of the updated policy.
                        </p>
                    </div>

                    <div>
                        <h2 className="text-lg font-semibold text-(--color-text) mb-3">Contact</h2>
                        <p className="text-sm text-(--color-text-muted) leading-relaxed">
                            If you have any questions about this Cookie Policy, please contact us at{' '}
                            <a href={`mailto:${config.company.email.privacy}`} className="text-(--color-link) transition-colors hover:text-(--color-link-hover) hover:underline">
                                {config.company.email.privacy}
                            </a>.
                        </p>
                    </div>

                </section>

                <div className="mt-16 pt-8 border-t border-(--color-border)">
                    <p className="text-xs text-(--color-text-muted)">
                        The information contained in this site is subject to change without notice.
                    </p>
                    <p className="text-xs text-(--color-text-muted) mt-1">
                        Copyright © {config.legal.copyrightYear} {config.company.name}. All rights reserved.
                    </p>
                </div>

            </div>
        </main>
    );
}
