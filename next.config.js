/* eslint-disable @typescript-eslint/no-var-requires */
/** @type {import('next').NextConfig} */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require("path");

const reactPath = path.resolve(__dirname, "node_modules/react");
const reactDomPath = path.resolve(__dirname, "node_modules/react-dom");

// No `i18n` block: with a single locale it bought nothing, and it served every
// page a second time under /en/*, so each article had two working URLs. The
// canonical tag pointed at the right one, but the simpler fix is not to have
// the duplicate at all. Bring it back the day there is a second language.
const nextConfig = {
  // The gallery pages used to live one level deeper, under
  // /design-engineering/component/*. They are now siblings of the gallery
  // index, and every old link keeps working.
  async redirects() {
    return [
      {
        source: "/design-engineering/component/:slug",
        destination: "/design-engineering/:slug",
        permanent: true,
      },
      {
        source: "/design-engineering/component",
        destination: "/design-engineering",
        permanent: true,
      },
      // The single-locale i18n config used to answer on /en/* as well. Anything
      // that got indexed there is sent to the one real URL rather than to a 404.
      {
        source: "/en",
        destination: "/",
        permanent: true,
      },
      {
        source: "/en/:path*",
        destination: "/:path*",
        permanent: true,
      },
    ];
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
