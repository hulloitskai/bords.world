import { expect, test } from "bun:test"
import { nameTracks } from "./download-sounds.js"

test("numbers only selected tracks that share a filename stem", () => {
  const tracks = [
    { index: 1, label: "Calls" },
    { index: 3, label: "Flight Song" },
    { index: 5, label: "Calls" },
  ]

  expect(nameTracks("White-bellied Go-away-bird", tracks)).toEqual([
    { ...tracks[0], filename: "white_bellied_go_away_bird-calls_1.mp3" },
    { ...tracks[2], filename: "white_bellied_go_away_bird-calls_2.mp3" },
    { ...tracks[1], filename: "white_bellied_go_away_bird-flight_song.mp3" },
  ])
  expect(
    nameTracks("White-bellied Go-away-bird", [tracks[0]])[0].filename
  ).toBe("white_bellied_go_away_bird-calls.mp3")
})
