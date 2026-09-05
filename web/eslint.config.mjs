import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import jsxA11y from "eslint-plugin-jsx-a11y";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Set completo de reglas de accesibilidad (docs/ui-design/reglas-frontend-basics.md,
  // sección 2) — eslint-config-next solo trae un subconjunto pequeño. El plugin
  // "jsx-a11y" ya lo registra eslint-config-next, así que solo tomamos las
  // reglas del preset "strict", no su bloque `plugins` (lo redefiniría).
  {
    rules: {
      ...jsxA11y.flatConfigs.strict.rules,
      // Reforzamos la regla de oro: nada de <div onClick> disfrazado de botón.
      "jsx-a11y/no-static-element-interactions": "error",
      "jsx-a11y/click-events-have-key-events": "error",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
