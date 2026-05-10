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

const componentStructureSource = `
<SplitFlapDisplay.Root>
  <SplitFlapDisplay.Slot>
    <SplitFlapDisplay.Character>
      <SplitFlapDisplay.Flap position="top" />
      <SplitFlapDisplay.Flap position="bottom" />
    </SplitFlapDisplay.Character>
    {/* ...one Character per character in the set */}
  </SplitFlapDisplay.Slot>
  {/* ...as many Slot as \`length\` */}
</SplitFlapDisplay.Root>
`.trim();

const tsxSource = `
import { useState } from "react";
import { SplitFlapDisplay } from "@daformat/react-split-flap-display";
import styles from "./styles.module.css";

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ ";
const WORDS = ["HELLO", "WORLD", "REACT", "FLIP"];

export const Demo = () => {
  const [word, setWord] = useState<string>(WORDS[0] ?? "HELLO");
  const newMessageTimeoutRef =
    useRef<ReturnType<typeof setTimeout>>(null);

  const incrementMessage = useCallback(() => {
    if (newMessageTimeoutRef.current) {
      clearTimeout(newMessageTimeoutRef.current);
      newMessageTimeoutRef.current = null
    }
    setWord(
      (word) =>
        WORDS[(WORDS.indexOf(word) + 1) % WORDS.length] ?? word
    );
  }, []);

  const handleFullyFlipped = useCallback(() => {
    if (newMessageTimeoutRef.current) {
      clearTimeout(newMessageTimeoutRef.current);
    }
    newMessageTimeoutRef.current = setTimeout(incrementMessage, 5000);
  }, [incrementMessage]);

  return (
    <SplitFlapDisplay.Root
      value={word}
      length={5}
      characters={CHARS}
      flipDuration={800}
      onFullyFlipped={handleFullyFlipped}
      className={styles.split_flap_display}
    />
  );
};
`.trim();

const cssSource = `
/*
  DO NOT use filter: drop-shadow(...) on the SplitFlapDisplay.Root element;
  this creates a new stacking context, which WILL flatten the 3d transforms
 */
.split_flap_display {
  --ease-out-cubic: cubic-bezier(0.215, 0.61, 0.355, 1);
  --color-background: #feefe7;
  --color-border-1: rgba(255, 255, 255, 0.6);
  --color-border-2: rgba(255, 255, 255, 0.001);
  --color-shadow-1: rgba(102, 27, 33, 0.05);

  display: flex;
  font-size: 3.5em;
  gap: 2px; /* gap between characters */

  [data-split-flap-character] {
    /* prevent elements from showing through the crease */
    &::after {
      background-color: var(--color-background);
      content: "";
      display: block;
      /* this variable is set by the component */
      height: var(--split-flap-crease);
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      width: 100%;
    }

    > [data-split-flap-flap] {
      background: var(--color-background);
      border-radius: 3px;
      box-shadow:
        inset 0 0 2px 0.75px var(--color-border-2),
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

// this is just to make typescript happy
const FLAP =
  "bg-[#feefe7] box-content h-[0.5em] w-[1em] leading-none rounded-[3px] " +
  "shadow-[inset_0_0_0_1px_rgba(255,255,255,0.6)]";

const tailwindSource = `
import { useCallback, useRef, useState } from "react";
import { SplitFlapDisplay } from "@daformat/react-split-flap-display";

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ ";
const WORDS = ["HELLO", "WORLD", "REACT", "FLIP"];

// Reused on both flaps - the only difference is the alignment and padding,
// which are applied separately on each <Flap>.
// The inner border uses an inset box-shadow (Tailwind's ring-1 is outset).
const FLAP =
  "bg-[#feefe7] box-content h-[0.5em] w-[1em] leading-none rounded-[3px] " +
  "shadow-[inset_0_0_0_1px_rgba(255,255,255,0.6)]";

export const Demo = () => {
  const [word, setWord] = useState<string>(WORDS[0] ?? "HELLO");
  const messageTimeoutRef =
    useRef<ReturnType<typeof setTimeout>>(null);

  const next = useCallback(() => {
    if (messageTimeoutRef.current) clearTimeout(messageTimeoutRef.current);
    setWord(
      (w) => WORDS[(WORDS.indexOf(w) + 1) % WORDS.length] ?? w,
    );
  }, []);

  const handleFullyFlipped = useCallback(() => {
    if (messageTimeoutRef.current) clearTimeout(messageTimeoutRef.current);
    messageTimeoutRef.current = setTimeout(next, 5000);
  }, [next]);

  return (
    <SplitFlapDisplay.Root
      value={word}
      length={5}
      characters={CHARS}
      flipDuration={800}
      onFullyFlipped={handleFullyFlipped}
      className="flex gap-[2px] text-[3.5em]"
    >
      {(index, characters, currentCharacter, onFullyFlipped) => (
        <SplitFlapDisplay.Slot
          key={index}
          index={index}
          characters={characters}
          currentCharacter={currentCharacter}
          onFullyFlipped={onFullyFlipped}
        >
          {(character, characterIndex) => (
            <SplitFlapDisplay.Character
              key={character}
              index={characterIndex}
              character={character}
              currentCharacter={currentCharacter}
            >
              {(c) => (
                <>
                  <SplitFlapDisplay.Flap
                    character={c}
                    position="top"
                    className={\`${FLAP} items-start pt-[0.25em]\`}
                  />
                  {/*
                    A real <span> instead of an ::after pseudo-element so
                    Tailwind users don't have to write arbitrary after:*
                    variants. This masks the gap between the two flaps so
                    nothing shows through the crease during the flip.
                  */}
                  <span
                    aria-hidden
                    className="absolute inset-x-0 top-1/2 -translate-y-1/2 bg-[white]"
                    style={{ height: "var(--split-flap-crease)" }}
                  />
                  <SplitFlapDisplay.Flap
                    character={c}
                    position="bottom"
                    className={\`${FLAP} items-end pb-[0.25em] transform-3d\`}
                  />
                </>
              )}
            </SplitFlapDisplay.Character>
          )}
        </SplitFlapDisplay.Slot>
      )}
    </SplitFlapDisplay.Root>
  );
};

// Then, where you want to use it, set perrspective on the <Demo/> container
// (or any other ancestor),
// Also if you want the drop shadow filter, it's important it is set on the
// container, not on the <SplitFlapDisplay.Root/> itself, otherwise this will
// flatten the 3d transforms
const App = () => {
  //...

  return (
    /*... */
    <div className="perspective-[550px] filter-[drop-shadow(0_1px_12px_rgba(102,27,33,0.05))]">
      <Demo/>
    </div>
    /* ... */
  );
};
`.trim();

interface CodeBlocks {
  tsx: string;
  css: string;
  tailwind: string;
  installInstructionsNpm: string;
  installInstructionsYarn: string;
  installInstructionsPnpm: string;
  installInstructionsBun: string;
  installInstructionsDeno: string;
  componentStructure: string;
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

  const componentStructure = await codeToHtml(
    componentStructureSource,
    getOptions("tsx")
  );

  const tsx = await codeToHtml(tsxSource, getOptions("tsx"));

  const css = await codeToHtml(cssSource, getOptions("css"));

  const tailwind = await codeToHtml(tailwindSource, getOptions("tsx"));

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
      tailwind,
      installInstructionsNpm,
      installInstructionsYarn,
      installInstructionsPnpm,
      installInstructionsBun,
      installInstructionsDeno,
      componentStructure,
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

// const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ ";
// const WORDS = ["HELLO", "WORLD", "REACT", "FLIP"];
//
// export const Demo = () => {
//   const [word, setWord] = useState<string>(WORDS[0] ?? "HELLO");
//   const newMessageTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);
//
//   const incrementMessage = useCallback(() => {
//     if (newMessageTimeoutRef.current) {
//       clearTimeout(newMessageTimeoutRef.current);
//       newMessageTimeoutRef.current = null;
//     }
//     setWord((word) => WORDS[(WORDS.indexOf(word) + 1) % WORDS.length] ?? word);
//   }, []);
//
//   const handleFullyFlipped = useCallback(() => {
//     if (newMessageTimeoutRef.current) {
//       clearTimeout(newMessageTimeoutRef.current);
//     }
//     newMessageTimeoutRef.current = setTimeout(incrementMessage, 5000);
//   }, [incrementMessage]);
//
//   return (
//     <SplitFlapDisplay.Root
//       value={word}
//       length={5}
//       characters={CHARS}
//       flipDuration={800}
//       onFullyFlipped={handleFullyFlipped}
//       className={styles.split_flap_display}
//       style={{ filter: "drop-shadow(0 1px 12px var(--color-shadow-1))" }}
//     />
//   );
// };

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
        {/*<Demo />*/}
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
          <a href="#install">install</a> the open-source package and start
          adding beautiful split-flap displays to your site or application.
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
            <SplitFlapDisplay.Root
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
            <SplitFlapDisplay.Root
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
          <strong>Note:</strong> you will likely want to set{" "}
          <code>perspective: 550px;</code> (or any other value) and
          <code>transform-style: preserve-3d;</code> on the root.
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
            {
              id: "tailwind",
              trigger: (
                <h4 id="tailwind" data-no-toc={""}>
                  tailwind (composition API)
                </h4>
              ),
              content: (
                <div
                  dangerouslySetInnerHTML={{
                    __html: props.tailwind,
                  }}
                />
              ),
            },
          ]}
        />

        <h2 id="component-api">Component API</h2>
        <p>
          The package exports a single namespace <code>SplitFlapDisplay</code>{" "}
          with four compound components: <code>Root</code>, <code>Slot</code>,{" "}
          <code>Character</code>, and <code>Flap</code>.{" "}
          <code>SplitFlapDisplay.Root</code> is the only one you need 99% of the
          time — it renders all four nested layers automatically. The other
          three exist for when you want to swap any layer for your own markup,
          like in the <code>tailwind</code> tab above.
        </p>
        <div
          dangerouslySetInnerHTML={{
            __html: props.componentStructure,
          }}
        />
        <p>
          When you don’t pass a <code>children</code> render-prop to a given
          level, that level renders the level below automatically. So you can
          compose only the layers you care about and let the defaults handle the
          rest.
        </p>

        <h3 id="splitflapdisplay-root">
          <code>SplitFlapDisplay.Root</code>
        </h3>
        <p>
          The outermost wrapper. Owns the value, the length, the character set
          and the flip timing. Renders a <code>&lt;div&gt;</code> and accepts
          every standard <code>&lt;div&gt;</code> prop (<code>className</code>,{" "}
          <code>style</code>, <code>aria-*</code>, <code>data-*</code>,{" "}
          <code>ref</code>, …) on top of the ones below:
        </p>
        <ul>
          <li>
            <code>value</code> (<code>string</code>): the current value to
            display. Every character must belong to the corresponding character
            set, otherwise the component will throw. If the value is shorter
            than <code>length</code>, the component will pad the value with
            spaces, so it’s important you include <code>&quot; &quot;</code> in
            the character set in that case.
          </li>
          <li>
            <code>length</code> (<code>number</code>): the number of slots to
            render. Values shorter than <code>length</code> are right-padded
            with spaces; values longer than <code>length</code> are truncated
            and the last slot becomes an ellipsis (<code>…</code>).
          </li>
          <li>
            <code>characters</code> (<code>string | string[]</code>): the set of
            characters each slot can flip through. Pass a single string to share
            the same set across every slot, or an array of length{" "}
            <code>length</code> to give each slot its own set. Each set must be
            non-empty and contain no duplicates.
          </li>
          <li>
            <code>onFullyFlipped</code> (<code>{"() => void"}</code>, optional):
            fires exactly once after every slot has finished flipping to the
            current <code>value</code>. Fires again on the next value change.
            Handy for chaining transitions or syncing audio.
          </li>
          <li>
            <code>crease</code> (<code>number | string</code>, default{" "}
            <code>1</code>): visual gap between the top and bottom flaps. A{" "}
            <code>number</code> is interpreted as pixels; a <code>string</code>{" "}
            is passed through verbatim (e.g. <code>&quot;0.5rem&quot;</code>).
            Exposed to CSS as <code>--split-flap-crease</code>.
          </li>
          <li>
            <code>flipDuration</code> (<code>number | string</code>, default{" "}
            <code>800</code>): duration of the flip animation. A{" "}
            <code>number</code> is interpreted as milliseconds; a{" "}
            <code>string</code> is passed through verbatim (e.g.{" "}
            <code>&quot;1s&quot;</code>). Exposed to CSS as{" "}
            <code>--split-flap-flip-duration</code>.
          </li>
          <li>
            <code>flipTimingFunction</code> (<code>string</code>, default{" "}
            <code>cubic-bezier(.215, .61, .355, 1)</code>): CSS timing function
            applied to the flip animation. Exposed to CSS as{" "}
            <code>--split-flap-timing-function</code>.
          </li>
          <li>
            <code>children</code> (render-prop, optional): take over slot
            rendering. Receives{" "}
            <code>
              {
                "(index, characters, currentCharacter, onFullyFlipped) => ReactNode"
              }
            </code>{" "}
            and is called once per slot. Capture <code>currentCharacter</code>{" "}
            from this closure if you need to forward it deeper — it isn’t
            re-emitted by <code>Slot.children</code>.
          </li>
          <li>
            <code>ref</code> (<code>{"Ref<HTMLDivElement>"}</code>, optional):
            forwarded to the root <code>&lt;div&gt;</code>.
          </li>
        </ul>

        <h3 id="splitflapdisplay-slot">
          <code>SplitFlapDisplay.Slot</code>
        </h3>
        <p>
          A single slot in the display: one{" "}
          <code>&lt;span data-split-flap-slot=&quot;&quot;&gt;</code> containing
          every possible character in the slot’s character set, only one of
          which is current at a time. Forwards every standard{" "}
          <code>&lt;span&gt;</code> prop:
        </p>
        <ul>
          <li>
            <code>index</code> (<code>number</code>): the slot’s position in the
            display. Used as the slot’s identity by the{" "}
            <code>onFullyFlipped</code> bookkeeping in <code>Root</code>.
          </li>
          <li>
            <code>characters</code> (<code>string</code>): the character set
            this slot can flip through. Must be non-empty, no duplicates, and
            must contain <code>currentCharacter</code>.
          </li>
          <li>
            <code>currentCharacter</code> (<code>string</code>): the character
            this slot should currently be showing. Changing this triggers the
            flip animation through every character in between.
          </li>
          <li>
            <code>onFullyFlipped</code> (
            <code>{"(character: string, index: number) => void"}</code>,
            optional): called after this slot has settled on{" "}
            <code>currentCharacter</code>. When you compose under{" "}
            <code>Root</code>, just pass through the <code>onFullyFlipped</code>{" "}
            you receive from <code>Root</code>’s render-prop.
          </li>
          <li>
            <code>children</code> (
            <code>{"(character: string, index: number) => ReactNode"}</code>,
            optional): take over character rendering. Called once per character
            in the set.
          </li>
          <li>
            <code>ref</code> (<code>{"Ref<HTMLSpanElement>"}</code>, optional):
            forwarded to the slot <code>&lt;span&gt;</code>.
          </li>
        </ul>

        <h3 id="splitflapdisplay-character">
          <code>SplitFlapDisplay.Character</code>
        </h3>
        <p>
          One possible character within a slot: one{" "}
          <code>
            &lt;span data-split-flap-character=&quot;&quot;
            data-char=&quot;X&quot;&gt;
          </code>{" "}
          containing the two rotating flaps. Every character in the set is
          rendered; the non-current ones are positioned in 3D space behind and
          ahead of the current one. Forwards every standard{" "}
          <code>&lt;span&gt;</code> prop:
        </p>
        <ul>
          <li>
            <code>index</code> (<code>number</code>): the character’s position
            within the slot’s character set.
          </li>
          <li>
            <code>character</code> (<code>string</code>): the character this{" "}
            <code>Character</code> represents.
          </li>
          <li>
            <code>currentCharacter</code> (<code>string</code>): the character
            the slot is currently showing. The active <code>Character</code> has
            its <code>inert</code> attribute removed; all others get{" "}
            <code>inert</code>.
          </li>
          <li>
            <code>children</code> (
            <code>{"(character: string) => ReactNode"}</code>, optional): take
            over flap rendering. Receives the character and is expected to
            return the two flaps (and any extra layers, like a crease overlay).
          </li>
          <li>
            <code>ref</code> (<code>{"Ref<HTMLSpanElement>"}</code>, optional):
            forwarded to the character <code>&lt;span&gt;</code>.
          </li>
        </ul>

        <h3 id="splitflapdisplay-flap">
          <code>SplitFlapDisplay.Flap</code>
        </h3>
        <p>
          A single half of a flap pair: one{" "}
          <code>&lt;span data-split-flap-flap=&quot;top|bottom&quot;&gt;</code>{" "}
          that rotates around its top or bottom edge. Forwards every standard{" "}
          <code>&lt;span&gt;</code> prop:
        </p>
        <ul>
          <li>
            <code>character</code> (<code>string</code>): the character this
            flap displays.
          </li>
          <li>
            <code>position</code> (
            <code>&quot;top&quot; | &quot;bottom&quot;</code>): which half of
            the flap pair this is. The <code>bottom</code> flap is automatically{" "}
            <code>aria-hidden</code> and <code>inert</code> — it’s a visual
            mirror of the top flap.
          </li>
          <li>
            <code>ref</code> (<code>{"Ref<HTMLSpanElement>"}</code>, optional):
            forwarded to the flap <code>&lt;span&gt;</code>.
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
