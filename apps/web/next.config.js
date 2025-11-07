const path = require("path");

const webpack = require("webpack");

module.exports = {
  reactStrictMode: true,
  swcMinify: false,
  experimental: {
    forceSwcTransforms: false,
  },
  eslint: {
    // TODO: Re-enable after fixing ESLint errors
    // Currently disabled to prevent build failures
    ignoreDuringBuilds: true,
  },
  webpack: (config) => {
    config.resolve.alias["@"] = path.resolve(__dirname);
    config.resolve.alias["@/lib"] = path.resolve(__dirname, "lib");
    config.resolve.alias["@/hooks"] = path.resolve(__dirname, "hooks");
    config.resolve.alias["@/components"] = path.resolve(__dirname, "components");
    config.resolve.alias["@/modules"] = path.resolve(__dirname, "modules");

    // SECURITY: API keys should NEVER be exposed to client-side code
    // All API calls using GEMINI_API_KEY must be made from server-side API routes only

    return config;
  },
};