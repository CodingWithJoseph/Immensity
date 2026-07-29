import { config } from "@/lib/config"

export default function TermsPage() {
    return (
        <main className="min-h-screen bg-(--color-bg)">
            <div className="max-w-3xl mx-auto px-6 py-16">

                <h1 className="text-4xl font-semibold text-center text-(--color-text) mb-3">
                    {config.company.name} Terms of Use
                </h1>
                <p className="text-center text-(--color-text-muted) text-sm mb-8">
                    Legal Information & Notices
                </p>
                <hr className="border-(--color-border) mb-10"/>

                <section className="space-y-10">

                    <div>
                        <h2 className="text-lg font-semibold text-(--color-text) mb-3">Ownership of Site; Agreement to Terms of Use</h2>
                        <p className="text-sm text-(--color-text-muted) leading-relaxed mb-3">
                            These Terms and Conditions of Use (the &ldquo;Terms of Use&rdquo;) apply to the {config.company.name} web site located at {config.site.url} and all associated pages and services operated by {config.company.name} (&ldquo;the Service&rdquo;). The Service is the property of {config.company.name} and its licensors. BY USING THE SERVICE, YOU AGREE TO THESE TERMS OF USE; IF YOU DO NOT AGREE, DO NOT USE THE SERVICE.
                        </p>
                        <p className="text-sm text-(--color-text-muted) leading-relaxed">
                            {config.company.name} reserves the right, at its sole discretion, to change, modify, add or remove portions of these Terms of Use at any time. It is your responsibility to check these Terms of Use periodically for changes. Your continued use of the Service following the posting of changes will mean that you accept and agree to the changes. As long as you comply with these Terms of Use, {config.company.name} grants you a personal, non-exclusive, non-transferable, limited privilege to access and use the Service.
                        </p>
                    </div>

                    <div>
                        <h2 className="text-lg font-semibold text-(--color-text) mb-3">Description of Service</h2>
                        <p className="text-sm text-(--color-text-muted) leading-relaxed">
                            {config.company.name} is an opportunity intelligence platform that surfaces unmet needs and market opportunities by analyzing publicly available online conversations. The Service provides users with access to curated opportunity data, search functionality, bookmarking tools, and trend analysis. Access to certain features of the Service requires a paid subscription. Free tier access is subject to usage limits as described on the pricing page.
                        </p>
                    </div>

                    <div>
                        <h2 className="text-lg font-semibold text-(--color-text) mb-3">Accounts, Passwords and Security</h2>
                        <p className="text-sm text-(--color-text-muted) leading-relaxed">
                            To access certain features of the Service, you must register for an account. You are entirely responsible for maintaining the confidentiality of your account credentials, including your password, and for all activity that occurs under your account. You agree to notify {config.company.name} immediately of any unauthorized use of your account or any other breach of security. {config.company.name} cannot and will not be liable for any loss or damage arising from your failure to comply with these obligations. You may not use another person&apos;s account at any time without the express permission of the account holder.
                        </p>
                    </div>

                    <div>
                        <h2 className="text-lg font-semibold text-(--color-text) mb-3">Your Use of the Service</h2>
                        <p className="text-sm text-(--color-text-muted) leading-relaxed">
                            You agree to use the Service only for lawful purposes and in accordance with these Terms of Use. You agree not to use the Service in any way that violates applicable local, national or international law or regulation. You may not attempt to gain unauthorized access to any portion of the Service, its related systems, or networks. You may not use any automated means including bots, scrapers, or crawlers to access, monitor, or copy any content from the Service without {config.company.name}&apos;s prior written consent. You may not use the Service to transmit any unsolicited commercial communications, or to collect or harvest any personally identifiable information from other users.
                        </p>
                    </div>

                    <div>
                        <h2 className="text-lg font-semibold text-(--color-text) mb-3">Subscriptions and Payments</h2>
                        <p className="text-sm text-(--color-text-muted) leading-relaxed">
                            Certain features of the Service are available only with a paid subscription. By subscribing, you agree to pay the applicable fees as described at the time of purchase. All fees are non-refundable except as required by law or as explicitly stated in these Terms of Use. {config.company.name} reserves the right to change its pricing at any time. If pricing changes, you will be notified in advance and your continued use of the Service after the change constitutes acceptance of the new pricing. Subscriptions automatically renew unless cancelled before the renewal date. You may cancel your subscription at any time through your account settings.
                        </p>
                    </div>

                    <div>
                        <h2 className="text-lg font-semibold text-(--color-text) mb-3">Free Tier Limitations</h2>
                        <p className="text-sm text-(--color-text-muted) leading-relaxed">
                            Free tier accounts are subject to the following limitations: search results are capped at 50 per query, saved opportunities are limited to 5, and trend data is limited to 7 days. {config.company.name} reserves the right to modify free tier limits at any time with reasonable notice. Exceeding free tier limits will prompt an upgrade to a paid plan.
                        </p>
                    </div>

                    <div>
                        <h2 className="text-lg font-semibold text-(--color-text) mb-3">Intellectual Property</h2>
                        <p className="text-sm text-(--color-text-muted) leading-relaxed">
                            All content, features, and functionality of the Service, including but not limited to text, graphics, data compilations, algorithms, and software, are owned by {config.company.name} and are protected by intellectual property laws. You may not copy, reproduce, distribute, modify, or create derivative works of any content from the Service without {config.company.name}&apos;s prior written consent. Opportunity data surfaced by the Service is provided for your personal, non-commercial use only and may not be resold or redistributed.
                        </p>
                    </div>

                    <div>
                        <h2 className="text-lg font-semibold text-(--color-text) mb-3">Privacy</h2>
                        <p className="text-sm text-(--color-text-muted) leading-relaxed">
                            {config.company.name}&apos;s Privacy Policy governs the collection, use, and disclosure of your personal information in connection with your use of the Service, and is incorporated into these Terms of Use by reference. By using the Service, you consent to the data practices described in the Privacy Policy.
                        </p>
                    </div>

                    <div>
                        <h2 className="text-lg font-semibold text-(--color-text) mb-3">Third-Party Links and Services</h2>
                        <p className="text-sm text-(--color-text-muted) leading-relaxed">
                            The Service may contain links to third-party websites or services that are not owned or controlled by {config.company.name}. {config.company.name} has no control over and assumes no responsibility for the content, privacy policies, or practices of any third-party websites or services. You acknowledge and agree that {config.company.name} shall not be responsible or liable for any damage or loss caused by your use of any third-party websites or services.
                        </p>
                    </div>

                    <div>
                        <h2 className="text-lg font-semibold text-(--color-text) mb-3">Disclaimers</h2>
                        <p className="text-sm text-(--color-text-muted) leading-relaxed">
                            THE SERVICE IS PROVIDED ON AN &ldquo;AS-IS&rdquo; AND &ldquo;AS-AVAILABLE&rdquo; BASIS WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED. {config.company.name.toUpperCase()} DOES NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR FREE OF HARMFUL COMPONENTS. {config.company.name.toUpperCase()} DOES NOT WARRANT THE ACCURACY, COMPLETENESS, OR USEFULNESS OF ANY OPPORTUNITY DATA OR OTHER INFORMATION PROVIDED THROUGH THE SERVICE. YOUR USE OF THE SERVICE IS AT YOUR SOLE RISK. {config.company.name.toUpperCase()} DISCLAIMS ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
                        </p>
                    </div>

                    <div>
                        <h2 className="text-lg font-semibold text-(--color-text) mb-3">Limitation of Liability</h2>
                        <p className="text-sm text-(--color-text-muted) leading-relaxed">
                            TO THE FULLEST EXTENT PERMITTED BY LAW, {config.company.name.toUpperCase()} SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF PROFITS, DATA, OR GOODWILL, ARISING OUT OF OR IN CONNECTION WITH YOUR USE OF THE SERVICE. IN NO EVENT SHALL {config.company.name.toUpperCase()}&apos;S TOTAL LIABILITY TO YOU FOR ALL CLAIMS ARISING OUT OF OR RELATED TO THESE TERMS OR THE SERVICE EXCEED THE GREATER OF THE AMOUNT YOU PAID TO {config.company.name.toUpperCase()} IN THE SIX MONTHS PRECEDING THE CLAIM OR US$100.00.
                        </p>
                    </div>

                    <div>
                        <h2 className="text-lg font-semibold text-(--color-text) mb-3">Indemnity</h2>
                        <p className="text-sm text-(--color-text-muted) leading-relaxed">
                            You agree to indemnify, defend, and hold harmless {config.company.name} and its officers, directors, employees, and agents from and against any claims, liabilities, damages, losses, and expenses, including reasonable attorneys&apos; fees, arising out of or in any way connected with your access to or use of the Service or your violation of these Terms of Use.
                        </p>
                    </div>

                    <div>
                        <h2 className="text-lg font-semibold text-(--color-text) mb-3">Termination</h2>
                        <p className="text-sm text-(--color-text-muted) leading-relaxed">
                            {config.company.name} may terminate or suspend your account and access to the Service at its sole discretion, without prior notice, for conduct that {config.company.name} believes violates these Terms of Use or is harmful to other users, {config.company.name}, or third parties, or for any other reason. Upon termination, your right to use the Service will immediately cease.
                        </p>
                    </div>

                    <div>
                        <h2 className="text-lg font-semibold text-(--color-text) mb-3">Governing Law</h2>
                        <p className="text-sm text-(--color-text-muted) leading-relaxed">
                            These Terms of Use shall be governed by and construed in accordance with the laws of the State of California, without regard to its conflict of law provisions. You agree to submit to the personal jurisdiction of the state and federal courts located in California for the resolution of any disputes arising out of these Terms of Use or your use of the Service.
                        </p>
                    </div>

                    <div>
                        <h2 className="text-lg font-semibold text-(--color-text) mb-3">Miscellaneous</h2>
                        <p className="text-sm text-(--color-text-muted) leading-relaxed">
                            These Terms of Use constitute the entire agreement between you and {config.company.name} with respect to your use of the Service and supersede all prior agreements. If any provision of these Terms of Use is found to be unenforceable, the remaining provisions will remain in full force and effect. {config.company.name}&apos;s failure to enforce any right or provision of these Terms of Use will not be considered a waiver of those rights.
                        </p>
                    </div>

                    <div>
                        <h2 className="text-lg font-semibold text-(--color-text) mb-3">Contact</h2>
                        <p className="text-sm text-(--color-text-muted) leading-relaxed">
                            If you have any questions about these Terms of Use, please contact us at{' '}
                            <a href={`mailto:${config.company.email.legal}`} className="text-(--color-link) transition-colors hover:text-(--color-link-hover) hover:underline">
                                {config.company.email.legal}
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
