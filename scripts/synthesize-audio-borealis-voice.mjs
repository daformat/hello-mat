// Makes the recording the audio borealis demo plays, and the word timings its
// captions are typed from.
//
//   node scripts/synthesize-audio-borealis-voice.mjs
//   BOREALIS_VOICE=Daniel node scripts/synthesize-audio-borealis-voice.mjs
//   BOREALIS_OUT_DIR=/tmp/takes node scripts/synthesize-audio-borealis-voice.mjs
//
// BOREALIS_OUT_DIR puts both files there instead of in the site, to compare
// a voice without touching the page.
//
// macOS only: the words are spoken by the system's own voice through `say`,
// one sentence at a time, trimmed of the silence `say` pads them with and
// laid end to end with a gap between them and a longer one at the end, so
// the loop has a breath in it. Needs ffmpeg on the PATH, and the voice: Ava
// (Premium) is a download, in System Settings under Accessibility, Spoken
// Content, System Voice, Manage Voices. `say -v '?'` lists what is there.
//
// A synthesized voice reads at an even pace, so each word's time is its share
// of its sentence's measured length by letters, with a little extra after a
// comma or a full stop. That is close enough for a caption that lands a word
// or two behind the voice, which is what the app's captions do too.
//
// To use a recording of your own instead: drop it in as voice.mp3, put the
// sentences in SENTENCES in the order they are said, and run this with
// BOREALIS_SKIP_SAY=1 so it only measures and writes the timings. The
// measuring then assumes the sentences are spoken with the same gaps.

import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = process.env.BOREALIS_OUT_DIR;
const MEDIA =
  OUT_DIR ??
  join(ROOT, "public", "media", "design-engineering", "audio-borealis");
const MANIFEST = OUT_DIR
  ? join(OUT_DIR, "voice-clip.json")
  : join(ROOT, "components", "AudioBorealisDemo", "voice-clip.json");

const VOICE = process.env.BOREALIS_VOICE ?? "Ava (Premium)";
/** Words a minute. The voice's own default is 175. */
const RATE = 170;
/** Seconds between sentences, and after the last one before the loop. */
const GAP = 0.75;
const TAIL = 1.6;
const SAMPLE_RATE = 22050;

const SENTENCES = [
  "Audio Borealis draws a sound reactive glow at the bottom of any HTML element.",
  "The glow sits under the words, and it rises with the voice.",
  "The low sounds sit in the middle, and the high ones spread out toward the edges.",
  "It slides along while a sound is heard, and it holds still during silence.",
  "And when there is no sound anymore, it gently goes away.",
  "Now available on GitHub and npm.",
];

const run = (file, args) =>
  execFileSync(file, args, { stdio: ["ignore", "pipe", "inherit"] })
    .toString()
    .trim();

const ffmpeg = (args) => run("ffmpeg", ["-y", "-loglevel", "error", ...args]);

const duration = (file) =>
  parseFloat(
    run("ffprobe", [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "csv=p=0",
      file,
    ])
  );

/** How long a word takes to say, relative to its neighbours. */
const weight = (word) => {
  const letters = word.replace(/[^\p{L}\p{N}']/gu, "").length;
  const pause = /[,.;:!?]$/.test(word) ? 1.6 : 0;
  return letters + 1.2 + pause;
};

const timings = (text, start, length) => {
  const words = text.split(" ");
  const total = words.reduce((sum, word) => sum + weight(word), 0);
  let before = 0;
  return words.map((word) => {
    const at = start + (length * before) / total;
    before += weight(word);
    return { word, at: Number(at.toFixed(3)) };
  });
};

const work = mkdtempSync(join(tmpdir(), "borealis-voice-"));
mkdirSync(MEDIA, { recursive: true });

const silence = (name, seconds) => {
  const file = join(work, `${name}.wav`);
  ffmpeg([
    "-f",
    "lavfi",
    "-i",
    `anullsrc=r=${SAMPLE_RATE}:cl=mono`,
    "-t",
    String(seconds),
    file,
  ]);
  return file;
};

const gap = silence("gap", GAP);
const tail = silence("tail", TAIL);

const parts = [];
const sentences = [];
let cursor = 0;
SENTENCES.forEach((text, index) => {
  const aiff = join(work, `s${index}.aiff`);
  const wav = join(work, `s${index}.wav`);
  run("say", ["-v", VOICE, "-r", String(RATE), "-o", aiff, text]);
  // The silence `say` pads both ends with, off: the timings are measured on
  // what is left, and the gaps between sentences are this script's own.
  ffmpeg([
    "-i",
    aiff,
    "-af",
    "silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.04," +
      "areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.06,areverse",
    "-ar",
    String(SAMPLE_RATE),
    "-ac",
    "1",
    wav,
  ]);
  const length = duration(wav);
  sentences.push({
    text,
    start: Number(cursor.toFixed(3)),
    end: Number((cursor + length).toFixed(3)),
    words: timings(text, cursor, length),
  });
  parts.push(wav, index < SENTENCES.length - 1 ? gap : tail);
  cursor += length + (index < SENTENCES.length - 1 ? GAP : TAIL);
});

const list = join(work, "list.txt");
writeFileSync(list, parts.map((file) => `file '${file}'`).join("\n") + "\n");
const mp3 = join(MEDIA, "voice.mp3");
ffmpeg([
  "-f",
  "concat",
  "-safe",
  "0",
  "-i",
  list,
  "-c:a",
  "libmp3lame",
  "-b:a",
  "64k",
  "-ar",
  String(SAMPLE_RATE),
  "-ac",
  "1",
  mp3,
]);

const manifest = {
  voice: VOICE,
  rate: RATE,
  duration: Number(duration(mp3).toFixed(3)),
  sentences,
};
writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + "\n");
rmSync(work, { recursive: true, force: true });

console.log(
  `voice.mp3: ${manifest.duration}s, ${VOICE} at ${RATE} wpm, ${sentences.length} sentences`
);
