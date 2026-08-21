import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { ArticleDates } from "@/components/Navigation/ArticleDates";
import { PrevNextNavigation } from "@/components/Navigation/PrevNextNavigation";
import { ComponentPageMetas } from "@/components/PageMetas/ComponentPageMetas";
import { PublishSplitButton } from "@/components/PublishButton/PublishButton";
import { TableOfContents } from "@/components/TableOfContents/TocComponent";
import { ComponentId } from "@/constants/design-engineering/components";

const componentId: ComponentId = "publish-button";

const PublishButtonPage = () => {
  return (
    <>
      <ComponentPageMetas componentId={componentId} />
      <TableOfContents.Provider>
        <PublishButtonPageContent />
      </TableOfContents.Provider>
    </>
  );
};

const PublishButtonPageContent = () => {
  const tocContext = TableOfContents.useToc();
  const contentRef = useRef<HTMLDivElement>(null);
  const [slow, setSlow] = useState(false);

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
        <h1 id="design-engineering-a-publish-button">
          A publish button with real feedback states
        </h1>
        <ArticleDates componentId={componentId} />
        <p>
          Whenever something is publishable, you need an action for that. And
          when it’s published, you need an action to unpublish it, and maybe
          additional actions that should be available when published. This
          publish button was created at{" "}
          <a target="_blank" rel="noopener" href="https://beamapp.co">
            beam
          </a>{" "}
          to solve this problem.
        </p>
        <p>
          Following beam’s minimalistic approach to design, the button is just
          an icon, until hovered or focused. In either of these states, the
          button reveals the action label. Clicking the button transitions the
          content to feedback about what’s happening, or about what’s happened
          in the case of successful / unsuccessful publishing or unpublishing.
        </p>
        <h2>Interactive demo</h2>
        <p>
          Network calls are simulated and can fail with a 25% probability, click
          a few times and the outcome <strong>might be different</strong>, you
          can also use the buttons below the card to slow down animations.
        </p>
        <div style={{ marginTop: "1em" }}>
          <div
            className="card"
            style={{
              backgroundColor: "var(--color-card-background-secondary)",
              alignItems: "center",
              display: "flex",
              justifyContent: "flex-end",
              gap: "0.5em",
              width: "100%",
              overflow: "hidden",
              paddingInline: 14,
            }}
          >
            <span style={{ opacity: 0.5 }}>
              <span className="above_medium">Hover and click this</span> -&gt;
            </span>
            <PublishSplitButton speed={slow ? 0.1 : 1} />
          </div>
          <div style={{ textAlign: "right", marginTop: "0.5em" }}>
            <button
              className="button"
              onClick={() => setSlow(false)}
              data-state={!slow ? "active" : undefined}
              aria-pressed={!slow ? "true" : "false"}
              title="Set normal animation speed"
            >
              100%
            </button>{" "}
            <button
              className="button"
              onClick={() => setSlow(true)}
              data-state={slow ? "active" : undefined}
              aria-pressed={slow ? "true" : "false"}
              title="Set slow animation speed"
            >
              10%
            </button>
          </div>
        </div>
        <h2 id="the-timings">The timings</h2>
        <p>
          The simulated request takes a random time between 1.5 and 3.5 seconds,
          which is deliberate. A fixed duration lets you learn the animation
          instead of reading the state, and it quietly hides the case that
          actually matters, the one where the network takes longer than the
          transition you designed for it.
        </p>
        <p>
          The result then sits there for two seconds before the button goes back
          to its resting label, which is long enough to read and short enough
          that the button doesn’t feel stuck. If you move the pointer back onto
          it while the result is showing, that timer is thrown away and
          restarted, so the feedback never disappears from under the cursor of
          someone who came back to check what happened. Clicking again while a
          request is in flight does <strong>nothing at all</strong>: the handler
          bails out when there is already a pending timeout, so you can’t stack
          publishes on top of each other.
        </p>
        <h2 id="slowing-it-down">Slowing it down</h2>
        <p>
          The 10% control doesn’t touch any of that. It sets a{" "}
          <code>--speed</code> custom property that the transition duration is
          divided by, so every transition in the button stretches out together
          while the state machine underneath carries on at its normal pace.
          That’s the useful way round: you get to watch the motion at a speed
          you can actually see, without the thing you are inspecting behaving
          differently from the way it ships.
        </p>
        <PrevNextNavigation currentComponentId={componentId} />
      </div>
    </>
  );
};

export default PublishButtonPage;
