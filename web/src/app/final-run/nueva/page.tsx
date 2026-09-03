import { BackLink } from "@/components/ui/back-link";
import { FinalRunForm } from "@/components/final-run/final-run-form";
import { listarCandidatos } from "@/lib/candidatos-final-run";

export const dynamic = "force-dynamic";

export default async function NuevaFinalRun() {
  const candidatos = await listarCandidatos();

  return (
    <div className="flex flex-col gap-6">
      <BackLink href="/final-run" label="Volver a Final Run" />
      <div>
        <h1 className="text-navy text-2xl font-semibold">Nueva Final Run</h1>
        <p className="text-text-muted mt-1 text-sm">
          Fijá la combinación de velocidad y potencia ya elegida para producción
          — esta primera ejecución arranca el grupo de calibración.
        </p>
      </div>
      <FinalRunForm candidatos={candidatos} />
    </div>
  );
}
