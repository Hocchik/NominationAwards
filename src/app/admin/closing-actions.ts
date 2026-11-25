"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";
import { getCurrentEvent } from "@/lib/event/queries";
import { MAX_FINALISTS } from "@/lib/event/rules";
import { unlinkClosedUrns } from "@/lib/event/transition";

// Cierre de nominaciones (CLAUDE.md §3, paso 3). Antes de tocar este archivo,
// releer la sección 4: el servidor entrega papeletas cifradas y recibe SOLO
// finalistas. Nunca conteos, nunca papeletas abiertas.

export async function getNominationBallotsAction(): Promise<
  { ok: true; ciphertexts: string[] } | { ok: false; message: string }
> {
  await requireAdmin();
  const event = await getCurrentEvent();
  if (!event || event.phase !== "NOMINATIONS_CLOSED") {
    return { ok: false, message: "Las nominaciones todavía no están cerradas." };
  }
  // Antes de entregarlos para abrirlos, ningún sobre puede llevar nombre
  // (regla 2): ya se arrancaron al cerrar; esto es solo una red de seguridad.
  await unlinkClosedUrns(prisma, event.id, event.phase);
  // Orden por id (UUID aleatorio), nunca por orden de llegada (regla 9).
  const ballots = await prisma.ballot.findMany({
    where: { eventId: event.id, phase: "NOMINATION" },
    select: { ciphertext: true },
    orderBy: { id: "asc" },
  });
  return { ok: true, ciphertexts: ballots.map((b) => b.ciphertext) };
}

const finalistsSchema = z
  .array(
    z.object({
      categoryId: z.string().min(1),
      finalists: z
        .array(
          z.object({
            name: z.string().trim().min(1).max(200),
            participantId: z.string().min(1).nullable(),
            partnerParticipantId: z.string().min(1).nullable().default(null),
            optionId: z.string().min(1).nullable().default(null),
          }),
        )
        .max(MAX_FINALISTS, `Máximo ${MAX_FINALISTS} finalistas por categoría.`),
    }),
  )
  .max(100);

export async function saveFinalistsAction(
  input: z.input<typeof finalistsSchema>,
): Promise<{ ok: boolean; message?: string }> {
  await requireAdmin();
  const event = await getCurrentEvent();
  if (!event || event.phase !== "NOMINATIONS_CLOSED") {
    return { ok: false, message: "El evento no está en el cierre de nominaciones." };
  }
  const parsed = finalistsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Los finalistas no tienen el formato esperado." };

  const [categories, participants] = await Promise.all([
    prisma.category.findMany({
      where: { eventId: event.id },
      select: { id: true, options: { select: { id: true, photoUrl: true, blurb: true } } },
    }),
    prisma.participant.findMany({ where: { eventId: event.id }, select: { id: true } }),
  ]);
  const optionsByCategory = new Map(categories.map((c) => [c.id, new Map(c.options.map((o) => [o.id, o]))]));
  const participantIds = new Set(participants.map((p) => p.id));
  for (const group of parsed.data) {
    const options = optionsByCategory.get(group.categoryId);
    if (!options) return { ok: false, message: "Hay una categoría desconocida." };
    for (const f of group.finalists) {
      const people = [f.participantId, f.partnerParticipantId].filter((id): id is string => Boolean(id));
      if (people.some((id) => !participantIds.has(id))) {
        return { ok: false, message: "Hay un finalista que no es del grupo." };
      }
      if (f.optionId && !options.has(f.optionId)) return { ok: false, message: "Hay una opción desconocida." };
    }
  }

  // Se guardan en orden alfabético: el orden de inserción no debe insinuar
  // quién tuvo más nominaciones. Las opciones llevan su foto y su detalle.
  const rows = parsed.data.flatMap((group) =>
    [...group.finalists]
      .sort((a, b) => a.name.localeCompare(b.name, "es"))
      .map((f) => {
        const option = f.optionId ? optionsByCategory.get(group.categoryId)?.get(f.optionId) : undefined;
        return {
          categoryId: group.categoryId,
          displayName: f.name,
          participantId: f.participantId,
          partnerParticipantId: f.partnerParticipantId,
          optionId: f.optionId,
          photoUrl: option?.photoUrl ?? null,
          blurb: option?.blurb ?? null,
        };
      }),
  );

  try {
    await prisma.$transaction(async (tx) => {
      const moved = await tx.event.updateMany({
        where: { id: event.id, phase: "NOMINATIONS_CLOSED" },
        data: { phase: "FINALISTS_READY" },
      });
      if (moved.count !== 1) throw new Error("phase-changed");
      await unlinkClosedUrns(tx, event.id, "FINALISTS_READY");
      await tx.finalist.deleteMany({ where: { category: { eventId: event.id } } });
      if (rows.length) await tx.finalist.createMany({ data: rows });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "phase-changed") {
      return { ok: false, message: "Los finalistas ya se guardaron desde otra pestaña." };
    }
    throw error;
  }
  refresh();
  return { ok: true };
}
