import { NumberFlowInput } from "@daformat/react-number-flow-input";
import { GetStaticProps } from "next";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  BundledLanguage,
  BundledTheme,
  CodeToHastOptions,
  codeToHtml,
} from "shiki";

import { MaybeUndefined } from "@/components/Media/utils/maybe";
import { PrevNextNavigation } from "@/components/Navigation/PrevNextNavigation";
import styles from "@/components/NumberFlowInput/NumberFlowInput.module.scss";
import { PageMetas } from "@/components/PageMetas/PageMetas";
import { TableOfContents } from "@/components/TableOfContents/TocComponent";
import { Tabs } from "@/components/Tabs/Tabs";
import { Checkbox } from "@/components/ui/Checkbox/Checkbox";
import {
  ComponentId,
  COMPONENTS,
} from "@/constants/design-engineering/components";
import { isNonNullable } from "@/utils/nullable";

const DEBUG = false;

const tsxSource = `
import { useState } from "react";
import { NumberFlowInput } from "@daformat/react-number-flow-input";
import styles from "./styles.module.css";

export const Demo = () => {
  const [value, setValue] = useState<number | undefined>();

  return (
    <NumberFlowInput
      value={value}
      onChange={setValue}
      placeholder="0"
      maxLength={8}
      format
      autoAddLeadingZero
      className={styles.number_flow_input}
    />
  );
};
`.trim();

const cssSource = `
/*
  The component injects its own stylesheet for layout & animation, so all
  you need is to style typography / colors and (optionally) the placeholder.
*/
.number_flow_input {
  font-size: clamp(1.8em, 5vw, 4em);
  line-height: 1;

  [data-numberflow-input-contenteditable] {
    &:empty::before {
      content: attr(data-placeholder);
      opacity: 0.3;
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

  const installInstructionsNpm = await codeToHtml(
    "npm install @daformat/react-number-flow-input",
    getOptions("bash")
  );
  const installInstructionsYarn = await codeToHtml(
    "yarn add @daformat/react-number-flow-input",
    getOptions("bash")
  );
  const installInstructionsPnpm = await codeToHtml(
    "pnpm add @daformat/react-number-flow-input",
    getOptions("bash")
  );
  const installInstructionsBun = await codeToHtml(
    "bun add @daformat/react-number-flow-input",
    getOptions("bash")
  );
  const installInstructionsDeno = await codeToHtml(
    "deno add npm:@daformat/react-number-flow-input",
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

const useMaxLength = (
  smallScreen: number,
  largeScreen: number,
  breakpoint = 600
) => {
  const [maxLength, setMaxLength] = useState(smallScreen);

  useEffect(() => {
    const updateMaxLength = () => {
      setMaxLength(window.innerWidth > breakpoint ? largeScreen : smallScreen);
    };
    updateMaxLength();
    window.addEventListener("resize", updateMaxLength);
    return () => window.removeEventListener("resize", updateMaxLength);
  }, [smallScreen, largeScreen, breakpoint]);

  return maxLength;
};

const componentId: ComponentId = "number-flow-input";

const NumberFlowInputPage = (props: CodeBlocks) => {
  const component = COMPONENTS[componentId];
  return (
    <>
      <PageMetas {...component.metas} />
      <TableOfContents.Provider>
        <NumberFlowInputPageContent {...props} />
      </TableOfContents.Provider>
    </>
  );
};

const NumberFlowInputPageContent = (props: CodeBlocks) => {
  const tocContext = TableOfContents.useToc();
  const contentRef = useRef<HTMLDivElement>(null);
  const maxLength = useMaxLength(8, 15, 800);
  const [format, setFormat] = useState(true);
  const [value, setValue] = useState<MaybeUndefined<number>>();
  const lastValueRef = useRef<MaybeUndefined<number>>(undefined);

  useEffect(() => {
    if (contentRef.current) {
      tocContext.setRootElement(contentRef.current);
    }
  });

  const handleRandomize = () => {
    const randomNumber = Math.floor(
      Math.random() * 100_000_000 * (Math.random() > 0.5 ? 1 : 0.01)
    );
    setValue((prev) => {
      lastValueRef.current = prev;
      return randomNumber;
    });
  };

  return (
    <>
      <TableOfContents.Root />
      <div ref={contentRef} className="prose page">
        <Link href="/design-engineering" className="back_link">
          Back to gallery
        </Link>
        <h1 id="design-engineering-a-number-flow-input">
          Design engineering: a number flow like input
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
          select a single digit and replace it with another digit to see a
          barrel-wheel effect like the one popularized by Number Flow. You can{" "}
          <a href="#install">install</a> the open-source package and start
          adding animated number inputs to your site or application.
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
            style={{
              padding: "clamp(16px, 5vw, 128px) 8px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              flexGrow: 1,
              gap: 4,
            }}
          >
            <span
              style={{ display: "inline-flex" }}
              className={styles.number_flow_input}
            >
              <span style={{ opacity: 0.5 }}>
                <span
                  style={{
                    scale: 0.75,
                    display: "inline-block",
                    transformOrigin: "top center",
                    translate: "0 0.05em",
                  }}
                >
                  $
                </span>
              </span>
              <NumberFlowInput
                value={value}
                onChange={(newValue) => setValue(newValue)}
                maxLength={maxLength}
                autoAddLeadingZero
                placeholder="0"
                format={format}
              />
            </span>
            <div style={{ textAlign: "center" }}>
              <span style={{ opacity: 0.5 }}>Type in a value above</span>
            </div>
          </div>
          <footer
            style={{
              padding: "8px 12px",
              backgroundColor: "var(--color-card-background)",
              width: "100%",
              display: "flex",
              justifyContent: "space-between",
              gap: 8,
              alignItems: "center",
              borderBottomLeftRadius: "inherit",
              borderBottomRightRadius: "inherit",
              boxShadow:
                "inset 0 0 2px 0.75px var(--color-border-2), inset 0 0 0 0.75px var(--color-border-3)",
            }}
          >
            <label
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Checkbox
                defaultChecked={format}
                onChange={(event) => setFormat(event.target.checked)}
              />
              <small style={{ opacity: 0.8 }}>format</small>
            </label>
            <span>
              {DEBUG ? (
                <small>
                  {isNonNullable(value)
                    ? `(${
                        isNonNullable(lastValueRef.current)
                          ? `${lastValueRef.current} -> `
                          : ""
                      }${value})`
                    : ""}
                </small>
              ) : null}
              <button className="button" onClick={handleRandomize}>
                Randomize
              </button>
            </span>
          </footer>
        </div>

        <h2 id="install">Install</h2>
        <p>
          Open the repo in{" "}
          <a
            href="https://github.com/daformat/react-number-flow-input"
            target="_blank"
            rel="noopener"
          >
            Github
          </a>{" "}
          (and drop a star if you like it!), view{" "}
          <a href="#quick-start">quick-start</a> to get started.
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

        <h2 id="quick-start">Quick start</h2>
        <p>
          Below is a minimal example that mirrors the demo above. View the full{" "}
          <a
            href={
              "https://github.com/daformat/hello-mat/blob/master/pages/design-engineering/component/number-flow-input.tsx"
            }
            target="_blank"
            rel="noopener"
          >
            tsx
          </a>{" "}
          and{" "}
          <a
            href={
              "https://github.com/daformat/hello-mat/blob/master/components/NumberFlowInput/NumberFlowInput.module.scss"
            }
            target="_blank"
            rel="noopener"
          >
            scss
          </a>{" "}
          on github.
        </p>
        <p>
          <strong>Note:</strong> the component injects its own stylesheet on
          first mount for layout and animation — you only need to style
          typography and colors yourself.
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

        <h2 id="features">Features</h2>
        <h3 id="animated-digits">Animated digits</h3>
        <ul>
          <li>
            <strong>Numbers are animated as they get inserted</strong>, the
            component animates them up and animates their width at the same time
            so the input smoothly resizes as the user types.
          </li>
          <li>
            <strong>
              Selecting and replacing a digit with another digit creates a
              barrel-wheel effect
            </strong>
            , the direction of the wheel depends on whether the new digit is
            larger or smaller than the old one.
          </li>
          <li>
            <strong>
              Replacing a digit that is already in a barrel-wheel animation
              smoothly interrupts and restarts the barrel wheel
            </strong>{" "}
            so that it animates to the latest digit.
          </li>
          <li>
            <strong>External value updates animate too</strong> — when the{" "}
            <code>value</code> prop changes (e.g. from a parent fetching new
            data), every digit rolls into place as a coordinated barrel-wheel
            animation. The initial mount never animates.
          </li>
        </ul>

        <h3 id="accepted-characters">Accepted characters</h3>
        <ul>
          <li>
            Only digits, one decimal point, and one minus sign are allowed.
          </li>
          <li>Uses a numeric keyboard on mobile devices.</li>
          <li>
            The minus sign can only be placed at the beginning of the input.
          </li>
          <li>
            When inserting a decimal point, the component can automatically add
            the leading 0 if the <code>autoAddLeadingZero</code> prop is set to{" "}
            <code>true</code>.
          </li>
          <li>
            The component accepts an optional <code>maxLength</code> prop.
          </li>
        </ul>

        <h3 id="locale-and-formatting">Locale and formatting</h3>
        <ul>
          <li>
            Pass <code>format</code> to render numbers with thousands separators
            via <code>Intl.NumberFormat</code>.
          </li>
          <li>
            Pass <code>locale</code> (e.g. <code>&quot;de-DE&quot;</code>,{" "}
            <code>&quot;fr-FR&quot;</code>) to use the locale’s decimal and
            group separators. The input accepts both <code>.</code> and the
            locale-specific decimal as input.
          </li>
          <li>
            Use <code>decimalScale</code> to clamp the number of fractional
            digits. <code>{"decimalScale={0}"}</code> forbids a decimal point
            entirely.
          </li>
        </ul>

        <h3 id="form-integration">Form integration</h3>
        <p>
          The component renders an offscreen, read-only{" "}
          <code>&lt;input&gt;</code> that mirrors the current numeric value, so
          it participates in native form submissions. <code>name</code>,{" "}
          <code>form</code>, <code>required</code>, <code>min</code>,{" "}
          <code>max</code>, <code>minLength</code> and <code>maxLength</code>{" "}
          are forwarded to that hidden input.
        </p>

        <h2 id="component-api">Component API</h2>
        <p>
          The package exports a single component, <code>NumberFlowInput</code>,
          forwarding its ref to the <code>contenteditable</code> element. It
          accepts the props below in addition to a few HTML{" "}
          <code>&lt;input&gt;</code> attributes (<code>min</code>,{" "}
          <code>max</code>, <code>minLength</code>, <code>maxLength</code>,{" "}
          <code>form</code>, <code>required</code>, <code>name</code>,{" "}
          <code>id</code>, <code>placeholder</code>, <code>onFocus</code>,{" "}
          <code>onBlur</code>, <code>className</code>, <code>style</code>) that
          are forwarded to the appropriate element.
        </p>

        <h3 id="value-props">Value</h3>
        <ul>
          <li>
            <code>value</code> (<code>number | undefined</code>): controlled
            value. When provided, changes animate as a coordinated barrel-wheel
            roll across every digit (except on initial mount).
          </li>
          <li>
            <code>defaultValue</code> (<code>number</code>): uncontrolled
            starting value. Mutually exclusive with <code>value</code> at the
            TypeScript level.
          </li>
          <li>
            <code>onChange</code> (
            <code>{"(value: number | undefined) => void"}</code>): called with
            the parsed number (or <code>undefined</code> for intermediate states
            like <code>&quot;&quot;</code>, <code>&quot;-&quot;</code>,{" "}
            <code>&quot;.&quot;</code>).
          </li>
        </ul>

        <h3 id="formatting-props">Formatting</h3>
        <ul>
          <li>
            <code>format</code> (<code>boolean</code>, default{" "}
            <code>false</code>): when true, the display uses{" "}
            <code>Intl.NumberFormat</code> grouping.
          </li>
          <li>
            <code>locale</code> (<code>string | Intl.Locale</code>): locale used
            for decimal and group separators. Defaults to the runtime’s locale.
          </li>
          <li>
            <code>decimalScale</code> (<code>number</code>): max number of
            fractional digits. <code>0</code> forbids a decimal point entirely.
          </li>
          <li>
            <code>autoAddLeadingZero</code> (<code>boolean</code>, default{" "}
            <code>false</code>): convert leading <code>.5</code> →{" "}
            <code>0.5</code> (and <code>-.5</code> → <code>-0.5</code>)
            automatically.
          </li>
          <li>
            <code>allowNegative</code> (<code>boolean</code>, default{" "}
            <code>false</code>): allow typing a leading <code>-</code> to enter
            negative numbers.
          </li>
        </ul>

        <h3 id="editing-constraints">Editing constraints</h3>
        <ul>
          <li>
            <code>maxLength</code> (<code>number</code>): maximum raw length the
            user can type, counted before formatting.
          </li>
          <li>
            <code>isAllowed</code> (
            <code>{"(value: number | null) => boolean"}</code>): predicate that
            gates every change. Return <code>false</code> to reject the
            keystroke before it reaches <code>onChange</code>.
          </li>
        </ul>

        <h3 id="other-props">Other props</h3>
        <ul>
          <li>
            <code>autoFocus</code> (<code>boolean</code>): focus the
            contenteditable on mount.
          </li>
          <li>
            <code>placeholder</code> (<code>string</code>): shown when the input
            is empty, exposed as <code>data-placeholder</code> on the
            contenteditable for styling.
          </li>
          <li>
            <code>className</code> / <code>style</code>: applied to the root
            wrapper <code>&lt;span&gt;</code>.
          </li>
          <li>
            <code>ref</code> (<code>{"Ref<HTMLElement>"}</code>): forwarded to
            the <code>contenteditable</code> <code>&lt;span&gt;</code>.
          </li>
        </ul>

        <h2 id="implementation">Implementation</h2>
        <p>
          The implementation of this component uses <code>contentEditable</code>{" "}
          in order to be able to animate the digits as they are typed. Relying
          on <code>contentEditable</code> allows the component to use markup per
          character, contrary to a regular input, but this comes with quite a
          few caveats.
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
          Content editable is designed to allow rich text formatting and
          arbitrary markup to be inserted; for our input we need to prevent
          this. This is done via <code>event.preventDefault()</code>, simple yet
          effective.
        </p>
        <h3 id="custom-cursor-handling">Custom cursor handling</h3>
        <p>
          In rich text, cursor positions move between nodes, this means that
          when you insert a <code>span</code> the cursor position can be inside
          or outside of the span. There are therefore more than one logical
          cursor position mapping to the same visual position, which means the
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
          here is pretty naive, but it works and restores cursor position as the
          user undoes/redoes.
        </p>

        <h3 id="custom-clipboard">Custom clipboard</h3>
        <p>
          Since we have rich text markup in our input and we want to copy a raw
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
          </a>{" "}
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
          decent UX. The result is available as an open-source package on{" "}
          <a
            href="https://github.com/daformat/react-number-flow-input"
            target="_blank"
            rel="noopener"
          >
            GitHub
          </a>
          .
        </p>
        <PrevNextNavigation currentComponentId={componentId} />
      </div>
    </>
  );
};

export default NumberFlowInputPage;
