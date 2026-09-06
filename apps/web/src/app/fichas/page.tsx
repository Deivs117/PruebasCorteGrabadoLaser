import Link from "next/link";
import { FileBadge } from "lucide-react";
import { AyudaLink } from "@/components/ui/ayuda-link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
import { listarFichas } from "@/lib/fichas-data";

// Nuevas fichas se crean en cualquier momento, así que este listado no se
// puede congelar como estático en el build.
export const dynamic = "force-dynamic";

export default async function FichasDeParametro() {
  const fichas = await listarFichas();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-navy text-2xl font-semibold">
            Fichas de Parámetro Estándar
          </h1>
          <p className="text-text-muted mt-1 text-sm">
            Las &quot;recetas&quot; oficiales por material, espesor y operación,
            respaldadas por un Final Run calibrado.
          </p>
          <AyudaLink seccion="fichas" />
        </div>
        <LinkButton href="/fichas/nueva" variant="primary">
          Nueva Ficha
        </LinkButton>
      </div>

      {fichas.length === 0 ? (
        <Reveal>
          <EmptyState
            icon={FileBadge}
            title="Todavía no hay ninguna Ficha publicada"
            description="Una Ficha certifica un grupo de calibración como la combinación oficial de producción para ese material, espesor y operación."
            action={
              <LinkButton href="/fichas/nueva" variant="primary">
                Crear la primera Ficha
              </LinkButton>
            }
          />
        </Reveal>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {fichas.map((ficha, indice) => (
            <Reveal key={ficha.grupoId} delayMs={indice * 40}>
              <Link href={`/fichas/${encodeURIComponent(ficha.grupoId)}`}>
                <Card
                  accent={ficha.operacion === "corte" ? "blue" : "purple"}
                  className="flex flex-col gap-3 p-5 shadow-sm transition-shadow duration-[var(--duration-quick)] ease-[var(--ease-motion)] hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-navy text-base font-semibold">
                        {ficha.material}
                      </p>
                      <p className="text-text-muted text-sm capitalize">
                        {ficha.operacion} · {ficha.espesorMm}mm
                      </p>
                    </div>
                    <Badge
                      tone={ficha.estado === "oficial" ? "ok" : "pendiente"}
                    >
                      {ficha.estado === "oficial" ? "Oficial" : "En revisión"}
                    </Badge>
                  </div>
                  <p className="text-navy font-mono text-lg font-medium">
                    {ficha.velocidadMmMin} mm/min · {ficha.potenciaPct}%
                  </p>
                  <p className="text-text-muted font-mono text-xs">
                    Grupo {ficha.grupoId}
                  </p>
                </Card>
              </Link>
            </Reveal>
          ))}
        </div>
      )}
    </div>
  );
}
