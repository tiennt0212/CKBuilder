/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["ckb-utils"],
  webpack(config) {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
    };
    return config;
  },
};

export default nextConfig;
