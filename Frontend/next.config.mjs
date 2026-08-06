/** @type {import('next').NextConfig} */
const nextConfig = {
  // Necesario para el build de Docker: empaqueta solo lo que el server
  // necesita en runtime (sin todo node_modules) en .next/standalone.
  output: "standalone",
};
export default nextConfig;
