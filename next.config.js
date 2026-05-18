/* eslint-disable @typescript-eslint/no-var-requires */
/** @type {import('next').NextConfig} */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require("path");

const reactPath = path.resolve(__dirname, "node_modules/react");
const reactDomPath = path.resolve(__dirname, "node_modules/react-dom");

const nextConfig = {
  i18n: {
    locales: ["en"],
    defaultLocale: "en",
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          {
            key: "Access-Control-Allow-Headers",
            value:
              "Origin, X-Requested-With, Content-Type, Accept, Authorization",
          },
        ],
      },
    ];
  },
  // Turbopack (default in `next dev` since Next 15) ignores the `webpack`
  // option below, so we have to dedupe React for it explicitly. Without this,
  // any locally-linked dependency (e.g. `link:` to react-split-flap-display)
  // pulls in its own copy of React from its own node_modules and you get
  // "Cannot read properties of null (reading 'useRef')" at runtime.
  turbopack: {
    resolveAlias: {
      react: reactPath,
      "react-dom": reactDomPath,
    },
  },
  webpack: (config) => {
    config.resolve.alias["react"] = reactPath;
    config.resolve.alias["react-dom"] = reactDomPath;
    return config;
  },
  reactStrictMode: true,
};

module.exports = nextConfig;
