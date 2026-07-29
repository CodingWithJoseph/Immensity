import { config } from "@/lib/config"

export default function ContactPage() {
    return (
        <main className="min-h-screen bg-(--color-bg)">
            <div className="max-w-3xl mx-auto px-6 py-16">

                <h1 className="text-4xl font-semibold text-center text-(--color-text) mb-3">
                    Contact
                </h1>
                <p className="text-center text-(--color-text-muted) text-sm mb-8 max-w-xl mx-auto">
                    Have a question or need help? We&#39;d love to hear from you.
                </p>
                <hr className="border-(--color-border) mb-10"/>

                <div className="space-y-6">
                    <div>
                        <h2 className="text-lg font-semibold text-(--color-text) mb-3">General Support</h2>
                        <p className="text-sm text-(--color-text-muted) leading-relaxed">
                            For general questions and support, email us at{' '}
                            <a href={`mailto:${config.company.email.support}`} className="text-(--color-link) transition-colors hover:text-(--color-link-hover) hover:underline">
                                {config.company.email.support}
                            </a>.
                            We typically respond within one business day.
                        </p>
                    </div>

                    <div>
                        <h2 className="text-lg font-semibold text-(--color-text) mb-3">Legal & Privacy</h2>
                        <p className="text-sm text-(--color-text-muted) leading-relaxed">
                            For legal or privacy inquiries, email us at{' '}
                            <a href={`mailto:${config.company.email.legal}`} className="text-(--color-link) transition-colors hover:text-(--color-link-hover) hover:underline">
                                {config.company.email.legal}
                            </a>.
                        </p>
                    </div>
                </div>

                <div className="mt-16 pt-8 border-t border-(--color-border)">
                    <p className="text-xs text-(--color-text-muted)">
                        Copyright © {config.legal.copyrightYear} {config.company.name}. All rights reserved.
                    </p>
                </div>

            </div>
        </main>
    )
}
