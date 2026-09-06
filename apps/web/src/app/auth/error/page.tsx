import { LinkButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TriangleAlertAnimado } from "@/components/ui/icons/triangle-alert-animado";

export default function ErrorAuth() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card
        accent="orange"
        className="flex w-full max-w-sm flex-col items-start gap-4 p-6"
      >
        <span
          className="bg-orange-soft text-orange flex size-12 items-center justify-center rounded-full"
          aria-hidden="true"
        >
          <TriangleAlertAnimado className="size-6" strokeWidth={1.75} />
        </span>
        <div>
          <p className="text-navy text-base font-semibold">
            El link ya no es válido
          </p>
          <p className="text-text-muted mt-1 text-sm">
            Puede que haya vencido o que ya se haya usado — pedí uno nuevo.
          </p>
        </div>
        <LinkButton href="/login" variant="primary">
          Volver a intentar
        </LinkButton>
      </Card>
    </div>
  );
}
