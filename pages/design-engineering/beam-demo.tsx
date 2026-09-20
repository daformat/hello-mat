import Link from "next/link";
import { useEffect, useRef } from "react";

import { BeamDemo } from "@/components/BeamDemo/BeamDemo";
import { ArticleDates } from "@/components/Navigation/ArticleDates";
import { PrevNextNavigation } from "@/components/Navigation/PrevNextNavigation";
import { ComponentPageMetas } from "@/components/PageMetas/ComponentPageMetas";
import { TableOfContents } from "@/components/TableOfContents/TocComponent";
import {
  ComponentId,
  COMPONENTS,
} from "@/constants/design-engineering/components";

const componentId: ComponentId = "beam-demo";

const BeamDemoPage = () => {
  return (
    <>
      <ComponentPageMetas componentId={componentId} />
      <TableOfContents.Provider>
        <BeamDemoPageContent />
      </TableOfContents.Provider>
    </>
  );
};

const BeamDemoPageContent = () => {
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
        <h1 id="design-engineering-the-beam-demo">
          The beam demo, a browser that takes notes
        </h1>
        <ArticleDates componentId={componentId} />
        <p>
          A few years ago, I worked on beam, a browser for the Mac that was also
          a notes app, or the other way round depending on who you asked. You
          browsed, you held <kbd>⌥</kbd> and clicked to capture a piece of a
          page into the day&rsquo;s note, you wrote around it, and when a note
          was worth sharing you published it as a page of its own. That is four
          things, and a landing page has about six seconds to say them.
        </p>
        <p>
          So I built the pitch as a demo rather than as a paragraph: one beam
          window, drawn in HTML and CSS, that does the four things in front of
          you while a title above it says what you are looking at. It shipped on
          the site in April 2022. beam is no longer around, and the site went
          with it, which is exactly the kind of thing this gallery is for. This
          is that demo, ported to React, with the site&rsquo;s own timings and
          its own colors, and a couple of things I could not leave as I found
          them.
        </p>
        {/* Where the demo's stage starts on the page at desktop widths, with
            nothing pushing it down, measured: the demo is pushed down from
            there so the window peeks up from under the fold on load, as it
            did on the site. */}
        <BeamDemo lead="683px">
          <h2 id="the-demo">The demo</h2>
          <p>
            It plays in four chapters. The window opens as a browser, on a news
            site. Then the browser turns into the journal. Then it turns back,
            and the <kbd>⌥</kbd> point and shoot highlight walks over the blocks
            of the page, the window leans back and the journal comes out from
            behind it, and the block under the highlight is captured into the
            note, <em>so you can capture the web</em>. And finally, the note is
            published, and the loop comes round to the start. On the site the
            demo played once, as you scrolled to it, and ended on a download
            button; here there is nothing to download, so it loops, and the last
            title is the line the site opened on.
          </p>
          <p>
            The window is revealed by the scroll, as it was on the site. Bring
            it up and the window grows to its natural size, with one small hop
            on its way, the title fades in over the last stretch, and the demo
            and everything after it slide up over the room the window peeked up
            from, so that once it is up there is nothing blank above it, and
            back down if you go back up.
          </p>
          <p>
            The scale, the fade and the slide are the stylesheet&rsquo;s, driven
            by a view timeline on that box, so they are right on the first
            paint, with no script to wait for. The site drove its own from an
            IntersectionObserver, and so does the port where the browser has no
            view timelines, which is older Safari and Firefox, with the first
            values written in a layout effect, from a measurement, so the page
            hydrates with the window at the size the scroll has it rather than
            painting once and then correcting itself.
          </p>

          <h3 id="taking-it-apart">Taking it apart</h3>
          <p>
            The window is not a film of a prototype, it is interactive. Click a
            tab and the page changes; hover the tab you are on and the title
            lifts out and the address comes up under it, just like the app did.
            The magnifying glass opens the omnibox, and so does <kbd>⌘</kbd>
            <kbd>K</kbd>, as it did in the app, while the window is on screen:
            type and it narrows to the tabs and the notes that match, and Enter
            takes you to the selected item. There is also the original easter
            egg in the omnibox if you type any variation of &quot;Beam me
            up&quot;, a download link appears, this was one of the hidden ways
            you could use to download the beta back then. The other button is{" "}
            <kbd>⌘</kbd>
            <kbd>D</kbd>, the switch between the web and the notes, this one
            does not work in the demo since it&apos;s the browser bookmark
            shortcut. And the publish button in the note&rsquo;s header
            publishes, with the same three beats the script uses: publishing,
            published and a copied link, then the link icon it settles into.
            Click it again once it has, and it tells you the link was copied
            again, which is what the app did. And the omnibox keeps the
            site&rsquo;s easter egg: type <em>beam me up</em> and it offers you
            the beta to download, with the sunglasses. There is no beta to
            download any more, so the row shakes its head at a click, which is
            the least a dead link can do.
          </p>
          <p>
            What a click does to the script is the part I had to decide, since
            the site&rsquo;s answer was tied to its scroll. There, flipping the
            switch resumed the choreography from whichever mode you had flipped
            to: to the web meant a capture, to the notes meant a publish. I kept
            that, because it is the right answer: the script has one chapter per
            mode, so the switch, or an omnibox result that changes the mode,
            jumps the script to that chapter, and the chapter starts with its
            title. The omnibox pauses it instead, which is near enough what the
            site did, where the search stopped the script until the next switch,
            and lets it go again when it closes. A tab click changes nothing
            about the script: the highlight is aimed at a block by name, first
            to last, so it lands on the same block of whichever page you
            switched to, and the capture lifts that one.
          </p>
          <p>
            The bar under the window is the way through it without waiting, and
            the one part a screen reader gets, since the window is a drawing of
            an app running a script and is hidden from assistive tech: three
            chapters, each a button, with a fill that walks across as the
            chapter plays. Clicking the one that is playing does nothing.
          </p>

          <h3 id="the-capture">The capture</h3>
          <p>
            Every fake page has four blocks a capture can be aimed at, and the
            script visits them in the same order the site did, the point and
            shoot highlight sliding from one to the next with a little
            overshoot. The highlight is placed by measuring: offsets walked up
            from the block to the window&rsquo;s content box, less what the page
            has scrolled, written as custom properties the stylesheet
            transitions between. Offsets rather than bounding rectangles,
            because the box is tilted in three dimensions while this happens and
            a rectangle would come back projected. It is measured again when the
            tab under it changes, when the page scrolls, and when the window
            resizes, since the blocks are laid out in em of it. The shot lifts
            the block into the journal.
          </p>

          <h3 id="the-publish-button">The publish button</h3>
          <p>
            The button in the note&rsquo;s header is beam&rsquo;s reveal button,
            an icon until you reach for it and then an icon with its name, which
            this gallery has{" "}
            <Link href={COMPONENTS["publish-button"].metas.url}>
              already taken apart on a page of its own
            </Link>
            . The one here is the site&rsquo;s original rather than that one:
            the label is measured and its width handed to the stylesheet as a
            custom property, which is what lets the reveal be a transition
            rather than a jump, with an overshooting curve on the way out and a
            plain one on the way back, because Safari made a mess of the elastic
            one on a width. The tick draws itself, the link icon bumps as it
            lands, and the tooltip over it says the link was copied, all of it
            the site&rsquo;s, beat for beat.
          </p>

          <h3 id="no-images">Three favicons, and no image file</h3>
          <p>
            There is no video in here and no screenshot, which was true of the
            site as well, with three exceptions: the favicons in the tabs were
            PNGs pasted into the markup as data URIs, one of them seven
            kilobytes of a 256 pixel Gmail M. They are drawn now. The M is five
            paths in its colors. The video badge is a red rounded rectangle and
            a triangle. And the newspaper&rsquo;s is its own masthead: the site
            had <em>The Beam Times</em> as one blackletter path for the
            page&rsquo;s header, and the favicon is the same path with the
            viewBox closed in on its B, so the tab wears the paper&rsquo;s
            initial in the text&rsquo;s own color, and follows it into dark
            mode with nothing to swap.
          </p>

          <h3 id="two-themes">Two themes, and whose colors they are</h3>
          <p>
            The window is drawn in beam&rsquo;s colors, all of them, light and
            dark: white with a stone gray chrome on a light page, the near black
            the app used on a dark one, its purple for the capture, its grays
            for the placeholders. That is not this page&rsquo;s palette, and it
            should not be, because the window is a drawing of beam and beam was
            those colors. What is the page&rsquo;s is everything around the
            window: the title above it, the chapter bar under it, and the glow
            it stands on, which is the site&rsquo;s four washes, green, purple,
            orange and red, that used to sit behind the whole page, painted
            behind the window alone and blurred, so the page&rsquo;s ground
            shows through round them.
          </p>

          <h3 id="only-when-youre-looking">Only while you are looking</h3>
          <p>
            Under <code>prefers-reduced-motion</code> the loop does not run. The
            window opens on the browser, and the three chapters place their
            states rather than play them: the journal, the capture pose with the
            highlight on its last block, the published note. Every transition
            and animation in the drawing is switched off with it, so a chapter
            appears rather than arrives. The window stays a working window
            either way.
          </p>

          <h2 id="beam">beam, the app</h2>
          <p>
            beam was a browser and a notes app in one window, for the Mac, built
            by a small passionate team. The web on one side, your journal on the other, one
            key between them, and <kbd>⌥</kbd> click to take any piece of a page
            with you. It deserved to outlive the site and the app existence, so it has.
          </p>
          <PrevNextNavigation currentComponentId={componentId} />
        </BeamDemo>
      </div>
    </>
  );
};

export default BeamDemoPage;
