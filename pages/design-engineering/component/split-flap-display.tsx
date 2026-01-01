import Link from "next/link";
import {
  CSSProperties,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { MaybeUndefined } from "@/components/Media/utils/maybe";
import { NextCard } from "@/components/Navigation/NextCard";
import { PageMetas } from "@/components/PageMetas/PageMetas";
import { SplitFlapDisplay } from "@/components/SplitFlapDisplay/SplitFlapDisplay";
import { TableOfContents } from "@/components/TableOfContents/TocComponent";
import { Checkbox } from "@/components/ui/Checkbox/Checkbox";
import {
  COMPONENTS,
  getNextComponent,
} from "@/constants/design-engineering/components";

const SplitFlapDisplayPage = () => {
  const component = COMPONENTS["split-flap-display"] ?? {};
  return (
    <>
      <PageMetas {...component.metas} />
      <TableOfContents.Provider>
        <SplitFlapDisplayPageContent />
      </TableOfContents.Provider>
    </>
  );
};

const formatTime = (date: Date) => {
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const seconds = date.getSeconds().toString().padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
};

const SplitFlapDisplayPageContent = () => {
  const nextComponent = getNextComponent("split-flap-display");
  const tocContext = TableOfContents.useToc();
  const contentRef = useRef<HTMLDivElement>(null);
  const [time, setTime] = useState(() => new Date());
  // const [time, setTime] = useState(() => new Date("Mon, 29 Dec 2025 23:59:55"));
  const [clockRunning, setClockRunning] = useState(true);
  const [rotateDisplay, setRotateDisplay] = useState(false);
  const [message, setMessage] = useState<string>("HELLO");
  const [rotateDisplay2, setRotateDisplay2] = useState(false);
  const [slow, setSlow] = useState(false);
  const newMessageTimeoutRef =
    useRef<MaybeUndefined<ReturnType<typeof setTimeout>>>();
  const messages = useMemo(
    () => [
      "HELLO",
      "CIAO",
      "HALLO",
      "NIHAO",
      "SALUT",
      "HEJ",
      "PAKA",
      "HEY",
      "ALOHA",
    ],
    []
  );

  const incrementTime = useCallback(() => {
    setTime((time) => new Date(time.getTime() + 1000));
  }, []);

  const incrementTime2 = useCallback(() => {
    setTime((time) => new Date(time.getTime() + 1000 * 60 * 15));
  }, []);

  const incrementMessage = useCallback(() => {
    if (newMessageTimeoutRef.current) {
      clearTimeout(newMessageTimeoutRef.current);
    }
    setMessage(
      (message) =>
        messages[(messages.indexOf(message) + 1) % messages.length] ?? message
    );
  }, [messages]);

  useEffect(() => {
    if (clockRunning) {
      const interval = setInterval(incrementTime, 1_000 / (slow ? 0.1 : 1));
      return () => clearInterval(interval);
    }
  }, [clockRunning, incrementTime, slow]);

  useEffect(() => {
    if (contentRef.current) {
      tocContext.setRootElement(contentRef.current);
    }
  });

  const handleFullyFlipped = useCallback(() => {
    if (newMessageTimeoutRef.current) {
      clearTimeout(newMessageTimeoutRef.current);
    }
    newMessageTimeoutRef.current = setTimeout(incrementMessage, 5000);
  }, [incrementMessage]);

  return (
    <>
      <TableOfContents.Root />
      <div ref={contentRef} className="prose page">
        <Link href="/design-engineering" className="back_link">
          Back to gallery
        </Link>
        <h1 id="design-engineering-a-swipeable-cards-carousel">
          Design engineering: a split-flap display component
        </h1>
        <p>
          An animated split-flap display component, bringing back some nostalgic
          memories. This component is inspired by a similar component I made
          back in 2012, with many improvements. Instead of faking the physical
          spool like many implementations do, I decided to stay as close as
          possible to the physical split-flap displays: the flaps really do
          rotate along the drum (try checking the <code>Rotate display</code>{" "}
          option). Even tough there may be shortcomings to this approach,
          I&nbsp;took it as a chance to practice.
        </p>

        <h2 id="split-flap-clock">Fig. 1: a split-flap clock</h2>
        <p>
          A traditional split-flap clock, cycling through digits as time passes,
          a timeless design if you ask me. For this one I’m simply passing the
          digits and the <code>:</code> character, and there’s a helpful prop
          that allows to skip intermediary characters in order to only have
          digits where appropriate without defining a different character range
        </p>
        <div
          className="demo card alt"
          style={{
            marginBlock: 32,
            padding: 0,
            // maxWidth: 650,
            marginInline: "auto",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            backgroundColor: "transparent",
          }}
        >
          <div
            style={{
              padding: "clamp(16px, 5vw, 128px) 8px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              flexGrow: 1,
              perspective: "550px",
              filter: "drop-shadow(0 1px 12px var(--color-shadow-1))",
              "--speed": `${slow ? 0.1 : 1}`,
            } as CSSProperties}
          >
            <SplitFlapDisplay
              length={8}
              characters={[
                "012",
                "0123456789",
                ":",
                "012345",
                "0123456789",
                ":",
                "012345",
                "0123456789",
              ]}
              // value={formatSeconds(timeInSeconds).split("").reverse().join("")}
              value={formatTime(time)}
              autoSkip
              style={{
                transform: rotateDisplay
                  ? "rotateY(-45deg) translateX(-12%)"
                  : undefined,
              }}
            />
          </div>
          <footer
            style={{
              padding: "8px 12px",
              backgroundColor: "var(--color-card-background)",
              width: "100%",
              display: "flex",
              alignItems: "center",
              borderBottomLeftRadius: "inherit",
              borderBottomRightRadius: "inherit",
              justifyContent: "space-between",
              boxShadow:
                "inset 0 0 2px 0.75px var(--color-border-2), inset 0 0 0 0.75px var(--color-border-3)",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <button
                className="button alt"
                onClick={incrementTime}
                style={{
                  padding: "8px 12px",
                }}
              >
                +1 second
              </button>
              {/*<button*/}
              {/*  className="button alt"*/}
              {/*  onClick={incrementTime2}*/}
              {/*  style={{*/}
              {/*    padding: "8px 12px",*/}
              {/*  }}*/}
              {/*>*/}
              {/*  +15 minutes*/}
              {/*</button>*/}
              <label
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  whiteSpace: "nowrap",
                }}
              >
                <Checkbox
                  defaultChecked={clockRunning}
                  onChange={(event) => setClockRunning(event.target.checked)}
                />
                <small style={{ opacity: 0.8 }}>
                  {clockRunning ? "Clock running" : "Clock paused"}
                </small>
              </label>
            </div>
            <label
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Checkbox
                defaultChecked={rotateDisplay}
                onChange={(event) => setRotateDisplay(event.target.checked)}
              />
              <small style={{ opacity: 0.8 }}>Rotate display</small>
            </label>
          </footer>
        </div>
        <div style={{ textAlign: "right", marginTop: "-24px" }}>
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

        <h2 id="alphabetic-split-flap-display">
          Fig. 2: An alphabetic split-flap display
        </h2>

        <p>
          A split-flap display that cycles through the alphabet and display
          rolling messages. For this one, we flip through the entire spool and
          trigger a new message after the current message is finished
          displaying.
        </p>

        <div
          className="demo card alt"
          style={{
            marginBlock: 32,
            padding: 0,
            // maxWidth: 650,
            marginInline: "auto",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            backgroundColor: "transparent",
          }}
        >
          <div
            style={{
              padding: "clamp(16px, 5vw, 128px) 8px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              flexGrow: 1,
              perspective: "550px",
              filter: "drop-shadow(0 1px 12px var(--color-shadow-1))",
            }}
          >
            <SplitFlapDisplay
              length={5}
              characters="ABCDEFGHIJKLMNOPQRSTUVWXYZ "
              // value={formatSeconds(timeInSeconds).split("").reverse().join("")}
              value={message}
              style={{
                transform: rotateDisplay2
                  ? "rotateY(-45deg) translateX(-12%)"
                  : undefined,
              }}
              onFullyFlipped={handleFullyFlipped}
            />
          </div>
          <footer
            style={{
              padding: "8px 12px",
              backgroundColor: "var(--color-card-background)",
              width: "100%",
              display: "flex",
              alignItems: "center",
              borderBottomLeftRadius: "inherit",
              borderBottomRightRadius: "inherit",
              justifyContent: "space-between",
              boxShadow:
                "inset 0 0 2px 0.75px var(--color-border-2), inset 0 0 0 0.75px var(--color-border-3)",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <button
                className="button alt"
                onClick={incrementMessage}
                style={{
                  padding: "8px 12px",
                  // borderRadius: 4,
                  // border: "1px solid var(--color-border-2)",
                  // background: "var(--color-background)",
                  // color: "inherit",
                  // cursor: "pointer",
                  // fontSize: "0.875rem",
                }}
              >
                Next message
              </button>
            </div>
            <label
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Checkbox
                defaultChecked={rotateDisplay2}
                onChange={(event) => setRotateDisplay2(event.target.checked)}
              />
              <small style={{ opacity: 0.8 }}>Rotate display</small>
            </label>
          </footer>
        </div>
        <h2 id="safari-warning">A word for Safari users</h2>
        <p>
          I tried my best to mitigate it, but Safari being Safari, there are
          glitches after some time, the previous character’s rotated flaps might
          be occluding the current character’s flaps. I find it personally very
          sad that this browser, which used to be at the cutting edge of CSS3 is
          now riddled with so many edge-cases and bugs, even the developer tools
          freeze on this page, where other browsers are perfectly fine and
          snappy. So long story short, there are some glitches, I know about
          them, and I will keep trying to iron them out, but man, this is so
          painful to do.
        </p>
        <h2 id="component-props">Component props</h2>
        <p>This component accepts several props:</p>
        <ul>
          <li>
            <code>value</code>: the current value to display
          </li>
          <li>
            <code>length</code>: the total display length
          </li>
          <li>
            <code>characters</code>: the character range to use
          </li>
          <li>
            <code>autoSkip</code>: whether to skip the in-between characters
            when the new character isn’t the natural next character
          </li>
          <li>
            <code>onFullyFlipped</code>: a callback that will be called when the
            display is finished flipping through characters to display the
            current value
          </li>
        </ul>

        <h2 id="conclusion">That’s a wrap</h2>
        <p>
          I wanted an a real split-flap display component with a rolling drum
          and implemented it with React, css, and JavaScript, the component
          accepts a range of characters and creates as many flaps as there are
          characters. While there might be performance implications, I favoured
          recreating the full barrel effect as an exercise. I hope you enjoyed
          the demos. Stay tuned.
        </p>
        <NextCard href={nextComponent.metas.url}>
          {nextComponent.shortTitle}
        </NextCard>
      </div>
    </>
  );
};

export default SplitFlapDisplayPage;
