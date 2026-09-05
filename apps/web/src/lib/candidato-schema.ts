import { z } from "zod";

export const marcarCandidatoSchema = z.object({
  id: z.string().min(1),
  corridaId: z.string().min(1),
  idPrueba: z.string().min(1),
  archivo: z.string().min(1),
  material: z.string().min(1),
  espesorMm: z.string().min(1),
  operacion: z.enum(["corte", "grabado"]),
  velocidadMmMin: z.string().min(1),
  potenciaPct: z.string().min(1),
});

export type MarcarCandidatoData = z.infer<typeof marcarCandidatoSchema>;
