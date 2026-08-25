/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    // pdfjs-dist v3 tiene una dependencia nativa opcional (canvas) que
    // rompe el bundler de webpack. Con esto, Next.js lo carga desde
    // node_modules en runtime, sin pasarlo por webpack.
    serverComponentsExternalPackages: ["pdfjs-dist"],

    // Vercel solo incluye en el deploy los archivos que detecta como
    // importados estáticamente. pdf.worker.js se carga de forma dinámica
    // dentro de pdf.js (require('./pdf.worker.js')), así que Vercel no lo
    // detecta y no lo incluye. Esto fuerza su inclusión.
    outputFileTracingIncludes: {
      "/**": ["./node_modules/pdfjs-dist/legacy/build/**"],
    },
  },
};

export default nextConfig;
