import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite carga un binario WASM desde su propio paquete; no debe empaquetarse.
  serverExternalPackages: ["@electric-sql/pglite"],
};

export default nextConfig;
