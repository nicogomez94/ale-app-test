import assert from "node:assert/strict";
import test from "node:test";
import { nextBirthday } from "./clients.js";

test("nextBirthday reports today's birthday as zero days away", () => {
  const now = new Date(2026, 8, 1, 15, 30);
  const birthDate = new Date(Date.UTC(1990, 8, 1, 12));

  assert.equal(nextBirthday(birthDate, now).daysUntil, 0);
  assert.equal(nextBirthday(birthDate, now).age, 36);
});

test("nextBirthday includes birthdays exactly seven calendar days away", () => {
  const now = new Date(2026, 8, 1, 23, 50);
  const birthDate = new Date(Date.UTC(1990, 8, 8, 12));

  assert.equal(nextBirthday(birthDate, now).daysUntil, 7);
});
