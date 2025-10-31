const path = require("path");

const webpack = require("webpack");

module.exports = {
  reactStrictMode: false,
  eslint: {
    ignoreDuringBuilds: true,
  },
  outputFileTracingRoot: path.join(__dirname),
  webpack: (config) => {
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
    
    return config;
  },
};