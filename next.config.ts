import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Lets the dev server accept requests when the app is opened over the
  // LAN IP (e.g. testing a QR scan from a phone on the same WiFi) instead
  // of localhost — Next.js otherwise 403s cross-origin dev requests as a
  // DNS-rebinding protection.
  allowedDevOrigins: ['192.168.1.9'],
};

export default nextConfig;
