import type { NextConfig } from "next";

const basePath = process.env.OSIRIS_BASE_PATH || process.env.NEXT_PUBLIC_BASE_PATH || '';

const nextConfig: NextConfig = {
  basePath: basePath || undefined,
  assetPrefix: basePath || undefined,
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
  output: 'standalone',
  serverExternalPackages: ['ws'],
  transpilePackages: ['react-map-gl', 'mapbox-gl', 'maplibre-gl'],
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
};

export default nextConfig;
