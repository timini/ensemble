import path from "node:path"
import { fileURLToPath } from "node:url"

/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: false,
  // Tokens and the Tailwind preset are read from ../component-library.
  outputFileTracingRoot: path.join(path.dirname(fileURLToPath(import.meta.url)), "../.."),
}

export default nextConfig
