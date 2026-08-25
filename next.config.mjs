/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    // pdfjs-dist v3 requiere canvas (módulo nativo opcional).
    // Sin esto, el webpack de Next.js intenta bundlear pdfjs-dist y falla
    // al no poder resolver 'canvas'. Con esto, Node.js lo carga en runtime
    // directamente desde node_modules, sin pasar por webpack.
    serverComponentsExternalPackages: ["pdfjs-dist"],
  },
};

export default nextConfig;
