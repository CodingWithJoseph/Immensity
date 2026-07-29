import Link from "next/link";
import { routes } from "@/app/util/routes";
import { config } from "@/lib/config";
import Wordmark from "@/components/Wordmark";

const groups = [
    {
        title: "Product",
        links: [
            { label: "Home", href: routes.landing.home },
            { label: "Live demo", href: routes.landing.demo },
            { label: "Pricing", href: routes.landing.pricing },
        ],
    },
    {
        title: "Company",
        links: [
            { label: "About", href: routes.landing.aboutUs },
            { label: "Philosophy", href: routes.landing.philosophy },
            { label: "Learn", href: routes.landing.learn },
        ],
    },
    {
        title: "Legal",
        links: [
            { label: "Privacy", href: routes.misc.privacy },
            { label: "Terms", href: routes.misc.terms },
            { label: "Cookies", href: routes.misc.cookiePolicy },
            { label: "Contact", href: routes.misc.contact },
        ],
    },
];

export default function Footer() {
    return (
        <footer className="pf-footer">
            <div className="pf-shell pf-footer__panel">
                <div className="pf-footer__grid">
                    <div className="pf-footer__brand">
                        <Wordmark tone="on-dark" />
                        <p className="pf-footer__intro">
                            Opportunity intelligence for builders who want market evidence before they build.
                        </p>
                    </div>

                    {groups.map((group) => (
                        <div key={group.title}>
                            <p className="pf-footer__title">{group.title}</p>
                            <ul>
                                {group.links.map((link) => (
                                    <li key={link.label}>
                                        <Link href={link.href}>{link.label}</Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                <div className="pf-footer__bottom">
                    <p>© {config.legal.copyrightYear} {config.company.legalName} All rights reserved.</p>
                    <p>Build from evidence, not instinct.</p>
                </div>
            </div>
        </footer>
    );
}
