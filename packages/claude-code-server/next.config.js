/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    '@claude-code-server/shared',
    '@claude-code-server/core',
    '@claude-code-server/agent-manager',
  ],
};

module.exports = nextConfig;
