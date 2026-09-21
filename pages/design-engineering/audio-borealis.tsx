import { GetStaticProps } from "next";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { codeToHtml } from "shiki";

import { AudioBorealisDemo } from "@/components/AudioBorealisDemo/AudioBorealisDemo";
import { CodeBlock } from "@/components/CodeBlock/CodeBlock";
import { ArticleDates } from "@/components/Navigation/ArticleDates";
import { PrevNextNavigation } from "@/components/Navigation/PrevNextNavigation";
import { ComponentPageMetas } from "@/components/PageMetas/ComponentPageMetas";
import { TableOfContents } from "@/components/TableOfContents/TocComponent";
import { Tabs } from "@/components/Tabs/Tabs";
import { ComponentId } from "@/constants/design-engineering/components";
import styles from "@/styles/AudioBorealis.module.scss";

const componentId: ComponentId = "audio-borealis";

interface CodeBlocks {
  usage: string;
  installNpm: string;
  installYarn: string;
  installPnpm: string;
  installBun: string;
  installDeno: string;
}

const USAGE = `
import {
  attachBorealis,
  createMicrophoneSource,
  createMockVoice,
} from "@daformat/audio-borealis";

// A caption box, spoken to by a voice that is not there
const voice = createMockVoice();
const glow = attachBorealis(box, {
  look: "rainbow", // or northernLights, autumn, monochromeHaze, or your own
  strength: "medium", // or strong, subtle, or an opacity in 0..1
  source: (dt) => voice.read(dt, isSomeoneTalking()),
});

glow.setLook("northernLights");
glow.configure({ flow: 120, idle: 0.3 });

// Or the real thing, from a click, since the browser will ask
const mic = await createMicrophoneSource();
glow.setSource(() => mic.read());

// Or levels you already have, pushed as they come
glow.feed({ loudness: 0.08, bands: [0.9, 0.6, 0.4, 0.2, 0.1] });

glow.destroy();
`.trim();

const PACKAGE = "@daformat/audio-borealis";

const INSTALL = {
  npm: `npm install ${PACKAGE}`,
  yarn: `yarn add ${PACKAGE}`,
  pnpm: `pnpm add ${PACKAGE}`,
  bun: `bun add ${PACKAGE}`,
  deno: `deno add npm:${PACKAGE}`,
};

export const getStaticProps: GetStaticProps<CodeBlocks> = async () => {
  const themes = { light: "vitesse-light", dark: "houston" } as const;
  const ts = { lang: "ts", themes, tabindex: false } as const;
  const bash = { lang: "bash", themes, tabindex: false } as const;

  const [usage, installNpm, installYarn, installPnpm, installBun, installDeno] =
    await Promise.all([
      codeToHtml(USAGE, ts),
      codeToHtml(INSTALL.npm, bash),
      codeToHtml(INSTALL.yarn, bash),
      codeToHtml(INSTALL.pnpm, bash),
      codeToHtml(INSTALL.bun, bash),
      codeToHtml(INSTALL.deno, bash),
    ]);

  return {
    props: {
      usage,
      installNpm,
      installYarn,
      installPnpm,
      installBun,
      installDeno,
    },
  };
};

const AudioBorealisPage = (props: CodeBlocks) => {
  return (
    <>
      <ComponentPageMetas componentId={componentId} />
      <TableOfContents.Provider>
        <AudioBorealisPageContent {...props} />
      </TableOfContents.Provider>
    </>
  );
};

const AudioBorealisPageContent = (props: CodeBlocks) => {
  const tocContext = TableOfContents.useToc();
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contentRef.current) {
      tocContext.setRootElement(contentRef.current);
    }
  });

  return (
    <>
      <TableOfContents.Root />
      <div ref={contentRef} className={`prose page ${styles.borealis_page}`}>
        <Link href="/design-engineering" className="back_link">
          Back to gallery
        </Link>
        <h1 id="design-engineering-audio-borealis">
          Audio Borealis: sound in, light out.
        </h1>
        <ArticleDates componentId={componentId} />
        <p>
          Introducing{" "}
          <a
            href="https://github.com/daformat/audio-borealis"
            target="_blank"
            rel="noopener"
          >
            audio-borealis
          </a>
          , a small open source library with no dependencies that lays a glow
          along the bottom edge of any box and raises it with a voice. It paints
          with a 2D canvas calls every browser has, and it listens to whatever
          sound you have: a microphone, an audio element, or even mock data for
          product demos.
        </p>
        <p>
          It comes out of{" "}
          <a href="https://subtitles-live.com" target="_blank" rel="noopener">
            Subtitles Live
          </a>
          , a small Mac app of mine that captions whatever your Mac is playing
          in a box that floats over every window. This page is the
          library&rsquo;s demo and its manual.
        </p>

        <div className={styles.wide}>
          <AudioBorealisDemo.Provider>
            <AudioBorealisDemo.Bench>
              <AudioBorealisDemo.Toolbar />
              <AudioBorealisDemo.Stage />
              <h3 id="settings">Settings</h3>
              <p>
                Every number below is the app&rsquo;s values, grouped the way
                the code groups them, and they are live: drag one and the box
                above changes on the next frame.
              </p>
              <AudioBorealisDemo.Knobs />
            </AudioBorealisDemo.Bench>
          </AudioBorealisDemo.Provider>

          <h2 id="take-it-with-you">Take it with you</h2>
          <p>
            Everything above runs on{" "}
            <a
              href="https://github.com/daformat/audio-borealis"
              target="_blank"
              rel="noopener"
            >
              <code>@daformat/audio-borealis</code>
            </a>
            , which is the app&rsquo;s driver and painter ported line for line,
            with tests around them. It has no dependencies and nothing in it is
            React. The pieces come apart: the driver is a loudness in and a
            frame out, the painter is a frame onto a context, and the frame
            carries everything the painter needs, so if you would rather draw it
            in WebGL or as SVG, the numbers are yours.
          </p>

          <h3 id="install">Install</h3>
          <p>
            Open the repo on{" "}
            <a
              href="https://github.com/daformat/audio-borealis"
              target="_blank"
              rel="noopener"
            >
              Github
            </a>{" "}
            (and drop a star if you like it!)
          </p>
          <div className={styles.code_panel}>
            <Tabs
              defaultValue="install-npm"
              tabs={[
                {
                  id: "install-npm",
                  trigger: (
                    <h4 id="install-npm" data-no-toc={""}>
                      npm
                    </h4>
                  ),
                  content: <CodeBlock html={props.installNpm} />,
                },
                {
                  id: "install-yarn",
                  trigger: (
                    <h4 id="install-yarn" data-no-toc={""}>
                      yarn
                    </h4>
                  ),
                  content: <CodeBlock html={props.installYarn} />,
                },
                {
                  id: "install-pnpm",
                  trigger: (
                    <h4 id="install-pnpm" data-no-toc={""}>
                      pnpm
                    </h4>
                  ),
                  content: <CodeBlock html={props.installPnpm} />,
                },
                {
                  id: "install-bun",
                  trigger: (
                    <h4 id="install-bun" data-no-toc={""}>
                      bun
                    </h4>
                  ),
                  content: <CodeBlock html={props.installBun} />,
                },
                {
                  id: "install-deno",
                  trigger: (
                    <h4 id="install-deno" data-no-toc={""}>
                      deno
                    </h4>
                  ),
                  content: <CodeBlock html={props.installDeno} />,
                },
              ]}
            />
          </div>

          <h3 id="usage">Usage</h3>
          <div className={styles.code_panel}>
            <CodeBlock html={props.usage} />
          </div>

          <h2 id="what-it-reads">What it reads</h2>
          <p>A loudness and five bands, through four steps.</p>
          <p>
            Whatever feeds the glow hands it two things: a loudness, which for
            real sound is the root mean square of the waveform, and the level in
            five bands, low to high, which for real sound is the spectrum cut at
            300, 600, 1,200 and 2,400 Hz. The bands are optional, and without
            them the driver takes five on its own from the loudness.
          </p>
          <p>
            Both readings go through the same four steps, and each one exists
            because the one before it was not enough. First the loudness is
            gained, by a base of 5 and the sensitivity knob, and gated, so the
            hum of a room does not glow:
          </p>
          <p className={styles.formula}>
            <code>raw = loudness × 5 × sensitivity, nothing below 0.06</code>
          </p>
          <p>
            Second, what clears the gate is rounded off, so a shout tops out
            instead of clipping. A hard clip is the first thing you see on a
            meter, but would have looked terrible here:
          </p>
          <p className={styles.formula}>
            <code>
              t = (raw − 0.06) / (1 − 0.06) → level = (1 − e<sup>−3t</sup>) / (1
              − e<sup>−3</sup>)
            </code>
          </p>
          <p>
            Third, <strong>automatic gain</strong>. Every level is divided by
            its own running peak, which decays over four seconds and is never
            allowed under 0.3. A whisper and a shout fill the box the same way,
            because the glow is there to show that a voice is present rather
            than how loud it is, and the floor is what stops silence from being
            amplified into a shout of its own. Turn it off in the knobs and the
            box reads volume instead.
          </p>
          <p>
            Fourth, a one-pole follower with a fast attack and a slow release,
            fifty milliseconds up and two hundred down, the bands fifteen
            percent slower on the way down than the level. The glow snaps up on
            a syllable and settles after it, which is the difference between
            something that reads as listening and something that reads as
            flickering.
          </p>
          <p>What comes out is the rise, and it is the level to a power:</p>
          <p className={styles.formula}>
            <code>
              rise = level<sup>0.6</sup>
            </code>
          </p>
          <p>
            Below one, so it comes up fast at low levels. A caption box wants to
            say <em>yes, I hear you</em> at the first syllable, not at the
            loudest one, and 0.6 is where that lands without the glow being
            pinned to the top for the whole sentence. Everything else, the
            height, the width, the lift, how fast the lobes slide, is the rise
            times a knob.
          </p>

          <h2 id="seven-lobes">Seven lobes on five bands</h2>
          <p>Where the light comes from, and why it moves.</p>

          <p>
            The soft part of the glow is seven lobes fanned out from the middle
            of the bottom edge, each one a radial gradient squashed into an
            ellipse and each one standing on a band. The center stands on the
            lows, because that is where a voice&rsquo;s weight is and the middle
            is where weight belongs; its two neighbors stand on the mids, the
            outer pair on the highs, and the far pair, small and low, on the low
            mids. A voice lights the middle first and the edges on its
            consonants, which is close enough to how a stage is lit that it
            reads as one.
          </p>

          <p>
            A lobe&rsquo;s height is its band, with a floor under it, so that no
            lobe ever quite disappears while the glow is up and a loud band more
            than doubles its own:
          </p>
          <p className={styles.formula}>
            <code>height = 0.6 + 0.7 × band</code>
          </p>
          <p>
            And they move. While a voice is heard the whole fan slides sideways,
            sixty points a second times the rise, and holds still the moment the
            voice stops. That one decision is most of why the thing looks alive
            rather than like a spectrum analyzer: a meter bounces in place,
            weather drifts. The fan wraps over a span of seven lobe widths, and
            each lobe fades to nothing over the last few points before the wrap,
            so the one leaving on the right is gone before it comes back on the
            left. Without that envelope you get a lobe popping in at the edge
            once every few seconds, which I did get, and which is the kind of
            thing you only see after you have stopped looking for it.
          </p>

          <h2 id="five-hills">Five hills</h2>
          <p>The sharp part, and the reason it has no seams.</p>
          <p>
            Over the lobes, five hills, one per band from low to high, each a
            bell standing on the bottom edge, filled from the edge up toward its
            crest and stroked one pixel along the top. The center-most rests in
            the middle and the rest alternate outward, the outermost at half the
            width from the center, and they wander sideways a little as the
            lobes flow, so the two layers are moving together without being
            locked together. A hill&rsquo;s height is its band, with the same
            kind of floor:
          </p>
          <p className={styles.formula}>
            <code>apex = ceiling × (0.15 + 0.85 × band)</code>
          </p>
          <p>
            The ceiling rises with the glow and never takes more than 55% of the
            box, because the hills are meant to stand behind the words, never
            over them. The bell is not quite a Gaussian:
          </p>
          <p className={styles.formula}>
            <code>
              bell(t) = (e<sup>−|t/σ|^p</sup> − e<sup>−(1/σ)^p</sup>) / (1 − e
              <sup>−(1/σ)^p</sup>)
            </code>
          </p>
          <p>
            The subtraction at the end is what matters. A Gaussian is never
            zero, and a hill filled up to a curve that is never zero has a
            hairline of fill at both ends of the box where the curve was still a
            fraction of a pixel above the edge. Subtracting the tail makes the
            bell <strong>exactly zero</strong> at t = ±1, so each hill can be
            clipped and filled on its own and the join is invisible. The profile
            knob is p: 2 is a bell, higher is flatter on top, and the app sits
            at 1.75, a little peakier than a bell, because a rounded top read as
            a hump and a peaked one reads as a wave.
          </p>

          <h2 id="the-colors">The colors</h2>
          <p>Seven shares of the wheel, never quite the same twice.</p>
          <p>
            Each lobe has a color, and each hill takes the color of its band.
            They come from seven shares of the hue wheel, shuffled by hand so
            that neighbors contrast rather than blend into one wash:
          </p>
          <p className={styles.formula}>
            <code>0.94, 0.56, 0.76, 0.40, 0.08, 0.65, 0.49</code>
          </p>
          <p>
            A preset is where on the wheel those shares are laid, and the
            package calls it a look. Rainbow takes the whole thing. Northern
            lights takes the half from green through blue to violet, starting at
            100°. Autumn takes a quarter from magenta round through red to
            orange, starting at 310°. Monochrome haze takes none of the wheel:
            its one color is the box&rsquo;s counter-color, white on the dark
            box and a blue-leaning gray on the light one, read off the
            box&rsquo;s own type when the frame is painted, so it follows the
            theme wherever the theme comes from. It sounds like the boring
            option and is the one I use most, because on a busy screen the
            colors are one more thing moving. Then the whole set drifts, 24°
            either side of where it started, out and back over twelve seconds on
            a cosine, so the colors are never quite the same twice and never
            jump. Zero the drift in the knobs and watch how much staler it gets.
          </p>

          <h2 id="painting-it">Painting it with what every engine has</h2>
          <p>Gradients, clips, and two compositing modes. No filters.</p>
          <p>
            The obvious way to draw a soft glow on a canvas is to draw a hard
            one and run it through <code>filter: blur()</code>. It is also the
            way to get three different pictures in three browsers and a frame
            budget spent on blurring, so the painter uses nothing that is not in
            every 2D context that has ever shipped: gradients, clips,{" "}
            <code>destination-in</code> for the masks and <code>lighter</code>{" "}
            when the hills are set to add. No filters, no{" "}
            <code>OffscreenCanvas</code>, and no <code>roundRect</code>, which
            Safari got late; the corners are four arcs.
          </p>
          <p>
            The lobes are painted twice, as two layers, a wide faint one and a
            tighter brighter one. Each layer is built on a scratch canvas the
            size of the box: the seven ellipses first, then an elliptical mask
            laid over them with <code>destination-in</code>, which keeps the
            lobes only where the mask is and fades them out before the lobes
            themselves would. Then the scratch is drawn onto the box at the
            layer&rsquo;s opacity times the glow. The mask is the whole trick.
            Without it the lobes are seven blobs; with it they are one shape
            with seven brighter places in it.
          </p>
          <p>
            Two things about the canvas itself, both of which cost me an
            afternoon. The first is that sizing a canvas clears it, and a
            caption box changes size on every word, so the glow was blinking out
            for a frame each time a word landed. The fix is to repaint the last
            frame in the resize observer&rsquo;s own callback, which runs after
            layout and before the frame is painted, so there is never a painted
            frame with an empty canvas in it. The second is that the canvas is
            sized off the box&rsquo;s own width and not its width on the page,
            because on the app&rsquo;s landing page the box sits inside a screen
            that is scaled down to fit, and a canvas sized off the page would
            have been drawn at the wrong resolution and then scaled by the same
            transform, twice.
          </p>
          <p>
            One frame loop serves every glow on the page, and it runs only while
            a glow has something to do: on screen, in a visible tab, and either
            reading a source or still fading out. A box with nothing to say
            costs nothing, which matters when the thing is under every caption
            box on a page, including the ones in the app&rsquo;s own history
            stack.
          </p>

          <h2 id="a-voice-that-is-not-there">A voice that is not there</h2>
          <p>What the demo is listening to, since a page has no sound.</p>
          <p>
            The app reads a microphone or the system audio. The landing page has
            neither, so its demo needed a voice, and a recording would have
            meant a file, a load, and a loop you could hear the seam in. So the
            mock voice is arithmetic. Syllables of uneven length and loudness,
            some stressed, laid end to end with a short gap now and then where a
            word ends, each with a spectral shape of its own, a vowel low and in
            the mids and a consonant higher, and a third of them opening on a
            burst of highs, which is what a sibilant does to a meter.
          </p>
          <p>
            It is deterministic in time, from a hash, so it repeats and stores
            nothing: eight syllables fill a cycle of 1.7 seconds and the
            cycle&rsquo;s index reseeds them. And it starts over at each stretch
            of speech, so every line is said the same way, to the same peak,
            which is a thing the app cannot promise and a demo can. It is close
            enough to a voice that the meter reads it the same, and I know that
            because the meter above was the test: if the bars moved like they
            move on a real voice, the voice was done.
          </p>

          <h2 id="real-sound">Real sound</h2>
          <p>An analyser, a root mean square, and four frequencies.</p>
          <p>
            Real sound goes through a Web Audio <code>AnalyserNode</code>. The
            loudness is the RMS of the waveform, which for a voice at an
            ordinary microphone gain sits somewhere in 0.02 to 0.1, and with the
            driver&rsquo;s gain of fifteen that is exactly the range its gate
            and its knee are drawn for. The bands are the spectrum in the
            analyser&rsquo;s own decibels, cut at the four frequencies above and
            each averaged into 0..1 between the analyser&rsquo;s floor and
            ceiling. None of that is precise, and it does not need to be: the
            automatic gain scales every reading to its own running peak, so what
            reaches the glow is the shape of the sound and not its size, and
            shape is all a glow can show anyway.
          </p>
          <p>
            The recording in the demo goes through the same analyser, from an
            audio element rather than a microphone. It is the Mac&rsquo;s own
            voice, one sentence at a time, trimmed and laid end to end with a
            breath between them, and its captions are typed from timings I did
            not have to measure: a synthesized voice reads at an even pace, so
            each word&rsquo;s time is its share of its sentence&rsquo;s length
            by letters, with a little extra after a comma. That lands the
            caption a word behind the voice, which is where the app&rsquo;s
            captions land too. A script in the repo makes the file and the
            timings, and takes a recording of your own in place of the voice.
          </p>
          <p>
            The microphone button does all of it in one call, from the click,
            since a browser will only ask on a click, and lets the microphone go
            the moment you pick something else, so the tab&rsquo;s recording
            light goes out with it.
          </p>

          <p className={styles.footnote}>
            The app draws its glow in Swift, with Core Graphics; the package is
            a port of its driver and painter with the numbers unchanged, and the
            landing page&rsquo;s demo runs on the same code.
            <br />
            The microphone is read in your browser and nowhere else. Nothing on
            this page records, stores or sends audio.
          </p>
        </div>
        <PrevNextNavigation currentComponentId={componentId} />
      </div>
    </>
  );
};

export default AudioBorealisPage;
