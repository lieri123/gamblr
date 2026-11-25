import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // PhotoUpload accepts images up to 5 MB; the server action default is 1 MB.
      // Leave headroom for multipart encoding overhead.
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
