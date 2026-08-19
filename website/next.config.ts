import type { NextConfig } from 'next';

// GitHub Pages serves the site from https://<user>.github.io/<repo>/, so every asset and route has
// to be prefixed. Set BASE_PATH in CI (the Pages workflow does) and leave it empty for `next dev`.
const basePath = process.env.BASE_PATH ?? '';

const nextConfig: NextConfig = {
    reactStrictMode: true,
    devIndicators: false,
    // Pages is a static host: no server, so no SSR and no on-demand image optimisation
    output: 'export',
    basePath,
    trailingSlash: true,
    images: {
        unoptimized: true,
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'github.com',
            },
        ],
    },
};

export default nextConfig;
