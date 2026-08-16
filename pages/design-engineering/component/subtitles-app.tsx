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

        <h2 id="the-demo">The demo</h2>
        <p>
          It loops through three scenes: a call, the notes you switch to while
          the call carries on, and a podcast. The captions type themselves out
          over all of it. The app switch happens <em>during</em> a caption, on
          purpose, because that is the one thing the demo has to prove.
        </p>

        <h3 id="taking-it-apart">Taking it apart</h3>
        <p>
          It is also a desktop rather than a film of one. Pick a scene from the
          bar under it and it ⌘-tabs its way there; click a window and it comes
          forward without the ⌘-tab, because that is reaching for the window and
          the machinery in between would be in the way. Drag a window by its
          title bar. Hold <kbd>⇧</kbd> and drag the captions, which is the
          app&rsquo;s own gesture: the overlay lets clicks through until you
          hold shift, and then it is something you can pick up.
        </p>
        <p>
          Most of the work in that is in the refusals. Clicking the scene you
          are already watching does nothing, because restarting it would punish
          a click on the thing you were enjoying. A window can be pushed off the
          sides and the bottom of the screen and be clipped by it, as on a real
          desktop, but not up under the menu bar. The caption box is the one
          thing held inside the screen, since it is the thing being
          demonstrated. Both drags are mouse-only: on a phone the title bar sits
          in a page you are trying to scroll, and a drag that starts there
          either takes the window with you or eats the scroll. And a window you
          are holding is dropped when the loop moves to another scene, because
          by then you are dragging something that is no longer in front.
        </p>
        <p>
          None of it interrupts the loop. The captions keep typing while you
          drag a window around under them, which is the same claim the app makes
          about the real overlay, and a better demonstration of it than the
          scripted version because you are the one moving the window.
        </p>

        <h3 id="no-images">Not a single image</h3>
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

        <h3 id="to-scale">A scale model, and what that costs</h3>
        <p>
          Everything inside the screen is drawn in multiples of one unit:{" "}
          <code>--u</code>, a hundredth of the screen&rsquo;s own width, off a
          container query. It replaced viewport units with pixel floors, which
          had been quietly ruining the illusion. A title bar that is 3.4% of the
          width at full size was 10% of it in a narrow column, because the
          chrome stopped shrinking while the screen kept going. The model was to
          scale on a desktop and a toy on a phone.
        </p>
        <p>
          The unit is capped at the size it reaches when the screen tops out, so
          nothing changes at full width, and floored, because a model that
          scales the whole way down loses its hairlines and turns its text to
          grain. The floor has a price, though, and it took a bug to find it:
          below it the screen keeps getting shorter while the chrome does not,
          the podcast pane stopped fitting, and flex took the difference out of
          the only child with no content of its own. The waveform collapsed from
          28px to 2px. Nothing in that pane is shrinkable now. What gives
          instead is the layout, the way a desktop player does when you drag its
          window narrow: the episode list goes first, then the artwork and the
          waveform give up a little. What is playing keeps its name at every
          size.
        </p>

        <h3 id="three-windows">Three windows that share a bottom edge</h3>
        <p>
          The three fake macOS windows are all in the DOM at once, absolutely
          positioned, each with its own inset so they look casually stacked the
          way a real desktop is. Only one carries the front class at a time, and
          what marks it is the chrome rather than the content: the other two get
          greyed traffic lights, a faded title, and a shallower shadow than the
          window on top of them. That is where macOS puts the difference, and
          copying it is the difference between a stack of windows and a
          screenshot with something greyed out on it. There is a small
          concession, which the palette section gets to below.
        </p>
        <p>
          The insets are not arbitrary either. They put the windows on centres
          6% apart at three different heights, because at 4% and near-identical
          tops they read less as three apps than as one window redrawn three
          times. What they cannot vary is where they end: all three share a
          bottom edge, since the caption box sits a fixed distance above it, and
          windows ending at different heights would put the overlay across a
          different part of each one and make every switch a jump cut. Details
          like that are invisible when you get them right, which is the whole
          game.
        </p>

        <h3 id="the-caption-box">The caption box</h3>
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

        <h3 id="cmd-tab">⌘-tab, and why the caption doesn&rsquo;t wait</h3>
        <p>
          The app switcher is the same choreography as the real one: the panel
          comes up on the app you are currently in, the selection moves, and the
          new window fronts as the panel drops, which is the moment you would
          release the key. Getting the order wrong reads as fake immediately,
          even to people who could not tell you why.
        </p>
        <p>
          The important bit is one line of code. Two of the three switches run{" "}
          <code>say(line)</code> and <code>switchTo(app)</code> concurrently, so
          the caption keeps typing straight through the app switch. That is the
          claim the app makes, so the demo has to make it too. There are two
          exceptions, and both are about the switch reading as deliberate: the
          one that wraps back round to the first scene, and any switch you asked
          for by picking a scene. Those run on their own, with the captions
          starting after they land. A sentence that began under the window you
          just left reads as the loop losing its place.
        </p>
        <p>
          The pair is awaited with <code>allSettled</code> rather than{" "}
          <code>Promise.all</code>, which sounds like pedantry and is not. Both
          halves check for an interruption at every beat, so a click during a
          switch makes both of them throw. With <code>Promise.all</code> the
          first rejection unwinds the loop while the other half is still
          running, and its rejection lands a moment later against a loop that no
          longer exists. Waiting for both to settle and then rethrowing keeps
          the demo out of that.
        </p>

        <h3 id="instant">Making a click land now</h3>
        <p>
          The first version of the scene buttons felt broken, and the reason is
          a good one. The loop is a chain of awaited timers, so it only noticed
          a click when the timer it was sitting in ran out, and a caption that
          has finished typing holds for up to 4.2 seconds so you can read it.
          Click during that and nothing happens for four seconds, which reads as
          a dead button, so you click again.
        </p>
        <p>
          Every wait now registers a way to end it early, and a click ends all
          of them: the loop resumes on the next microtask, sees the request,
          unwinds and starts the scene you asked for. The ⌘-tab panel is on
          screen about 90ms after the click. Nothing about the choreography
          changed. It just starts when you ask rather than when the timer says
          so.
        </p>

        <h3 id="waveform-playhead">The waveform and the playhead</h3>
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

        <h3 id="only-when-youre-looking">Only while you are looking</h3>
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
          animations are switched off. The scene buttons still work: with
          nothing animating they are the only way through the three scenes, so
          they place each one directly.
        </p>
        <p>
          The screen itself is hidden from assistive tech. It is a drawing of a
          desktop and a scripted loop, so there is nothing in it to read out,
          and the page copy is what carries the meaning instead. What is not
          hidden is the part you can operate: the three scene buttons are
          buttons, they say which scene they are, and the current one is marked{" "}
          <code>aria-current</code>. Clicking a window does the same thing as
          its button, which is the mouse-shaped way to the same three
          destinations.
        </p>
        <p>
          The menu bar clock is real, formatted in your own locale, re-arming on
          the next minute boundary rather than ticking every second. It is a
          throwaway detail that nobody will ever mention, and the demo would
          feel subtly wrong without it.
        </p>

        <h3 id="two-desktops">One demo, two desktops</h3>
        <p>
          The demo follows this page into dark mode, because a dark screenshot
          sitting in a light page is a screenshot. That could have been two
          stylesheets. It is instead two values: <code>--ink</code>, the colour
          of the things on a surface, written as a bare <code>255 255 255</code>{" "}
          triplet so every rule can still set its own alpha with{" "}
          <code>rgb(var(--ink) / 0.11)</code>, and a handful of surfaces.
          Swapping that pair swaps the desktop, and the forty-odd alphas
          underneath keep working, because what I had tuned against the dark
          screen was never the colour. It was the relationship.
        </p>
        <p>
          Three things refuse to follow, and they are the interesting part. The
          app icons, the avatars and the album art keep their own colours, as
          they do on a Mac. The caption box stays black with white text, because
          that is what the app draws over a light desktop too. And the shadows
          get their own values per theme: the dark ones are deep because they
          fall on a near-black desktop where nothing shallower would read at
          all, and the same shadow on a light desktop is a smear.
        </p>
        <p>
          A background window is a fourth. macOS does not dim one, so neither
          did I, until three of them overlapping in a small screen made it
          genuinely unclear which one you were in. The compromise is that the
          content dims very slightly and the chrome does not, which is where
          macOS puts the difference anyway: greyed traffic lights, a faded
          title, a shallower shadow.
        </p>

        <h3 id="react-port">From plain HTML to React</h3>
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

        <h2 id="the-app">The real time subtitles app</h2>
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
          I use it every day, and it is genuinely life changing, which remains
          the best reason I know to build something.
        </p>
        <PrevNextNavigation currentComponentId={componentId} />
      </div>
    </>
  );
};

export default SubtitlesAppPage;
