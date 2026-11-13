"use client";

import { type ReactNode, createContext, useContext, useEffect, useState } from "react";
import { type KeyPair, generateKeyPair } from "@/lib/crypto/keys";
import { DEMO_CANDIDATES } from "@/lib/demo/fixtures";

// Estado del demo. Vive solo en memoria (regla 7, aunque sean llaves de
// juguete): se mantiene al pasar de un paso a otro y se borra al recargar o
// al salir del demo. Nada se envía al servidor.

interface DemoState {
  /** Llaves de juguete generadas en este navegador; null mientras se generan. */
  keys: KeyPair | null;
  /** Apertura ficticia de la votación, para la cuenta regresiva de Nominados. */
  votingOpensAt: string | null;
  /** El nombre del grupo ficticio con el que entró el visitante, o null. */
  self: { id: string; name: string } | null;
  nominationSent: boolean;
  /** El voto sellado del visitante: se suma a la urna de la ceremonia del demo. */
  voteCiphertext: string | null;
  enter: (name: string) => void;
  leave: () => void;
  saveNomination: () => void;
  saveVote: (ciphertext: string) => void;
  reset: (part: "nomination" | "vote") => void;
}

const DemoContext = createContext<DemoState | null>(null);

const TWO_DAYS_MS = 2 * 24 * 3_600_000;

export function DemoProvider({ children }: { children: ReactNode }) {
  const [keys, setKeys] = useState<KeyPair | null>(null);
  const [votingOpensAt, setVotingOpensAt] = useState<string | null>(null);
  const [self, setSelf] = useState<DemoState["self"]>(null);
  const [nominationSent, setNominationSent] = useState(false);
  const [voteCiphertext, setVoteCiphertext] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- la hora se fija en el navegador, nunca en el prerender
    setVotingOpensAt(new Date(Date.now() + TWO_DAYS_MS).toISOString());
    void generateKeyPair().then((pair) => {
      if (!cancelled) setKeys(pair);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const state: DemoState = {
    keys,
    votingOpensAt,
    self,
    nominationSent,
    voteCiphertext,
    enter: (name) => {
      const person = DEMO_CANDIDATES.find((p) => p.name === name);
      if (!person) return;
      // Otro nombre = otra persona: empieza sin haber nominado ni votado.
      setSelf({ id: person.id, name: person.name });
      setNominationSent(false);
      setVoteCiphertext(null);
    },
    leave: () => {
      setSelf(null);
      setNominationSent(false);
      setVoteCiphertext(null);
    },
    saveNomination: () => setNominationSent(true),
    saveVote: setVoteCiphertext,
    reset: (part) => (part === "nomination" ? setNominationSent(false) : setVoteCiphertext(null)),
  };
  return <DemoContext.Provider value={state}>{children}</DemoContext.Provider>;
}

export function useDemo(): DemoState {
  const state = useContext(DemoContext);
  if (!state) throw new Error("useDemo se usa dentro de <DemoProvider>.");
  return state;
}
