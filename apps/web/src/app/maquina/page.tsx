import { AyudaLink } from "@/components/ui/ayuda-link";
import { MaquinaForm } from "@/components/maquina/maquina-form";
import { leerMaquina } from "@/lib/maquina-data";

// La configuración se edita en cualquier momento, así que esta página no se
// puede congelar como estática en el build.
export const dynamic = "force-dynamic";

export default async function Maquina() {
  const maquina = await leerMaquina();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-navy text-2xl font-semibold">Máquina</h1>
        <p className="text-text-muted mt-1 text-sm">
          Parámetros del perfil de máquina (CNC 3018 + Laser Tree LT-80W-F45).
          Lo que guardes acá pasa a ser el default global real de todo el
          toolkit, no solo un pre-llenado del asistente de suites.
        </p>
        <AyudaLink seccion="maquina" />
      </div>
      <MaquinaForm inicial={maquina} />
    </div>
  );
}
