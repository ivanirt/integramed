import assert from "node:assert/strict";
import test from "node:test";
import {
  assertValidPractitionerHours,
  DEFAULT_HOURS,
  loadPractitionerHours,
  savePractitionerHours,
} from "../src/lib/clinic-config.ts";

test("loadPractitionerHours rejects a blank practitioner id", async () => {
  await assert.rejects(() => loadPractitionerHours(""), /identificador del profesional/);
  await assert.rejects(() => loadPractitionerHours("   "), /identificador del profesional/);
  await assert.rejects(() => loadPractitionerHours(undefined), /identificador del profesional/);
});

test("savePractitionerHours rejects an invalid schedule", async () => {
  const valid = structuredClone(DEFAULT_HOURS);
  assert.doesNotThrow(() => assertValidPractitionerHours(valid));

  const cases = [
    [{ ...valid, slotDurationMinutes: 0 }, /entre 5 y 240/],
    [{ ...valid, slotDurationMinutes: 4 }, /entre 5 y 240/],
    [{ ...valid, slotDurationMinutes: 241 }, /entre 5 y 240/],
    [{ ...valid, slotDurationMinutes: 30.5 }, /entre 5 y 240/],
    [{ ...valid, days: { ...valid.days, 7: { enabled: true, start: "09:00", end: "10:00" } } }, /siete días/],
    [{ ...valid, days: { 1: valid.days[1] } }, /siete días/],
    [
      {
        ...valid,
        days: { ...valid.days, 1: { enabled: true, start: "9:00", end: "18:00" } },
      },
      /HH:MM/,
    ],
    [
      {
        ...valid,
        days: { ...valid.days, 1: { enabled: true, start: "18:00", end: "08:00" } },
      },
      /anterior a la de cierre/,
    ],
    [
      {
        ...valid,
        days: { ...valid.days, 1: { enabled: true, start: "08:00", end: "08:00" } },
      },
      /anterior a la de cierre/,
    ],
    [
      {
        ...valid,
        days: { ...valid.days, 0: { enabled: false, start: "13:00", end: "09:00" } },
      },
      /anterior a la de cierre/,
    ],
    [{ slotDurationMinutes: 30 }, /no es válido/],
  ];

  for (const [hours, pattern] of cases) {
    await assert.rejects(
      () => savePractitionerHours({ practitionerId: "prac-doc", practitionerName: "Ada", hours }),
      pattern,
    );
  }
});
