"use client";

import { type ReactNode, createContext, useContext, useEffect, useState } from "react";
import { type KeyPair, generateKeyPair } from "@/lib/crypto/keys";

// Estado del demo. Vive solo en memoria (regla 7, aunque sean llaves de
// juguete): se mantiene al pasar de un paso a otro y se borra al recargar o
// al salir del demo. Nada se envía al servidor.

export interface DemoVote {
  receipt: string;
  /** El voto sellado: se suma a la urna de la ceremonia del demo. */
  ciphertext: string;
}

interface DemoState {
  /** Llaves de juguete generadas en este navegador; null mientras se generan. */
  keys: KeyPair | null;
  /** Apertura ficticia de la votación, para la cuenta regresiva de Nominados. */
  votingOpensAt: string | null;
  nominationReceipt: string | null;
  vote: DemoVote | null;
  saveNomination: (receipt: string) => void;
  saveVote: (vote: DemoVote) => void;
  reset: (part: "nomination" | "vote") => void;
}

const DemoContext = createContext<DemoState | null>(null);

const TWO_DAYS_MS = 2 * 24 * 3_600_000;

export function DemoProvider({ children }: { children: ReactNode }) {
  const [keys, setKeys] = useState<KeyPair | null>(null);
  const [votingOpensAt, setVotingOpensAt] = useState<string | null>(null);
  const [nominationReceipt, setNominationReceipt] = useState<string | null>(null);
  const [vote, setVote] = useState<DemoVote | null>(null);

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
    nominationReceipt,
    vote,
    saveNomination: setNominationReceipt,
    saveVote: setVote,
    reset: (part) => (part === "nomination" ? setNominationReceipt(null) : setVote(null)),
  };
  return <DemoContext.Provider value={state}>{children}</DemoContext.Provider>;
}

export function useDemo(): DemoState {
  const state = useContext(DemoContext);
  if (!state) throw new Error("useDemo se usa dentro de <DemoProvider>.");
  return state;
}
