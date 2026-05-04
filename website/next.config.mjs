import { fileURLToPath } from 'node:url';

// Monorepo root — used for production output tracing only. Do not set `turbopack.root`
// here: pointing Turbopack at the whole repo makes dev watch thousands of extra files
// (scraping_system/node_modules, outputs, .git) and can exhaust RAM / freeze Windows.
const projectRootDir = fileURLToPath(new URL('..', import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['192.168.56.1'],
  outputFileTracingRoot: projectRootDir,
  images: {
    unoptimized: true,
  },
}

export default nextConfig
