// Makes the recording the audio borealis demo plays, and the word timings its
// captions are typed from.
//
//   ELEVENLABS_API_KEY=… node scripts/synthesize-audio-borealis-voice.mjs
//   ELEVENLABS_VOICE_ID=… ELEVENLABS_API_KEY=… node scripts/synthesize-audio-borealis-voice.mjs
//   BOREALIS_ENGINE=say node scripts/synthesize-audio-borealis-voice.mjs
//   BOREALIS_ENGINE=say BOREALIS_VOICE=Daniel node scripts/synthesize-audio-borealis-voice.mjs
//   BOREALIS_OUT_DIR=/tmp/takes node scripts/synthesize-audio-borealis-voice.mjs
//
// BOREALIS_OUT_DIR puts both files there instead of in the site, to compare
// a voice without touching the page.
//
// One sentence at a time, laid end to end with a gap between them and a
// longer one at the end, so the loop has a breath in it. Needs ffmpeg on the
// PATH.
//
// By default the sentences are spoken by ElevenLabs, the same voice as the
// Subtitles site's demos, through its with-timestamps endpoint: the audio
// and the start of every character in it, so each word's time is where the
// voice actually says it. The key is read from ELEVENLABS_API_KEY and never
// written anywhere. Each sentence is kept in node_modules/.cache/borealis-voice
// by its text and voice, so a run that only moves the gaps, or that is run
// again, asks ElevenLabs for nothing; a new sentence or voice is billed, by
// the character, about 380 for the lot.
//
// BOREALIS_ENGINE=say uses the Mac's own voice through `say` instead, trimmed
// of the silence `say` pads it with: Ava (Premium) is a download, in System
// Settings under Accessibility, Spoken Content, System Voice, Manage Voices,
// and `say -v '?'` lists what is there. A synthesized voice reads at an even
// pace, so there each word's time is its share of its sentence's measured
// length by letters, with a little extra after a comma or a full stop.
//
// To use a recording of your own instead: drop it in as voice.mp3, put the
// sentences in SENTENCES in the order they are said, and run this with
// BOREALIS_SKIP_SAY=1 so it only measures and writes the timings. The
// measuring then assumes the sentences are spoken with the same gaps.

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
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

const ENGINE = process.env.BOREALIS_ENGINE ?? "elevenlabs";
if (ENGINE !== "elevenlabs" && ENGINE !== "say") {
  throw new Error(`BOREALIS_ENGINE is elevenlabs or say, not ${ENGINE}`);
}
const ELEVEN = ENGINE === "elevenlabs";

/** ElevenLabs: the Subtitles site's voice, and the model. */
const ELEVEN_VOICE = process.env.ELEVENLABS_VOICE_ID ?? "EXAVITQu4vr4xnSDxMaL";
const ELEVEN_MODEL = "eleven_multilingual_v2";
const CACHE = join(ROOT, "node_modules", ".cache", "borealis-voice");

const VOICE = ELEVEN
  ? `ElevenLabs ${ELEVEN_VOICE}`
  : process.env.BOREALIS_VOICE ?? "Ava (Premium)";
/** Words a minute, for `say`. The voice's own default is 175. */
const RATE = 170;
/** Seconds between sentences, and after the last one before the loop. */
const GAP = 0.75;
const TAIL = 1.6;
/** ElevenLabs delivers 44.1 kHz and deserves to keep it; `say`, 22 kHz. */
const SAMPLE_RATE = ELEVEN ? 44100 : 22050;
const BITRATE = ELEVEN ? "96k" : "64k";

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

/**
 * One sentence from ElevenLabs, from the cache when it has been asked for
 * before: the mp3 and the start time, in seconds, of each of its characters.
 */
const elevenSentence = async (text) => {
  mkdirSync(CACHE, { recursive: true });
  const key = createHash("sha1")
    .update(`${ELEVEN_VOICE}\n${ELEVEN_MODEL}\n${text}`)
    .digest("hex")
    .slice(0, 16);
  const mp3 = join(CACHE, `${key}.mp3`);
  const json = join(CACHE, `${key}.json`);
  if (!existsSync(mp3) || !existsSync(json)) {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      throw new Error(
        `ELEVENLABS_API_KEY is not set, and "${text}" has not been made yet`
      );
    }
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${ELEVEN_VOICE}/with-timestamps`,
      {
        method: "POST",
        headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({ text, model_id: ELEVEN_MODEL }),
      }
    );
    if (!res.ok) {
      throw new Error(`ElevenLabs ${res.status}: ${await res.text()}`);
    }
    const body = await res.json();
    writeFileSync(mp3, Buffer.from(body.audio_base64, "base64"));
    writeFileSync(json, JSON.stringify(body.alignment));
  }
  return { mp3, alignment: JSON.parse(readFileSync(json, "utf8")) };
};

/**
 * Each word's time from the characters' own: a word starts where its first
 * character does, shifted by `start` in the recording and by `lead`, the
 * silence cut from the clip's front. Falls back to the even-pace estimate
 * if the characters returned are not the text sent.
 */
const alignedTimings = (text, alignment, start, lead, length) => {
  if (alignment.characters.join("") !== text) {
    return timings(text, start, length);
  }
  const times = alignment.character_start_times_seconds;
  let at = 0;
  return text.split(" ").map((word) => {
    const t = Math.max(0, times[at] - lead);
    at += word.length + 1;
    return { word, at: Number((start + t).toFixed(3)) };
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

// The silence a clip is padded with at its end, off, so the gaps between
// sentences are this script's own. The front is cut apart, by a known
// amount, so the timings can be shifted by it.
const TRIM_END =
  "areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.06,areverse";

const parts = [];
const sentences = [];
let cursor = 0;
for (const [index, text] of SENTENCES.entries()) {
  const wav = join(work, `s${index}.wav`);
  let words;
  if (ELEVEN) {
    const { mp3, alignment } = await elevenSentence(text);
    // Up to the first character, less a breath of 40 ms, is silence.
    const lead = Math.max(0, alignment.character_start_times_seconds[0] - 0.04);
    ffmpeg([
      "-i",
      mp3,
      "-af",
      `atrim=start=${lead.toFixed(3)},asetpts=PTS-STARTPTS,${TRIM_END}`,
      "-ar",
      String(SAMPLE_RATE),
      "-ac",
      "1",
      wav,
    ]);
    words = (length) => alignedTimings(text, alignment, cursor, lead, length);
  } else {
    const aiff = join(work, `s${index}.aiff`);
    run("say", ["-v", VOICE, "-r", String(RATE), "-o", aiff, text]);
    // The silence `say` pads both ends with, off: the timings are measured
    // on what is left.
    ffmpeg([
      "-i",
      aiff,
      "-af",
      `silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.04,${TRIM_END}`,
      "-ar",
      String(SAMPLE_RATE),
      "-ac",
      "1",
      wav,
    ]);
    words = (length) => timings(text, cursor, length);
  }
  const length = duration(wav);
  sentences.push({
    text,
    start: Number(cursor.toFixed(3)),
    end: Number((cursor + length).toFixed(3)),
    words: words(length),
  });
  parts.push(wav, index < SENTENCES.length - 1 ? gap : tail);
  cursor += length + (index < SENTENCES.length - 1 ? GAP : TAIL);
}

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
  BITRATE,
  "-ar",
  String(SAMPLE_RATE),
  "-ac",
  "1",
  mp3,
]);

const manifest = {
  voice: VOICE,
  rate: ELEVEN ? null : RATE,
  duration: Number(duration(mp3).toFixed(3)),
  sentences,
};
writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + "\n");
rmSync(work, { recursive: true, force: true });

console.log(
  `voice.mp3: ${manifest.duration}s, ${VOICE}${ELEVEN ? "" : ` at ${RATE} wpm`}, ${sentences.length} sentences`
);
