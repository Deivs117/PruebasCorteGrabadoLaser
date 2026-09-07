"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Mail, RotateCcw, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CopyAnimado } from "@/components/ui/icons/copy-animado";
import { CircleCheckAnimado } from "@/components/ui/icons/circle-check-animado";
import { TriangleAlertAnimado } from "@/components/ui/icons/triangle-alert-animado";
import { Field, INPUT_CLASSES } from "@/components/ui/field";
import { iconButtonClasses } from "@/lib/button-styles";
import { crearUsuarioSchema, type CrearUsuarioForm } from "@/lib/admin-schema";
import type { CredencialGenerada, UsuarioAdmin } from "@/lib/admin-data";
import { tiempoRelativo } from "@/lib/tiempo-relativo";

interface AdminPanelProps {
  usuariosIniciales: UsuarioAdmin[];
}

interface RespuestaCredencial {
  ok: boolean;
  credencial?: CredencialGenerada;
  error?: string;
}

/** Banner con la contraseña recién generada -- se muestra una sola vez
 * (issue #117): no queda en ningún estado persistente, desaparece apenas
 * se cierra o se genera otra. Botón de copiar para no tener que
 * transcribirla a mano. */
function CredencialBanner({
  credencial,
  onCerrar,
}: {
  credencial: CredencialGenerada;
  onCerrar: () => void;
}) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(credencial.password);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // portapapeles no disponible (permiso denegado, contexto no seguro):
      // la contraseña sigue visible en pantalla para copiarla a mano.
    }
  }

  return (
    <Card accent="teal" className="flex flex-col gap-3 p-4">
      <div className="flex items-start gap-2">
        <CircleCheckAnimado className="text-teal mt-0.5 size-4 shrink-0" />
        <div className="flex-1">
          <p className="text-navy text-sm font-medium">
            Credencial para {credencial.email}
          </p>
          <p className="text-text-muted mt-0.5 text-xs">
            Se muestra una sola vez -- compartila por un canal seguro (Slack, en
            persona), nunca por acá de nuevo.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <code className="border-border bg-canvas text-navy flex-1 truncate rounded-[var(--radius-sm)] border px-3 py-2 font-mono text-sm">
          {credencial.password}
        </code>
        <button
          type="button"
          onClick={copiar}
          aria-label="Copiar contraseña"
          title="Copiar contraseña"
          className={iconButtonClasses()}
        >
          <CopyAnimado className="size-4" strokeWidth={1.75} />
        </button>
      </div>
      {copiado ? <p className="text-teal text-xs">Copiada.</p> : null}
      <Button
        variant="outline"
        size="sm"
        onClick={onCerrar}
        className="self-end"
      >
        Cerrar
      </Button>
    </Card>
  );
}

export function AdminPanel({ usuariosIniciales }: AdminPanelProps) {
  const router = useRouter();
  const [usuarios, setUsuarios] = useState(usuariosIniciales);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [credencial, setCredencial] = useState<CredencialGenerada | null>(null);
  const [reseteando, setReseteando] = useState<string | null>(null);

  async function crearUsuario(evento: React.FormEvent) {
    evento.preventDefault();
    setError("");

    const datos: CrearUsuarioForm = { email, password };
    const analisis = crearUsuarioSchema.safeParse(datos);
    if (!analisis.success) {
      setError(analisis.error.issues[0]?.message ?? "Datos inválidos.");
      return;
    }

    setEnviando(true);
    const respuesta = await fetch("/api/admin/usuarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(analisis.data),
    });
    const cuerpo: RespuestaCredencial = await respuesta.json();
    setEnviando(false);

    if (!cuerpo.ok || !cuerpo.credencial) {
      setError(cuerpo.error ?? "No se pudo crear la cuenta.");
      return;
    }

    setCredencial(cuerpo.credencial);
    setEmail("");
    setPassword("");
    router.refresh();
    setUsuarios((actuales) => [
      { email: cuerpo.credencial!.email, creadoEn: new Date().toISOString() },
      ...actuales,
    ]);
  }

  async function resetearPassword(emailUsuario: string) {
    setError("");
    setReseteando(emailUsuario);
    const respuesta = await fetch("/api/admin/usuarios/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: emailUsuario, password: "" }),
    });
    const cuerpo: RespuestaCredencial = await respuesta.json();
    setReseteando(null);

    if (!cuerpo.ok || !cuerpo.credencial) {
      setError(cuerpo.error ?? "No se pudo resetear la contraseña.");
      return;
    }
    setCredencial(cuerpo.credencial);
  }

  return (
    <div className="flex flex-col gap-6">
      {credencial ? (
        <CredencialBanner
          credencial={credencial}
          onCerrar={() => setCredencial(null)}
        />
      ) : null}

      <Card accent="blue" className="flex flex-col gap-4 p-5">
        <div className="flex items-center gap-2">
          <UserPlus className="text-blue size-4" strokeWidth={1.75} />
          <h2 className="text-navy text-base font-semibold">Cuenta nueva</h2>
        </div>
        <form
          onSubmit={crearUsuario}
          className="flex flex-col gap-4 sm:flex-row sm:items-end"
        >
          <Field label="Email de trabajo">
            {(id) => (
              <div className="relative">
                <Mail
                  className="text-text-muted pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
                  strokeWidth={1.75}
                />
                <input
                  id={id}
                  type="email"
                  placeholder="nombre@fluxsolutionscali.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`${INPUT_CLASSES} w-full pl-9 sm:w-72`}
                />
              </div>
            )}
          </Field>
          <Field
            label="Contraseña"
            hint="Opcional -- si se deja vacía, se genera una segura al azar."
          >
            {(id) => (
              <input
                id={id}
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`${INPUT_CLASSES} w-full sm:w-56`}
              />
            )}
          </Field>
          <Button type="submit" variant="primary" loading={enviando}>
            {enviando ? "Creando…" : "Crear cuenta"}
          </Button>
        </form>
        {error ? (
          <div
            role="alert"
            className="border-orange/30 bg-orange-soft flex items-start gap-2 rounded-[var(--radius-sm)] border p-3"
          >
            <TriangleAlertAnimado className="text-orange mt-0.5 size-4 shrink-0" />
            <p className="text-navy text-sm">{error}</p>
          </div>
        ) : null}
      </Card>

      <Card className="flex flex-col divide-y divide-[var(--color-border)] p-0">
        <div className="flex items-center gap-2 p-5">
          <KeyRound className="text-navy size-4" strokeWidth={1.75} />
          <h2 className="text-navy text-base font-semibold">
            Cuentas existentes
          </h2>
        </div>
        {usuarios.map((usuario) => (
          <div
            key={usuario.email}
            className="flex items-center justify-between gap-4 p-5"
          >
            <div className="min-w-0">
              <p className="text-navy truncate text-sm font-medium">
                {usuario.email}
              </p>
              <p className="text-text-muted text-xs">
                Alta {tiempoRelativo(usuario.creadoEn)}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              loading={reseteando === usuario.email}
              onClick={() => resetearPassword(usuario.email)}
            >
              <RotateCcw className="size-3.5" strokeWidth={1.75} />
              {reseteando === usuario.email
                ? "Reseteando…"
                : "Resetear contraseña"}
            </Button>
          </div>
        ))}
        {usuarios.length === 0 ? (
          <p className="text-text-muted p-5 text-sm">No hay cuentas todavía.</p>
        ) : null}
      </Card>
    </div>
  );
}
