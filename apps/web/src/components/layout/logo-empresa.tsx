interface LogoEmpresaProps {
  className?: string;
}

/**
 * Logo real de la empresa (`assets/svg/logo-empresa.svg`, #114) — inlineado
 * como componente en vez de `<img>` para poder heredar color vía
 * `currentColor` (el sidebar es de fondo oscuro, el logo tiene que salir en
 * blanco ahí, no traer su propio color fijo). Mismo `viewBox` y paths del
 * archivo original, sin ningún cambio de geometría.
 */
export function LogoEmpresa({ className }: LogoEmpresaProps) {
  return (
    <svg
      viewBox="0 0 800 800"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M69.97,85.5h367.43c23.17,0,41.99,18.81,41.99,41.99v220.25H27.98V127.49c0-23.17,18.81-41.99,41.99-41.99Z" />
      <ellipse cx="652.25" cy="228.91" rx="119.77" ry="118.83" />
      <path d="M415.14,709.6l344.53-255.51c22.79-16.9,10.83-53.08-17.54-53.08H58.45c-28.37,0-40.32,36.18-17.54,53.08l344.53,255.51c8.82,6.54,20.88,6.54,29.69,0Z" />
    </svg>
  );
}
