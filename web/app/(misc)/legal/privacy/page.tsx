import { config } from "@/lib/config"

export default function PrivacyPage() {
    return (
        <main className="min-h-screen bg-(--color-bg)">
            <div className="max-w-3xl mx-auto px-6 py-16">

                <h1 className="text-4xl font-semibold text-center text-(--color-text) mb-3">
                    {config.company.name} Privacy Policy
                </h1>
                <p className="text-center text-(--color-text-muted) text-sm mb-2">
                    Last updated May 14, 2026
                </p>
                <p className="text-center text-(--color-text-muted) text-sm mb-8 max-w-xl mx-auto">
                    {config.company.name}&apos;s Privacy Policy describes how we collect, use, and protect your personal data when you use our service.
                </p>
                <hr className="border-(--color-border) mb-10"/>

                <section className="space-y-10">

                    <div>
                        <h2 className="text-lg font-semibold text-(--color-text) mb-3">What Personal Data We Collect</h2>
                        <p className="text-sm text-(--color-text-muted) leading-relaxed mb-4">
                            When you create an account and use {config.company.name}, we collect the following information:
                        </p>
                        <ul className="space-y-2 text-sm text-(--color-text-muted) leading-relaxed list-none">
                            <li><span className="font-medium text-(--color-text)">Account Information.</span> Your email address and account credentials used to create and access your account.</li>
                            <li><span className="font-medium text-(--color-text)">Usage Data.</span> Information about how you use the Service, including searches performed, opportunities saved, and features accessed.</li>
                            <li><span className="font-medium text-(--color-text)">Device and Browser Information.</span> Basic technical data such as browser type and operating system, collected automatically to maintain service security and reliability.</li>
                            <li><span className="font-medium text-(--color-text)">Communications.</span> If you contact us directly, we may retain the content of those communications.</li>
                        </ul>
                        <p className="text-sm text-(--color-text-muted) leading-relaxed mt-4">
                            We do not collect payment card details. Payments are processed securely by Stripe, which has its own privacy policy.
                        </p>
                    </div>

                    <div>
                        <h2 className="text-lg font-semibold text-(--color-text) mb-3">How We Use Your Data</h2>
                        <p className="text-sm text-(--color-text-muted) leading-relaxed mb-4">
                            We use the personal data we collect to:
                        </p>
                        <ul className="space-y-2 text-sm text-(--color-text-muted) leading-relaxed list-none">
                            <li>Provide, operate, and maintain the Service</li>
                            <li>Manage your account and authenticate your identity</li>
                            <li>Track and enforce free tier usage limits</li>
                            <li>Maintain and improve Service performance and stability</li>
                            <li>Respond to your questions and support requests</li>
                            <li>Send transactional emails related to your account</li>
                        </ul>
                        <p className="text-sm text-(--color-text-muted) leading-relaxed mt-4">
                            We do not sell your personal data. We do not use your data for advertising purposes.
                        </p>
                    </div>

                    <div>
                        <h2 className="text-lg font-semibold text-(--color-text) mb-3">Third-Party Services</h2>
                        <p className="text-sm text-(--color-text-muted) leading-relaxed mb-4">
                            {config.company.name} uses the following third-party services which may process your data:
                        </p>
                        <ul className="space-y-2 text-sm text-(--color-text-muted) leading-relaxed list-none">
                            <li><span className="font-medium text-(--color-text)">Firebase (Google).</span> Used for authentication and user data storage. Subject to Google&apos;s Privacy Policy.</li>
                            <li><span className="font-medium text-(--color-text)">Stripe.</span> Used for payment processing. {config.company.name} does not store payment card information.</li>
                        </ul>
                        <p className="text-sm text-(--color-text-muted) leading-relaxed mt-4">
                            Each of these providers maintains their own privacy policies and security practices.
                        </p>
                    </div>

                    <div>
                        <h2 className="text-lg font-semibold text-(--color-text) mb-3">Data Retention</h2>
                        <p className="text-sm text-(--color-text-muted) leading-relaxed">
                            We retain your personal data for as long as your account is active. If you delete your account, we will delete your personal data within 30 days, except where retention is required by law.
                        </p>
                    </div>

                    <div>
                        <h2 className="text-lg font-semibold text-(--color-text) mb-3">Your Privacy Rights</h2>
                        <p className="text-sm text-(--color-text-muted) leading-relaxed">
                            Depending on where you live, you may have the right to access, correct, or delete your personal data. To exercise any of these rights, contact us at{' '}
                            <a href={`mailto:${config.company.email.privacy}`} className="text-(--color-link) transition-colors hover:text-(--color-link-hover) hover:underline">
                                {config.company.email.privacy}
                            </a>{' '}
                            and we will respond within 7 days.
                        </p>
                    </div>

                    <div>
                        <h2 className="text-lg font-semibold text-(--color-text) mb-3">Children&apos;s Privacy</h2>
                        <p className="text-sm text-(--color-text-muted) leading-relaxed">
                            {config.company.name} is not directed at children under the age of 13. We do not knowingly collect personal data from children. If you believe a child has provided us with personal data, please contact us and we will delete it promptly.
                        </p>
                    </div>

                    <div>
                        <h2 className="text-lg font-semibold text-(--color-text) mb-3">Changes to This Policy</h2>
                        <p className="text-sm text-(--color-text-muted) leading-relaxed">
                            We may update this Privacy Policy from time to time. If we make material changes, we will notify you by email or by posting a notice on the Service. Your continued use of the Service after changes are posted constitutes your acceptance of the updated policy.
                        </p>
                    </div>

                    <div>
                        <h2 className="text-lg font-semibold text-(--color-text) mb-3">Contact</h2>
                        <p className="text-sm text-(--color-text-muted) leading-relaxed">
                            If you have any questions about this Privacy Policy, please contact us at{' '}
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
