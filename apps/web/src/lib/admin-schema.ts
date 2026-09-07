import { z } from "zod";

/** Espejo de `restringir_dominio_signup` (trigger de Postgres, #23): se
 * valida acá también solo para dar feedback inmediato en el formulario --
 * la garantía real sigue siendo el trigger, este chequeo del lado del
 * cliente nunca es la última palabra. */
const DOMINIO = "@fluxsolutionscali.com";

const emailDominio = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Ingresá el email.")
  .refine((v) => v.endsWith(DOMINIO), {
    message: `Tiene que ser un email ${DOMINIO}.`,
  });

/** La contraseña es opcional en ambos formularios (#117): en blanco, el
 * backend genera una segura al azar -- si se elige una a mano, que sea
 * razonable. */
const passwordOpcional = z.string().refine((v) => v === "" || v.length >= 8, {
  message: "La contraseña tiene que tener al menos 8 caracteres.",
});

export const crearUsuarioSchema = z.object({
  email: emailDominio,
  password: passwordOpcional,
});
export type CrearUsuarioForm = z.infer<typeof crearUsuarioSchema>;

export const resetearPasswordSchema = z.object({
  email: z.string().trim().min(1),
  password: passwordOpcional,
});
export type ResetearPasswordForm = z.infer<typeof resetearPasswordSchema>;

/** Cambio de la contraseña propia (cualquier usuario, #117) -- acá sí es
 * obligatoria, y se confirma dos veces para no tipear un error a ciegas. */
export const cambiarPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "La contraseña tiene que tener al menos 8 caracteres."),
    confirmacion: z.string(),
  })
  .refine((v) => v.password === v.confirmacion, {
    message: "Las contraseñas no coinciden.",
    path: ["confirmacion"],
  });
export type CambiarPasswordForm = z.infer<typeof cambiarPasswordSchema>;
