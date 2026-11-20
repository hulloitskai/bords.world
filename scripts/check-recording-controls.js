import assert from "node:assert/strict"
import { chromium } from "playwright"

const url = new URL(
  "#greater-roadrunner",
  process.argv[2] ?? "http://127.0.0.1:5173"
)
const browser = await chromium.launch()

try {
  const page = await browser.newPage({
    viewport: { width: 320, height: 640 },
    isMobile: true,
    hasTouch: true,
  })
  page.setDefaultTimeout(5000)
  await page.goto(url.href)
  const row = page.getByRole("group", { name: "Greater Roadrunner recordings" })
  const call = (index, pressed) =>
    row.getByRole("button", { name: `Call ${index} of 2`, pressed })
  const skip = row.getByRole("button", { name: "Play next call recording" })
  const tooltip = (index) =>
    page
      .locator('[role="tooltip"][data-open]')
      .getByText(`Call ${index} of 2`, { exact: true })
  const slot = row.locator("[data-skip-visible]")
  const layout = () =>
    slot.evaluate((element) => ({
      width: parseFloat(getComputedStyle(element).paddingInlineEnd),
      rowDuration: getComputedStyle(element).transitionDuration,
      cutoutDuration: getComputedStyle(element, "::before").transitionDuration,
      cutoutProperty: getComputedStyle(element, "::before").transitionProperty,
    }))

  await call(1, false).waitFor()
  assert.equal(await skip.count(), 0)
  assert.equal((await layout()).width, 0)
  await page.locator("audio").evaluate((audio) => {
    audio.addEventListener(
      "playing",
      () => {
        audio.dataset.startedAt = performance.now()
      },
      { once: true }
    )
  })
  await call(1).tap()
  await call(1, true).waitFor()
  await tooltip(1).waitFor()
  await skip.waitFor()
  assert.equal((await layout()).rowDuration, (await layout()).cutoutDuration)

  const rapidToggle = await call(1).evaluate((button) => {
    const audio = document.querySelector("audio")
    button.click()
    const pausedAfterFirstClick = audio.paused
    button.click()
    return [pausedAfterFirstClick, audio.paused]
  })
  assert.deepEqual(rapidToggle, [true, false])
  await page.waitForFunction(
    () => document.querySelector("audio").readyState >= 3
  )
  await call(1, true).waitFor()

  let releaseRecording
  const recordingReady = new Promise((resolve) => {
    releaseRecording = resolve
  })
  await page.route(/greater_roadrunner-calls_2[^/]*\.mp3$/, async (route) => {
    await recordingReady
    await route.continue()
  })
  await call(1).focus()
  await page.keyboard.press("Tab")
  assert.equal(
    await skip.evaluate((button) => button === document.activeElement),
    true
  )
  await page.keyboard.press("Enter")
  await call(2, true).waitFor()
  await page.waitForFunction(() => {
    const startedAt = document.querySelector("audio").dataset.startedAt
    return performance.now() - startedAt >= 1700
  })
  await tooltip(1).waitFor({ state: "hidden" })
  assert.equal(await tooltip(2).count(), 0)
  assert.equal(
    await skip.evaluate((button) => button === document.activeElement),
    true
  )
  releaseRecording()
  await tooltip(2).waitFor()
  assert.equal(
    await skip.evaluate((button) => button === document.activeElement),
    true
  )

  for (const control of [
    ...(await row.getByRole("button").all()),
    row.getByRole("switch"),
  ]) {
    const box = await control.boundingBox()
    assert.ok(
      box && box.x >= 0 && box.x + box.width <= 320,
      JSON.stringify(box)
    )
  }
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth),
    320
  )

  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.keyboard.press("Space")
  await call(1, true).waitFor()
  await tooltip(1).waitFor()
  const reduced = await layout()
  assert.equal(reduced.width, 32)
  assert.equal(reduced.rowDuration, "0s")
  assert.equal(reduced.cutoutProperty, "opacity")
  await call(1).tap()
  await call(1, false).waitFor()
  assert.equal((await layout()).width, 0)
  assert.equal(await skip.count(), 0)

  const autoPlay = row.getByRole("switch")
  const player = page.locator("audio")
  const finishRecording = () =>
    player.evaluate((audio) => {
      const ended = new Promise((resolve) =>
        audio.addEventListener("ended", () => resolve(), { once: true })
      )
      audio.currentTime = audio.duration
      return ended
    })

  await page.emulateMedia({ reducedMotion: "no-preference" })
  await autoPlay.press("Space")
  await row.getByRole("button", { name: "Song", pressed: true }).waitFor()
  await finishRecording()
  await call(1, true).waitFor()
  await finishRecording()
  await call(2, true).waitFor()
  await finishRecording()
  await row
    .getByRole("button", { name: "Bill rattle", pressed: true })
    .waitFor()
  await finishRecording()

  const plover = page.getByRole("group", {
    name: "Tibetan Sand Plover recordings",
  })
  await plover.getByRole("button", { name: "Call", pressed: true }).waitFor()
  await plover.getByRole("switch").press("Space")
  await finishRecording()
  await plover.getByRole("button", { name: "Call", pressed: false }).waitFor()
  assert.equal(new URL(page.url()).hash, "#tibetan-sand-plover")

  await page.getByRole("button", { name: "Previous bird" }).press("Enter")
  await autoPlay.press("Space")
  await row.getByRole("button", { name: "Song", pressed: true }).waitFor()
  await page.getByRole("button", { name: "Next bird" }).press("Enter")
  await plover.getByRole("button", { name: "Call", pressed: true }).waitFor()

  console.log("Recording controls passed in Chromium at 320 px")
} finally {
  await browser.close()
}
