/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  images: { unoptimized: true },
  poweredByHeader: false,
  // Generate unique build ID for each deploy
  generateBuildId: async () => {
    return `build-${Date.now()}`;
  },
  // Disable static page generation cache
  onDemandEntries: {
    maxInactiveAge: 0,
    pagesBufferLength: 0,
  },
};

module.exports = nextConfig;
