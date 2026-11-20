import { expect, test } from "bun:test"
import birds from "../src/birds.json"

test("every Bird Card has a unique, URL-safe ID", () => {
  const ids = birds.map(({ id }) => id)
  expect(new Set(ids).size).toBe(birds.length)
  for (const id of ids) {
    expect(id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  }
})
