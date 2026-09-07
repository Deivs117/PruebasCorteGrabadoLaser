import { notFound } from "next/navigation";
import { AdminPanel } from "@/components/admin/admin-panel";
import { esCuentaMaestra, listarUsuariosAdmin } from "@/lib/admin-data";
import { crearClienteServidor } from "@/lib/supabase/server";

// La lista de cuentas cambia con cada alta/reset -- nunca se puede
// congelar como estática en el build (mismo criterio que /tarifas).
export const dynamic = "force-dynamic";

/**
 * Panel de Generación de Credenciales (#117), solo para la cuenta maestra.
 * El gate real (server-side, antes de renderizar nada) vive acá: sin
 * sesión de la cuenta maestra, la página ni siquiera existe -- `notFound()`
 * en vez de un 403, para no confirmarle a nadie más que la ruta existe.
 * El link del sidebar también se oculta (ver `AppShell`/`Sidebar`), pero
 * esto es lo que realmente protege la ruta directa.
 */
export default async function Admin() {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!esCuentaMaestra(user?.email)) {
    notFound();
  }

  const usuarios = await listarUsuariosAdmin();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-navy text-2xl font-semibold">
          Generación de Credenciales
        </h1>
        <p className="text-text-muted mt-1 text-sm">
          Dar de alta una cuenta nueva o resetear la contraseña de una
          existente. La contraseña se muestra una sola vez -- compartila con la
          persona por un canal seguro (Slack, en persona), nunca por acá de
          nuevo: no vuelve a mostrarse ni queda guardada en texto plano.
        </p>
      </div>
      <AdminPanel usuariosIniciales={usuarios} />
    </div>
  );
}
