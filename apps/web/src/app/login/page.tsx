import { LoginForm } from "@/components/auth/login-form";

export default async function Login({ searchParams }: PageProps<"/login">) {
  const parametros = await searchParams;
  const next = parametros.next;
  const siguiente =
    typeof next === "string" && next.startsWith("/") ? next : "/";

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="text-center">
          <h1 className="text-navy text-2xl font-semibold">Laser Toolkit</h1>
          <p className="text-text-muted mt-1 text-sm">
            Entrá con tu email de trabajo.
          </p>
        </div>
        <LoginForm siguiente={siguiente} />
      </div>
    </div>
  );
}
