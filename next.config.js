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
};

module.exports = nextConfig; 