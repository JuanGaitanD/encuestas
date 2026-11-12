import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite carga un binario WASM desde su propio paquete; no debe empaquetarse.
  serverExternalPackages: ["@electric-sql/pglite"],
  poweredByHeader: false,
  // Las capturas de la portada pasan por el optimizador: AVIF o WebP según el navegador, a calidad 90 para que el texto se lea nítido.
  images: { formats: ["image/avif", "image/webp"], qualities: [75, 90] },
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
