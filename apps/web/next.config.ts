import path from "node:path";
import type { NextConfig } from "next";

const REPO_ROOT = path.resolve(import.meta.dirname, "..", "..");

const nextConfig: NextConfig = {
  // /materiales lee docs/materiales/<material>/*.md del filesystem en
  // runtime (issue #10, ver leerFichaTecnica en materiales-catalog.ts) --
  // sin esto, el file tracing de Vercel no incluye esa carpeta en el bundle
  // de la función serverless (solo rastrea imports estáticos, no un
  // `readdir` con ruta calculada en runtime) y la ficha técnica nunca
  // aparecería en producción aunque exista en el repo. Ruta absoluta:
  // Turbopack rechaza un glob relativo que empiece con "../" ("navigates
  // out of the project root"), aunque el destino real siga siendo válido.
  outputFileTracingIncludes: {
    "/materiales": [path.join(REPO_ROOT, "docs/materiales/**/*")],
  },
};

export default nextConfig;
