/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['react-apexcharts', 'apexcharts'],
  webpack: (config) => {
    if (!config.resolve.fallback) {
      config.resolve.fallback = {};
    }
    
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      child_process: false,
      perf_hooks: false,
      canvas: false,
      'utf-8-validate': false,
      bufferutil: false,
    };
    
    config.module.rules.push({
      test: /\.m?js$/,
      type: "javascript/auto",
      resolve: {
        fullySpecified: false,
      },
    });

    return config;
  },
  swcMinify: true,
  compress: true,
  productionBrowserSourceMaps: false,
  async redirects() {
    return [
      {
        source: '/login',
        destination: '/',
        permanent: true,
      },
    ];
  },
  // Enable React Strict Mode for better development experience
  reactStrictMode: true,
  
  // Configure Vercel deployment settings
  experimental: {
    serverComponentsExternalPackages: ['yahooFinance', 'yahoo-finance2']
  },
  
  // Configure image domains if needed
  images: {
    domains: ['images.unsplash.com'],
  },
};

module.exports = nextConfig; 