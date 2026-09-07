import { CambiarPasswordForm } from "@/components/auth/cambiar-password-form";

/**
 * "Mi cuenta" (#117): cambiar la contraseña propia, disponible para
 * cualquier usuario logueado -- a diferencia de /admin, no hay gate extra
 * acá (el middleware ya garantiza sesión, eso es lo único que hace falta).
 */
export default function Cuenta() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-navy text-2xl font-semibold">Mi cuenta</h1>
        <p className="text-text-muted mt-1 text-sm">
          Cambiá tu propia contraseña. No hace falta la actual: la sesión ya
          está activa.
        </p>
      </div>
      <div className="max-w-sm">
        <CambiarPasswordForm />
      </div>
    </div>
  );
}
