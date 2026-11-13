import { describe, expect, it } from "vitest";
import { PHASES } from "./phases";
import { closedUrns, openUrn } from "./urns";

describe("urnas", () => {
  it("solo hay una urna abierta en nominaciones y en votación", () => {
    expect(openUrn("NOMINATIONS")).toBe("NOMINATION");
    expect(openUrn("VOTING")).toBe("VOTE");
    for (const phase of PHASES.filter((p) => p !== "NOMINATIONS" && p !== "VOTING")) {
      expect(openUrn(phase)).toBeNull();
    }
  });

  it("al cerrar cada urna sus sobres pierden el nombre, y no antes", () => {
    expect(closedUrns("SETUP")).toEqual([]);
    expect(closedUrns("NOMINATIONS")).toEqual([]);
    expect(closedUrns("NOMINATIONS_CLOSED")).toEqual(["NOMINATION"]);
    expect(closedUrns("VOTING")).toEqual(["NOMINATION"]);
    expect(closedUrns("VOTING_CLOSED")).toEqual(["NOMINATION", "VOTE"]);
    expect(closedUrns("CEREMONY")).toEqual(["NOMINATION", "VOTE"]);
  });

  it("una urna nunca está abierta y cerrada a la vez", () => {
    for (const phase of PHASES) {
      const open = openUrn(phase);
      if (open) expect(closedUrns(phase)).not.toContain(open);
    }
  });
});
