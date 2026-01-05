/** @type {import('next').NextConfig} */
const repoName = 'risbow';
const isGitHubActions = process.env.GITHUB_ACTIONS === 'true';

const nextConfig = {
  reactStrictMode: true,
  output: 'export',
  images: {
    unoptimized: true
  },
  assetPrefix: isGitHubActions ? `/${repoName}/` : undefined,
  basePath: isGitHubActions ? `/${repoName}` : undefined
};

module.exports = nextConfig;
