/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // Enables polling for file changes which is a more reliable method
    // for detecting changes in some environments (like containers).
    config.watchOptions = {
      poll: 1000, // Check for changes every second
      aggregateTimeout: 300, // Delay before rebuilding
    };
    return config;
  },
  experimental: {
    // This addresses the cross-origin warning in the logs, which is common
    // in cloud-based development environments.
    allowedDevOrigins: [
        'https://*.cloudworkstations.dev',
        'https://*.google.dev',
    ],
  },
};

export default nextConfig;
