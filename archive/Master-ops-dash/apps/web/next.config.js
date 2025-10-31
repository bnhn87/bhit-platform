// next.config.js
const path = require("path");

module.exports = {
  reactStrictMode: true,
  webpack: (config) => {
    config.resolve.alias["@"] = path.resolve(__dirname);
    config.resolve.alias["@/lib"] = path.resolve(__dirname, "lib");
    config.resolve.alias["@/hooks"] = path.resolve(__dirname, "hooks");
    config.resolve.alias["@/components"] = path.resolve(__dirname, "components");
    return config;
  },
};
