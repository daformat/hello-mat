import { SplitFlapDisplay } from "@daformat/react-split-flap-display";
import { GetStaticProps } from "next";
import Link from "next/link";
import {
  CSSProperties,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  BundledLanguage,
  BundledTheme,
  CodeToHastOptions,
  codeToHtml,
} from "shiki";

import { MaybeUndefined } from "@/components/Media/utils/maybe";
import { PrevNextNavigation } from "@/components/Navigation/PrevNextNavigation";
import { PageMetas } from "@/components/PageMetas/PageMetas";
import styles from "@/components/SplitFlapDisplay/SplitFlapDisplay.module.scss";
import { TableOfContents } from "@/components/TableOfContents/TocComponent";
import { Tabs } from "@/components/Tabs/Tabs";
import { Checkbox } from "@/components/ui/Checkbox/Checkbox";
import {
  ComponentId,
  COMPONENTS,
} from "@/constants/design-engineering/components";

const tsxSource = `
import { useEffect, useState } from "react";
import { SplitFlapDisplay } from "@daformat/react-split-flap-display";
import styles from "./styles.module.css";

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const WORDS = ["HELLO", "WORLD", "REACT", "FLIP"];

export const Demo = () => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % WORDS.length), 3000);
    return () => clearInterval(id);
  }, []);

  return (
    <SplitFlapDisplay
      value={WORDS[index]}
      length={5}
      characters={CHARS}
      flipDuration={800}
      className={styles.split_flap_display}
    />
  );
};
`.trim();

const cssSource = `
.split_flap_display {
  --ease-out-cubic: cubic-bezier(.215, .61, .355, 1);
  display: flex;
  font-size: 3.5em;
  gap: 2px; /* gap between characters */
  transition: transform 500ms var(--ease-out-cubic);

  [data-split-flap-character] {
    /* prevent elements from showing through the crease */
    &::after {
      background-color: var(--color-background);
      content: "";
      display: block;
      height: var(--split-flap-crease);
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      width: 100%;
    }

    > [data-split-flap-flap] {
      background: var(--color-background);
      border-radius: 3px;
      box-shadow: inset 0 0 2px 0.75px var(--color-border-2),
      inset 0 0 0 1px var(--color-border-1);
      box-sizing: content-box;
      height: 0.5em;
      line-height: 1;
      width: 1em;

      /* Top flap - flips down */
      &[data-split-flap-flap="top"] {
        align-items: flex-start;
        padding-top: 0.25em;
      }

      /* Bottom flap - flips up */
      &[data-split-flap-flap="bottom"] {
        align-items: flex-end;
        padding-bottom: 0.25em;
      }
    }
  }
}
`.trim();

interface CodeBlocks {
  tsx: string;
  css: string;
  installInstructionsNpm: string;
  installInstructionsYarn: string;
  installInstructionsPnpm: string;
  installInstructionsBun: string;
  installInstructionsDeno: string;
}

export const getStaticProps: GetStaticProps<CodeBlocks> = async () => {
  const getOptions = (
    lang: BundledLanguage
  ): CodeToHastOptions<BundledLanguage, BundledTheme> => ({
    lang,
    themes: {
      light: "vitesse-light",
      dark: "houston",
    },
    tabindex: false,
  });

  const tsx = await codeToHtml(tsxSource, getOptions("tsx"));

  const css = await codeToHtml(cssSource, getOptions("css"));

  const installInstructionsSourceNpm = `
npm install @daformat/react-split-flap-display
  `.trim();
  const installInstructionsNpm = await codeToHtml(
    installInstructionsSourceNpm,
    getOptions("bash")
  );

  const installInstructionsSourceYarn = `
yarn add @daformat/react-split-flap-display
  `.trim();
  const installInstructionsYarn = await codeToHtml(
    installInstructionsSourceYarn,
    getOptions("bash")
  );

  const installInstructionsSourcePnpm = `
pnpm add @daformat/react-split-flap-display
  `.trim();
  const installInstructionsPnpm = await codeToHtml(
    installInstructionsSourcePnpm,
    getOptions("bash")
  );

  const installInstructionsSourceBun = `
bun add @daformat/react-split-flap-display
  `.trim();
  const installInstructionsBun = await codeToHtml(
    installInstructionsSourceBun,
    getOptions("bash")
  );

  const installInstructionsSourceDeno = `
deno add npm:@daformat/react-split-flap-display
  `.trim();
  const installInstructionsDeno = await codeToHtml(
    installInstructionsSourceDeno,
    getOptions("bash")
  );

  return {
    props: {
      tsx,
      css,
      installInstructionsNpm,
      installInstructionsYarn,
      installInstructionsPnpm,
      installInstructionsBun,
      installInstructionsDeno,
    },
  };
};

const componentId: ComponentId = "split-flap-display";

const SplitFlapDisplayPage = (props: CodeBlocks) => {
  const component = COMPONENTS[componentId];
  return (
    <>
      <PageMetas {...component.metas} />
      <TableOfContents.Provider>
        <SplitFlapDisplayPageContent {...props} />
      </TableOfContents.Provider>
    </>
  );
};

const clockChars = [
  "012",
  "0123456789",
  ":",
  "012345",
  "0123456789",
  ":",
  "012345",
  "0123456789",
];

const messages = [
  "HELLO",
  "CIAO",
  "HALLO",
  "NIHAO",
  "SALUT",
  "HEJ",
  "PAKA",
  "HEY",
  "ALOHA",
];

const formatTime = (date: Date) => {
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const seconds = date.getSeconds().toString().padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
};

const SplitFlapDisplayPageContent = (props: CodeBlocks) => {
  const tocContext = TableOfContents.useToc();
  const contentRef = useRef<HTMLDivElement>(null);
  const [time, setTime] = useState(() => new Date());
  const [clockRunning, setClockRunning] = useState(true);
  const [rotateDisplay, setRotateDisplay] = useState(false);
  const [message, setMessage] = useState<string>(messages[0] ?? "HELLO");
  const [rotateDisplay2, setRotateDisplay2] = useState(false);
  const [slow, setSlow] = useState(false);
  const [slow2, setSlow2] = useState(false);
  const newMessageTimeoutRef =
    useRef<MaybeUndefined<ReturnType<typeof setTimeout>>>(null);

  const incrementTime = useCallback(() => {
    setTime((time) => new Date(time.getTime() + 1000));
  }, []);

  const _incrementTime2 = useCallback(() => {
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
  }, []);

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

  const clockStyle = useMemo(
    () => ({
      transform: rotateDisplay ? "rotateY(-45deg) translateX(-12%)" : undefined,
    }),
    [rotateDisplay]
  );

  const alphaStyle = useMemo(
    () => ({
      transform: rotateDisplay2
        ? "rotateY(-45deg) translateX(-12%)"
        : undefined,
    }),
    [rotateDisplay2]
  );

  return (
    <>
      <TableOfContents.Root />
      <div ref={contentRef} className="prose page">
        <Link href="/design-engineering" className="back_link">
          Back to gallery
        </Link>
        <h1 id="design-engineering-a-split-flap-display">
          Design engineering: a split-flap display component
        </h1>
        <p>
          An animated split-flap display component, like the ones you’d see in
          old train stations and airports, bringing back some nostalgic
          memories. This component is inspired by a similar component I made
          back in 2012, with many improvements. Instead of faking the physical
          spool like many implementations do, I decided to stay as close as
          possible to the physical split-flap displays: the flaps really do
          rotate along the drum (try checking the <code>Rotate display</code>{" "}
          option). Even tough there may be shortcomings to this approach,
          I&nbsp;took it as a chance to practice. You can{" "}
          <a href="#install">install</a> the open-source package and star adding
          split-flap displays to your site or application
        </p>

        <h2 id="install">Install</h2>
        <p>
          Open the repo in{" "}
          <a
            href="https://github.com/daformat/react-swipeable-cards"
            target="_blank"
            rel="noopener"
          >
            Github
          </a>{" "}
          (and drop a star if you like it!), view{" "}
          <a href="#quick-start">quick-start</a> to get started
        </p>
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
              content: (
                <div
                  dangerouslySetInnerHTML={{
                    __html: props.installInstructionsNpm,
                  }}
                />
              ),
            },
            {
              id: "install-yarn",
              trigger: (
                <h4 id="install-yarn" data-no-toc={""}>
                  yarn
                </h4>
              ),
              content: (
                <div
                  dangerouslySetInnerHTML={{
                    __html: props.installInstructionsYarn,
                  }}
                />
              ),
            },
            {
              id: "install-pnpm",
              trigger: (
                <h4 id="install-pnpm" data-no-toc={""}>
                  pnpm
                </h4>
              ),
              content: (
                <div
                  dangerouslySetInnerHTML={{
                    __html: props.installInstructionsPnpm,
                  }}
                />
              ),
            },
            {
              id: "install-bun",
              trigger: (
                <h4 id="install-bun" data-no-toc={""}>
                  bun
                </h4>
              ),
              content: (
                <div
                  dangerouslySetInnerHTML={{
                    __html: props.installInstructionsBun,
                  }}
                />
              ),
            },
            {
              id: "install-deno",
              trigger: (
                <h4 id="install-deno" data-no-toc={""}>
                  deno
                </h4>
              ),
              content: (
                <div
                  dangerouslySetInnerHTML={{
                    __html: props.installInstructionsDeno,
                  }}
                />
              ),
            },
          ]}
        />

        <h2 id="split-flap-clock">Fig. 1: a split-flap clock</h2>
        <p>
          A traditional split-flap clock, cycling through digits as time passes,
          a timeless design if you ask me. For this one I’m simply passing the
          digits for each slot and the <code>:</code> character.
        </p>
        <div
          className="demo card alt"
          style={{
            marginBlock: 32,
            padding: 0,
            marginInline: "auto",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            backgroundColor: "transparent",
          }}
        >
          <div
            style={
              {
                padding: "clamp(16px, 5vw, 128px) 8px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                flexGrow: 1,
                perspective: "550px",
                filter: "drop-shadow(0 1px 12px var(--color-shadow-1))",
              } as CSSProperties
            }
          >
            <SplitFlapDisplay
              length={8}
              characters={clockChars}
              value={formatTime(time)}
              style={clockStyle}
              flipDuration={800 / (slow ? 0.1 : 1)}
              className={styles.split_flap_display}
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
            style={
              {
                padding: "clamp(16px, 5vw, 128px) 8px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                flexGrow: 1,
                perspective: "550px",
                filter: "drop-shadow(0 1px 12px var(--color-shadow-1))",
              } as CSSProperties
            }
          >
            <SplitFlapDisplay
              length={5}
              characters="ABCDEFGHIJKLMNOPQRSTUVWXYZ "
              value={message}
              style={alphaStyle}
              onFullyFlipped={handleFullyFlipped}
              flipDuration={800 / (slow2 ? 0.1 : 1)}
              className={styles.split_flap_display}
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
        <div style={{ textAlign: "right", marginTop: "-24px" }}>
          <button
            className="button"
            onClick={() => setSlow2(false)}
            data-state={!slow2 ? "active" : undefined}
            aria-pressed={!slow2 ? "true" : "false"}
            title="Set normal animation speed"
          >
            100%
          </button>{" "}
          <button
            className="button"
            onClick={() => setSlow2(true)}
            data-state={slow2 ? "active" : undefined}
            aria-pressed={slow2 ? "true" : "false"}
            title="Set slow animation speed"
          >
            10%
          </button>
        </div>

        <h2 id="quick-start">Quick start</h2>
        <p>
          Below is a minimal example to reproduce the examples above, view the
          full{" "}
          <a
            href={
              "https://github.com/daformat/hello-mat/blob/master/pages/design-engineering/component/split-flap-display.tsx"
            }
            target="_blank"
            rel="noopener"
          >
            tsx
          </a>{" "}
          and{" "}
          <a
            href={
              "https://github.com/daformat/hello-mat/blob/master/components/SplitFlapDisplay/SplitFlapDisplay.module.scss"
            }
            target="_blank"
            rel="noopener"
          >
            scss
          </a>{" "}
          on github
        </p>
        <p>
          <strong>Note:</strong> you will likely want to set `perspective:
          550px;` (or any other value) and `transform-style: preserve-3d;` on
          the root.
        </p>
        <Tabs
          defaultValue="tsx"
          tabs={[
            {
              id: "tsx",
              trigger: (
                <h4 id="tsx" data-no-toc={""}>
                  tsx
                </h4>
              ),
              content: (
                <div
                  dangerouslySetInnerHTML={{
                    __html: props.tsx,
                  }}
                />
              ),
            },
            {
              id: "css",
              trigger: (
                <h4 id="css" data-no-toc={""}>
                  css
                </h4>
              ),
              content: (
                <div
                  dangerouslySetInnerHTML={{
                    __html: props.css,
                  }}
                />
              ),
            },
          ]}
        />

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
        <PrevNextNavigation currentComponentId={componentId} />
      </div>
    </>
  );
};

export default SplitFlapDisplayPage;
