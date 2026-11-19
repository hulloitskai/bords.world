import { isCancel, log, multiselect } from "@clack/prompts";
import { link, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { chromium } from "playwright";

const usage =
  'Usage: bun run download-sounds "https://ebird.org/species/<code>"';
const sounds = join(import.meta.dir, "..", "src", "assets", "sounds");

function snakeCase(text) {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/[^\p{L}\p{N}]+/gu, "_")
    .replace(/^_|_$/g, "");
}

export function nameTracks(bird, tracks) {
  return [...Map.groupBy(tracks, (track) => snakeCase(track.label))].flatMap(
    ([label, group]) =>
      group.map((track, index) => ({
        ...track,
        filename: `${snakeCase(bird)}-${label}${group.length > 1 ? `_${index + 1}` : ""}.mp3`,
      })),
  );
}

async function downloadSounds(args) {
  const url = URL.parse(args[0] ?? "");
  if (
    args.length !== 1 ||
    url?.origin !== "https://ebird.org" ||
    url.username ||
    url.password ||
    !/^\/species\/[a-z0-9]+\/?$/i.test(url.pathname)
  ) {
    throw new Error(usage);
  }

  const browser = await chromium.launch({ channel: "chrome", headless: false });
  try {
    const page = await browser.newPage({ locale: "en-US" });
    const chrome = await page.context().newCDPSession(page);
    const { windowId } = await chrome.send("Browser.getWindowForTarget");
    await chrome.send("Browser.setWindowBounds", {
      windowId,
      bounds: { windowState: "minimized" },
    });
    await chrome.detach();
    const response = await page.goto(url.href, {
      waitUntil: "domcontentloaded",
    });
    if (!response?.ok())
      throw new Error(`eBird returned HTTP ${response?.status()}.`);

    const listen = page
      .getByRole("button", { name: "Listen", exact: true })
      .or(page.getByRole("link", { name: "Listen", exact: true }));
    await listen.click({ timeout: 30_000 }).catch(() => {
      throw new Error(
        "Could not open Listen. Check whether the species has audio or eBird is asking for verification.",
      );
    });

    const playlist = page.getByRole("dialog");
    const bird = (
      await playlist.getByRole("heading", { level: 1 }).innerText()
    ).trim();
    const buttons = playlist.locator(".Playlist-tracks button");
    const labels = await buttons.evaluateAll((elements) =>
      elements.map((button) =>
        [...button.childNodes]
          .filter((node) => node.nodeType === Node.TEXT_NODE)
          .map((node) => node.textContent)
          .join("")
          .trim(),
      ),
    );
    if (
      !snakeCase(bird) ||
      !labels.length ||
      labels.some((label) => !snakeCase(label))
    ) {
      throw new Error(
        "Could not read the species name and track labels from the Listen dialog.",
      );
    }

    const selection = await multiselect({
      message: `Select tracks for ${bird}`,
      options: labels.map((label, index) => ({
        value: index,
        label: `${index + 1}. ${label}`,
      })),
      required: true,
    });
    if (isCancel(selection)) return;

    const tracks = labels.flatMap((label, index) =>
      selection.includes(index) ? [{ label, index }] : [],
    );
    await mkdir(sounds, { recursive: true });
    const scratch = await mkdtemp(join(sounds, ".download-"));
    try {
      for (const { index, filename } of nameTracks(bird, tracks)) {
        await buttons.nth(index).click();
        const source = await playlist
          .locator(".SpectrogramPlayer-frame audio[src]")
          .getAttribute("src");
        const audioUrl = URL.parse(source ?? "", page.url());
        if (!source || audioUrl?.protocol !== "https:")
          throw new Error(`Missing audio URL for track ${index + 1}.`);

        const audio = await page.request.get(audioUrl.href);
        if (
          audio.status() !== 200 ||
          !/^audio\/(mpeg3?|mp3)\b/i.test(audio.headers()["content-type"] ?? "")
        ) {
          throw new Error(
            `Track ${index + 1} did not return an MP3 (HTTP ${audio.status()}).`,
          );
        }
        const bytes = await audio.body();
        if (!bytes.length)
          throw new Error(`Track ${index + 1} returned empty audio.`);
        await audio.dispose();

        const temporary = join(scratch, filename);
        const destination = join(sounds, filename);
        await writeFile(temporary, bytes);
        // Publish the finished file atomically and fail if the destination already exists.
        await link(temporary, destination);
        log.success(`Saved ${relative(process.cwd(), destination)}`);
      }
    } finally {
      await rm(scratch, { recursive: true, force: true });
    }
  } finally {
    await browser.close();
  }
}

if (import.meta.main) {
  try {
    await downloadSounds(process.argv.slice(2));
  } catch (error) {
    log.error(error.message);
    process.exitCode = 1;
  }
}
