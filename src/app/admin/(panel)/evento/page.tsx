import type { Metadata } from "next";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth/admin";
import { ADVANCE_MODE, getAdvanceBlockers } from "@/lib/event/phases";
import { getCurrentEvent, getPhaseContext, getRoomUrl } from "@/lib/event/queries";
import {
  canEditFinalistsCount,
  canEditMaxPrize,
  canEditSchedule,
  canEditStructure,
  canEditVoteRules,
  canEditWinnerPercent,
} from "@/lib/event/rules";
import { CreateEventForm } from "../../_components/CreateEventForm";
import { EventSettingsForm } from "../../_components/EventSettingsForm";
import { NotaryStatus } from "../../_components/NotaryStatus";
import { PanelLoading } from "../../_components/PanelLoading";
import { PhaseControl } from "../../_components/PhaseControl";
import { RoomShare } from "../../_components/RoomShare";
import { ScheduleForm } from "../../_components/ScheduleForm";
import { SectionCard } from "../../_components/SectionCard";

export const metadata: Metadata = { title: "Evento" };

export default function EventPage() {
  return (
    <Suspense fallback={<PanelLoading />}>
      <EventPanel />
    </Suspense>
  );
}

async function EventPanel() {
  await requireAdmin();
  const event = await getCurrentEvent();

  if (!event) {
    return (
      <SectionCard
        id="crear-evento"
        title="Crea el evento"
        description="Primero el nombre; después podrás agregar categorías, compartir el link de la sala y avanzar las fases."
      >
        <CreateEventForm />
      </SectionCard>
    );
  }

  const [context, roomUrl] = await Promise.all([getPhaseContext(event), getRoomUrl(event.roomCode)]);
  const blockers = ADVANCE_MODE[event.phase] === "button" ? getAdvanceBlockers(context) : [];

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-sm text-muted">Evento</p>
        <h1 className="font-display text-3xl font-semibold sm:text-4xl">{event.name}</h1>
      </div>

      <SectionCard id="fase" title="Fase del evento">
        <PhaseControl phase={event.phase} blockers={blockers} />
      </SectionCard>

      <SectionCard id="notario" title="Notario">
        <NotaryStatus event={event} />
      </SectionCard>

      <SectionCard id="sala" title="Link de la sala">
        <RoomShare roomCode={event.roomCode} url={roomUrl} />
      </SectionCard>

      <SectionCard id="datos" title="Datos del evento">
        <EventSettingsForm
          values={{
            name: event.name,
            capacity: event.capacity,
            minNominations: event.minNominations,
            maxNominations: event.maxNominations,
            finalistsPerCategory: event.finalistsPerCategory,
            maxPrizeCategories: event.maxPrizeCategories,
            showWinnerPercent: event.showWinnerPercent,
            allowNominationSkip: event.allowNominationSkip,
            allowVoteAbstention: event.allowVoteAbstention,
          }}
          editable={{
            structure: canEditStructure(event.phase),
            finalists: canEditFinalistsCount(event.phase),
            maxPrize: canEditMaxPrize(event.phase),
            winnerPercent: canEditWinnerPercent(event.phase),
            voteRules: canEditVoteRules(event.phase),
          }}
        />
      </SectionCard>

      <SectionCard id="horario" title="Horario de la votación">
        <ScheduleForm
          opensAt={event.votingOpensAt?.toISOString() ?? null}
          closesAt={event.votingClosesAt?.toISOString() ?? null}
          editable={canEditSchedule(event.phase)}
        />
      </SectionCard>
    </div>
  );
}
