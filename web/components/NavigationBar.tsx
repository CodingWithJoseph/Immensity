'use client'

import Link from "next/link";
import { useEffect, useState } from "react";
import { routes } from "@/app/util/routes";
import { appHref, marketingOriginForPublicLinks } from "@/lib/domain-routing";
import Wordmark from "@/components/Wordmark";

const navLinks = [
    { label: "Live demo", href: routes.landing.demo },
    { label: "How it works", href: routes.landing.learn },
    { label: "Philosophy", href: routes.landing.philosophy },
    { label: "Pricing", href: routes.landing.pricing },
];

const signInHref = appHref(routes.auth.signIn);
const signUpHref = appHref(routes.auth.signUp);

// The navbar renders on the console subdomain too (auth pages), where a relative
// "/" would resolve to console.useimmensity.com. Always point the logo at the
// absolute marketing site.
const marketingUrl = marketingOriginForPublicLinks();
const homeHref = `${marketingUrl}/`;

export default function NavigationBar() {
    const [open, setOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 8);
        onScroll();
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    return (
        <header className="pf-nav" data-scrolled={scrolled}>
            <nav className="pf-shell pf-nav__inner">
                <Link href={homeHref} aria-label="Immensity home">
                    <Wordmark />
                </Link>
                <div className="pf-nav__links">
                    {navLinks.map((link) => (
                        <Link
                            key={link.label}
                            href={link.href}
                            className="pf-nav__link">
                            {link.label}
                        </Link>
                    ))}
                </div>
                <div className="pf-nav__actions">
                    <Link
                        href={signInHref}
                        className="pf-nav__link"
                    >
                        Sign In
                    </Link>
                    <Link
                        href={signUpHref}
                        className="pf-nav__button"
                    >
                        Create account
                    </Link>
                </div>
                <button
                    type="button"
                    onClick={() => setOpen((v) => !v)}
                    aria-label={open ? "Close menu" : "Open menu"}
                    aria-expanded={open}
                    className={`pf-menu-button ${open ? "hover:text-(--color-error)" : ""}`}>
                    <span aria-hidden>{open ? "×" : "="}</span>
                </button>
            </nav>

                <div className="pf-mobile-panel" data-open={open}>
                    <div className="pf-shell pf-mobile-panel__inner">
                        {navLinks.map((link) => (
                            <Link
                                key={link.label}
                                href={link.href}
                                onClick={() => setOpen(false)}
                                className="pf-nav__link">
                                {link.label}
                            </Link>
                        ))}
                            <Link
                                href={signInHref}
                                onClick={() => setOpen(false)}
                                className="pf-nav__link">
                                Sign In
                            </Link>
                            <Link
                                href={signUpHref}
                                onClick={() => setOpen(false)}
                                className="pf-nav__button">
                                Create account
                            </Link>
                    </div>
                </div>
        </header>
    );
}
