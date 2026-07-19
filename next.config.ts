import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PDF indexing and Gemini calls occur only in Node.js route handlers.
  serverExternalPackages: ["@google/genai"],
};

export default nextConfig;
