const path = require("path");
const webpack = require("webpack");

module.exports = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: false,
  },

  // Performance optimizations
  swcMinify: true, // Use SWC for faster minification

  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'], // Keep error and warn logs
    } : false,
  },

  // Optimize production builds
  productionBrowserSourceMaps: false, // Disable source maps in production for smaller bundles

  // Image optimization
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
  },

  outputFileTracingRoot: path.join(__dirname),

  webpack: (config, { isServer }) => {
    config.resolve.alias["@"] = path.resolve(__dirname);
    config.resolve.alias["@/lib"] = path.resolve(__dirname, "lib");
    config.resolve.alias["@/hooks"] = path.resolve(__dirname, "hooks");
    config.resolve.alias["@/components"] = path.resolve(__dirname, "components");
    config.resolve.alias["@/modules"] = path.resolve(__dirname, "modules");

    config.plugins.push(
      new webpack.DefinePlugin({
        "process.env.GEMINI_API_KEY": JSON.stringify(process.env.GEMINI_API_KEY || "")
      })
    );

    // Optimize bundle size
    if (!isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          default: false,
          vendors: false,
          // Vendor chunk for large libraries
          vendor: {
            name: 'vendor',
            chunks: 'all',
            test: /node_modules/,
            priority: 20
          },
          // Common chunk for shared code
          common: {
            name: 'common',
            minChunks: 2,
            chunks: 'all',
            priority: 10,
            reuseExistingChunk: true,
            enforce: true
          },
          // Separate chunk for lucide icons
          icons: {
            name: 'icons',
            test: /[\\/]node_modules[\\/]lucide-react[\\/]/,
            priority: 30,
          },
          // Separate chunk for Supabase
          supabase: {
            name: 'supabase',
            test: /[\\/]node_modules[\\/]@supabase[\\/]/,
            priority: 30,
          },
        },
      };
    }

    return config;
  },
};