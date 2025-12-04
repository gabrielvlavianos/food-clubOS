/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: { unoptimized: true },
  poweredByHeader: false,
  // Generate unique build ID for each deploy using Netlify's DEPLOY_ID
  generateBuildId: async () => {
    // Use Netlify's deploy ID if available, otherwise use timestamp
    return process.env.NEXT_BUILD_ID || process.env.DEPLOY_ID || `build-${Date.now()}`;
  },
  // Disable static optimization cache
  onDemandEntries: {
    maxInactiveAge: 0,
    pagesBufferLength: 0,
  },
  // Add environment variables to runtime config to force file changes
  env: {
    BUILD_TIME: new Date().toISOString(),
    DEPLOY_ID: process.env.DEPLOY_ID || 'local',
  },
};

module.exports = nextConfig;
