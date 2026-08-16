import Link from "next/link";
import { useEffect, useRef } from "react";

import { PrevNextNavigation } from "@/components/Navigation/PrevNextNavigation";
import { PageMetas } from "@/components/PageMetas/PageMetas";
import { SubtitlesDemo } from "@/components/SubtitlesDemo/SubtitlesDemo";
import { TableOfContents } from "@/components/TableOfContents/TocComponent";
import {
  ComponentId,
  COMPONENTS,
} from "@/constants/design-engineering/components";

const componentId: ComponentId = "subtitles-app";

const SubtitlesAppPage = () => {
  const component = COMPONENTS[componentId];
  return (
    <>
      <PageMetas {...component.metas} />
      <TableOfContents.Provider>
        <SubtitlesAppPageContent />
      </TableOfContents.Provider>
    </>
  );
};

const SubtitlesAppPageContent = () => {
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
      <div ref={contentRef} className="prose page">
        <Link href="/design-engineering" className="back_link">
          Back to gallery
        </Link>
        <h1 id="design-engineering-the-subtitles-demo">
          Design engineering: the Subtitles app demo
        </h1>
        <p>
          I made a small Mac app called{" "}
          <a href="https://subtitles-live.com" target="_blank" rel="noopener">
            Subtitles
          </a>
          . It captions whatever your Mac is playing, live, in an overlay that
          floats above every window: calls, videos, podcasts, lectures. I built
          it because I kept needing it. Half of my days happen in a second
          language, over connections that drop syllables, and one word missed in
          a meeting quietly costs you the next three. So I scratched my own itch
          and wrote the thing I wanted to have.
        </p>
        <p>
          Then I had to explain it on a landing page, and a still screenshot of
          a caption box is a spectacularly bad way to explain something whose
          entire point is that it keeps going while you do other things. So I
          built this demo instead. It is the piece of the site I spent the most
          time on, by a lot, which is precisely why it belongs here rather than
          in the app.
        </p>
        <SubtitlesDemo />
        <p>
          It loops through three scenes: a call, the notes you switch to while
          the call carries on, and a podcast. The captions type themselves out
          over all of it. The app switch happens <em>during</em> a caption, on
          purpose, because that is the one thing the demo has to prove.
        </p>

        <h2 id="no-images">Not a single image</h2>
        <p>
          There is no video in here, no screen recording, and no screenshot. Not
          one image file. The desktop is a couple of radial gradients, the
          participants are initials on a linear gradient, the album art is a
          gradient too, the waveform is ninety-six divs with a height each, and
          the notes document is a stack of grey rounded rectangles pretending to
          be sentences.
        </p>
        <p>
          That started as a constraint I set for fun and turned out to be the
          right call. The whole thing weighs a few kilobytes of markup, it stays
          crisp at any size, it reflows at every breakpoint instead of
          letterboxing, and when I changed my mind about the podcast window,
          which I did more than once, it was a CSS edit rather than a new
          recording session.
        </p>

        <h2 id="three-windows">Three windows that share a bottom edge</h2>
        <p>
          The three fake macOS windows are all in the DOM at once, absolutely
          positioned, each with its own inset so they look casually stacked the
          way a real desktop is. Only one carries the front class at a time; the
          other two get <code>filter: brightness(0.62) saturate(0.8)</code>,
          which is a cheap and surprisingly convincing stand-in for &ldquo;this
          window is not focused&rdquo;. macOS also greys out the traffic lights
          and dims the title of an inactive window, so the demo does that too.
        </p>
        <p>
          The insets are not arbitrary: all three share the same bottom edge.
          The caption box sits at a fixed distance from the bottom of the
          screen, so if the windows ended at different heights, the overlay
          would straddle a different part of each one and the switch would feel
          like a jump cut. Details like that are invisible when you get them
          right, which is the whole game.
        </p>

        <h2 id="the-caption-box">The caption box</h2>
        <p>
          The overlay is drawn from the app&rsquo;s own numbers: black at 72%
          opacity, SF Rounded semibold, the same radius and the same insets the
          app uses at its default size. It hugs its content, with a minimum
          width so that short lines don&rsquo;t make the box jitter, and it sits
          above every window and above the switcher, because that is literally
          what it is for.
        </p>
        <p>
          Captions arrive a word at a time, at roughly conversational pace with
          a bit of jitter, and a word ending in a comma or a full stop gets an
          extra beat because that is what speech does. The newest word is dimmed
          until the utterance ends and everything commits at once, which is how
          the real recogniser behaves: it keeps the option of changing its mind
          about the word you are currently hearing. Then the box holds for a
          base beat plus time per word, so a long caption is not gone before you
          have finished reading it.
        </p>

        <h2 id="cmd-tab">⌘-tab, and why the caption doesn&rsquo;t wait</h2>
        <p>
          The app switcher is the same choreography as the real one: the panel
          comes up on the app you are currently in, the selection moves, and the
          new window fronts as the panel drops, which is the moment you would
          release the key. Getting the order wrong reads as fake immediately,
          even to people who could not tell you why.
        </p>
        <p>
          The important bit is one line of code. Two of the three switches run{" "}
          <code>Promise.all([say(line), switchTo(from, to)])</code> so the
          caption keeps typing straight through the app switch. That is the
          claim the app makes, so the demo has to make it too. The exception is
          the switch that wraps back round to the first scene: that one runs on
          its own, with the caption starting after it lands, so the loop reads
          as beginning again rather than as a sentence that started under the
          previous scene&rsquo;s window.
        </p>

        <h2 id="waveform-playhead">The waveform and the playhead</h2>
        <p>
          Each bar of the waveform carries two custom properties: its height,
          and its index. The index drives a negative animation delay, so every
          bar starts at a different point of the same cycle. Without it you get
          ninety-six bars breathing in unison, which reads as a loading spinner
          rather than as audio. Three different durations are then threaded
          through the row with <code>nth-child</code> selectors, because speech
          is not periodic and a single duration eventually gives the loop away.
        </p>
        <p>
          The bars only animate while the player is the window in front. A
          waveform moving behind two other windows is noise, and it is also a
          compositing bill you are paying for something nobody can see.
        </p>
        <p>
          The playhead runs at four times real time. A scene lasts about a dozen
          seconds and a real playhead would not visibly move in that, and the
          clock counting up is the part people read as &ldquo;this is
          playing&rdquo;, so that is the part that has to move. The elapsed
          time, the scrubber and the played portion of the waveform are all
          derived from the same number, so they cannot drift apart.
        </p>

        <h2 id="only-when-youre-looking">Only while you are looking</h2>
        <p>
          There is exactly one loop for the lifetime of the component, and it
          parks on a paused flag rather than returning. That is a bug I already
          wrote once: restarting the loop every time the demo scrolled back into
          view stacked a second copy on top of the first, and the two raced each
          other for the caption text. Now an IntersectionObserver and a{" "}
          <code>visibilitychange</code> listener flip the flag, and the loop
          waits it out. Timers in a backgrounded tab get throttled to about one
          a second, which would wreck the pacing, so a hidden tab is treated the
          same as a demo that is off screen.
        </p>
        <p>
          Under <code>prefers-reduced-motion</code>, the whole thing stops being
          a performance: no typing, no switching, no waveform, no playhead.
          A&nbsp;single caption is shown, already committed, and the CSS
          animations are switched off. The demo is decorative from top to bottom
          and hidden from assistive tech, so the page copy is what actually has
          to carry the meaning, which is a good discipline anyway.
        </p>
        <p>
          The menu bar clock is real, formatted in your own locale, re-arming on
          the next minute boundary rather than ticking every second. It is a
          throwaway detail that nobody will ever mention, and the demo would
          feel subtly wrong without it.
        </p>

        <h2 id="react-port">From plain HTML to React</h2>
        <p>
          On{" "}
          <a href="https://subtitles-live.com" target="_blank" rel="noopener">
            the app&rsquo;s site
          </a>
          , this is hand-written HTML with a small script driving it through
          class names, because that site has no build step and I would like to
          keep it that way. The version above is the same thing rewritten as a
          React component: the DOM juggling becomes state, the scene loop lives
          in an effect and unwinds cleanly on unmount, and the derived values
          are just that, derived.
        </p>
        <p>
          Porting it was a good test of the original. Everything that survived
          the rewrite unchanged was structure; everything that needed rethinking
          was something I had been holding together by hand.
        </p>

        <h2 id="the-app">The app itself</h2>
        <p>
          <a href="https://subtitles-live.com" target="_blank" rel="noopener">
            Subtitles
          </a>{" "}
          lives in the menu bar. It taps the audio your Mac is already playing
          through a Core Audio process tap, runs it through a speech model on
          the Apple Neural Engine, and draws the result as an always-on-top
          overlay that lets clicks through. Nothing is uploaded, nothing is
          recorded, nothing is written to disk: it all happens on the machine,
          which is the constraint everything else was designed around. It needs
          macOS&nbsp;14.2 or later on Apple Silicon, it is a one-time purchase
          with no account and no subscription, and{" "}
          <a
            href="https://github.com/daformat/subtitles"
            target="_blank"
            rel="noopener"
          >
            the source is on GitHub
          </a>
          .
        </p>
        <p>
          I still use it most days, which remains the best reason I know to
          build something.
        </p>
        <PrevNextNavigation currentComponentId={componentId} />
      </div>
    </>
  );
};

export default SubtitlesAppPage;
