import "server-only";

import bcrypt from "bcryptjs";

// El PIN nunca se guarda en claro: solo su hash bcrypt.
const ROUNDS = 10;

export function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, ROUNDS);
}

export function verifyPin(pin: string, pinHash: string): Promise<boolean> {
  return bcrypt.compare(pin, pinHash);
}
