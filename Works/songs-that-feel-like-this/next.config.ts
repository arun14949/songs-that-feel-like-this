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
  api: {
    bodyParser: {
      sizeLimit: '10mb', // Increase from default 1mb to support high-quality images
    },
  },
};

export default nextConfig;
