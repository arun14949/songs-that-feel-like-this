import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'i.scdn.co',
        pathname: '/image/**',
      },
    ],
  },
  experimental: {
    // Increase body size limit for API routes to support base64-encoded images
    // A 10MB image becomes ~13MB after base64 encoding
    serverActions: {
      bodySizeLimit: '15mb',
    },
  },
};

export default nextConfig;
