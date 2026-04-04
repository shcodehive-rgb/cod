/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api',
  },
  
  // === FIX FOR ONEDRIVE/WINDOWS ===
  distDir: '.next',
  
  // هادي هي اللي غتسكت المشكل ديال Turbopack
  turbopack: {}, 

  webpack: (config, { isServer, dev }) => {
    config.watchOptions = {
      poll: 1000,
      aggregateTimeout: 500,
      ignored: [
        '**/node_modules',
        '**/.next',
        '**/build',
        '**/.git',
      ],
    };

    if (isServer) {
      config.cache = false;
    } else {
      config.cache = {
        type: 'memory',
      };
    }
    return config;
  },

  onDemandEntries: {
    maxInactiveAge: 30 * 1000,
    pagesBufferLength: 2,
  },

  experimental: {},
};

module.exports = nextConfig;