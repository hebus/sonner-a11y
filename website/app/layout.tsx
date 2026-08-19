import { type Metadata } from 'next';

import Analytics from '@/components/analytics';
import '@/styles/globals.css';
import '@/styles/index.css';
import '@/styles/style.css';

// deployed to GitHub Pages under /<repo>/; override with NEXT_PUBLIC_SITE_URL for another host
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://hebus.github.io/sonner-a11y';
// metadata icon paths are not rewritten with basePath, so prefix them by hand
const basePath = process.env.BASE_PATH ?? '';
const description = 'An accessible toast component for pure JS: screen-reader announcements, full keyboard operation, WCAG 2.2 AA.';

export const metadata: Metadata = {
    metadataBase: new URL(siteUrl),
    title: 'Sonner-a11y',
    description,
    twitter: {
        images: '/og.png',
        card: 'summary_large_image',
    },
    icons: {
        shortcut: `${basePath}/favicon.ico`,
    },
    openGraph: {
        title: 'Sonner-a11y',
        description,
        url: siteUrl,
        siteName: 'Sonner-a11y',
        locale: 'en',
        type: 'website',
        images: '/og.png',
    },
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <head>
                <link rel="shortcut icon" href="favicon.ico" />
                {process.env.NODE_ENV !== 'development' && <Analytics />}
            </head>
            <body>{children}</body>
        </html>
    );
}
