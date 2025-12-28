import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { NextCard } from "@/components/Navigation/NextCard";
import { SplitFlapDisplay } from "@/components/SplitFlapDisplay/SplitFlapDisplay";
import { TableOfContents } from "@/components/TableOfContents/TocComponent";
import {
  COMPONENTS,
  getNextComponent,
} from "@/constants/design-engineering/components";
import { Checkbox } from "@/components/ui/Checkbox/Checkbox";

const SplitFlapDisplayPage = () => {
  const component = COMPONENTS["split-flap-display"] ?? {};
  return (
    <>
      {/*<PageMetas {...component.metas} />*/}
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

const formatSeconds = (totalSeconds: number) => {
  const hours = Math.floor(totalSeconds / 3600) % 24;
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
};

// 13:37:42 = 13*3600 + 37*60 + 42 = 49062 seconds
const INITIAL_TIME = 13 * 3600 + 37 * 60 + 42;

const SplitFlapDisplayPageContent = () => {
  const nextComponent = getNextComponent("split-flap-display") ?? {};
  const tocContext = TableOfContents.useToc();
  const contentRef = useRef<HTMLDivElement>(null);
  const [time, setTime] = useState(() => new Date());
  const [rotateDisplay, setRotateDisplay] = useState(false);
  const [clockRunning, setClockRunning] = useState(true);

  const incrementTime = () => {
    setTime((time) => new Date(time.getTime() + 1000));
  };

  useEffect(() => {
    if (clockRunning) {
      const interval = setInterval(() => {
        setTime((time) => new Date(time.getTime() + 1000));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [clockRunning]);

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
        <h1 id="design-engineering-a-swipeable-cards-carousel">
          Design engineering: a split flap display component
        </h1>
        <p>
          An animated number input component, inspired by the{" "}
          <a href={"https://family.co/"} target="_blank" rel="noopener">
            Family crypto wallet
          </a>{" "}
          and{" "}
          <a
            href={"https://number-flow.barvian.me/"}
            target="_blank"
            rel="noopener"
          >
            Number Flow
          </a>
          . Try typing a number below, when you’ll have some numbers typed in,
          select a single number and replace it with another number to see a
          barrel wheel effect like the one popularized by Number Flow.
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
              length={8}
              characters="0123456789:"
              // value={formatSeconds(timeInSeconds).split("").reverse().join("")}
              value={formatTime(time).split("").reverse().join("")}
              style={{
                transform: rotateDisplay
                  ? "rotateY(45deg) translateX(12%)"
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
              gap: 8
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <button
                className="button alt"
                onClick={incrementTime}
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
                +1 second
              </button>
              <label
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  whiteSpace: "nowrap"
                }}
              >
                <Checkbox
                  defaultChecked={clockRunning}
                  onChange={(event) => setClockRunning(event.target.checked)}
                />
                <small style={{ opacity: 0.8 }}>Running clock</small>
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

        <h2 id="features">Features</h2>
        <h3 id="animated-digits">Animated digits</h3>
        <ul>
          <li>
            <strong>Numbers are animated as they get inserted</strong>, we
            animate them up and animate their width at the same time so the
            input smoothly resizes as the user types.
          </li>
          <li>
            <strong>
              Selecting and replacing a digit with another digit creates a
              barrel wheel effect
            </strong>
            , the direction of the wheel depends on whether the new number is
            larger or smaller than the old one.
          </li>
          <li>
            <strong>
              Replacing a digit that is already in a barrel wheel animation
              smoothly interrupts and restart the barrel wheel
            </strong>{" "}
            so that it animates to the latest digit.
          </li>
          <h3>Accepted characters</h3>
          <ul>
            <li>
              Only digits, one decimal point, and one minus sign are allowed.
            </li>
            <li>Uses a numeric keyboard on mobile devices.</li>
            <li>
              The minus sign can only be placed at the beginning of the input.
            </li>
            <li>
              When inserting a decimal point, the component can automatically
              add the leading 0 if the <code>autoAddLeadingZero</code> prop is
              set to <code>true</code>.
            </li>
            <li>
              The component accepts an optional <code>maxLength</code> prop.
            </li>
          </ul>
        </ul>

        <h2 id="implementation">Implementation</h2>
        <p>
          The implementation of this component uses <code>contentEditable</code>{" "}
          in order to be able to animate the digits as they are typed. Relying
          on <code>contentEditable</code> allows to use markup, contrary to a
          regular input, but this comes with quite a few caveats.
        </p>
        <h3 id="react-cant-help">React can’t help with content editable</h3>
        <p>
          Since the browser will insert content as the user types, the children
          of the content editable have to be managed outside of React. We are
          responsible for DOM manipulation, which can be a little tedious.
        </p>
        <h3 id="preventing-rich-text-shortcuts">
          Preventing content editable rich text shortcuts
        </h3>
        <p>
          Content editable is designed to allow rich text formatting, and
          arbitrary markup to be inserted, for our input we need to prevent
          this. This is done via <code>event.preventDefault()</code>, simple yet
          effective.
        </p>
        <h3 id="custom-cursor-handling">Custom cursor handling</h3>
        <p>
          In rich text, cursor positions move between nodes, this means that
          when you insert a <code>span</code> the cursor position can be inside,
          or outside of the span. This means that there more than on logical
          cursor position mapping to the same visual position. Which means the
          user would have to press the arrow keys twice to move the cursor to
          the next digit. This is definitely not ideal.
        </p>
        <p>
          We need to handle cursor positioning ourselves. This also means we
          need to implement things such as <kbd>alt+arrow</kbd> or{" "}
          <kbd>cmd+arrow</kbd> in order to move the cursor to the beginning or
          end of the input (depending on which arrow the user pressed).
        </p>
        <p>
          Because of this, we also need to implement a custom selection, too.
        </p>

        <h3 id="custom-history">Custom history (undo/redo)</h3>
        <p>
          Since we manipulate the content ourselves and manipulate the DOM
          directly, we can’t rely on the native history for the content
          editable, we have to implement history on our own. The implementation
          here is pretty naive, but it works and restore cursor position as the
          user undoes/redoes.
        </p>

        <h3 id="custom-clipboard">Custom clipboard</h3>
        <p>
          Since we have rich text markup in our input, and we want to copy a raw
          number to the clipboard, we also need to handle copy operations
          ourselves in order to clean the markup.
        </p>
        <h2 id="conclusion">That’s a wrap</h2>
        <p>
          I wanted an input that animates in a similar way to the{" "}
          <a
            href={"https://number-flow.barvian.me/"}
            target="_blank"
            rel="noopener"
          >
            Number Flow
          </a>
          component, and the{" "}
          <a href={"https://family.co/"} target="_blank" rel="noopener">
            Family crypto wallet
          </a>{" "}
          inputs. Number Flow is great, but it doesn’t really have an input
          mode. What they do in their examples is that they basically overlay
          the number flow component on top of an input, but I wanted more
          animation options than that. In the end, using content editable is
          quite tricky, because you have to re-implement many things that are a
          given with a regular input if you want it to feel right and provide a
          decent UX.
        </p>
        <NextCard href={nextComponent.metas.url}>
          {nextComponent.shortTitle}
        </NextCard>
      </div>
    </>
  );
};

export default SplitFlapDisplayPage;
