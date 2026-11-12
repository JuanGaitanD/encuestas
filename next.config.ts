import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite carga un binario WASM desde su propio paquete; no debe empaquetarse.
  serverExternalPackages: ["@electric-sql/pglite"],
  poweredByHeader: false,
  // Una encuesta grande ronda los 100 kB; el tope evita que se use la base como almacén.
  experimental: { serverActions: { bodySizeLimit: "400kb" } },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "same-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
