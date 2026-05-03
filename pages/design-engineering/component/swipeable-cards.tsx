import {
  SwipeableCards,
  SwipeDirection,
  SwipeStyle,
} from "@daformat/react-swipeable-cards";
import { GetStaticProps } from "next";
import Link from "next/link";
import {
  ComponentPropsWithoutRef,
  Dispatch,
  SetStateAction,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  PiArrowFatDownBold,
  PiArrowFatLeftBold,
  PiArrowFatRightBold,
  PiArrowFatUpBold,
} from "react-icons/pi";
import {
  BundledLanguage,
  BundledTheme,
  CodeToHastOptions,
  codeToHtml,
} from "shiki";

import { PrevNextNavigation } from "@/components/Navigation/PrevNextNavigation";
import { PageMetas } from "@/components/PageMetas/PageMetas";
import styles from "@/components/SwipeableCards/SwipeableCards.module.scss";
import { TableOfContents } from "@/components/TableOfContents/TocComponent";
import { Tabs } from "@/components/Tabs/Tabs";
import { Checkbox } from "@/components/ui/Checkbox/Checkbox";
import {
  ComponentId,
  COMPONENTS,
} from "@/constants/design-engineering/components";
import { useCssSizeVariables } from "@/hooks/useCssSizeVariables";

const tsxSource = `
// full source: https://github.com/daformat/hello-mat/blob/master/pages/design-engineering/component/swipeable-cards.tsx

<SwipeableCards.Root
  cards={[...cards /* omitted for brevity */ ]}
  className={styles.cards_root}
  data-style={"stacked-offset" /* "stacked-rotation" | "minimal" */}
  swipeStyle={"sendToBack"}
  sendToBackMargin={16}
  loop
>
  <SwipeableCards.Cards
    visibleStackLength={4}
    style={{ aspectRatio: "650 / 400" }}
  />
</SwipeableCards.Root>
`.trim();

const cssSource = `
/* full source: https://github.com/daformat/hello-mat/blob/master/components/SwipeableCards/SwipeableCards.module.scss */

.cards_root {
  --ease-out-cubic: cubic-bezier(0.215, 0.61, 0.355, 1);

  [data-swipeable-cards-cards] {
    display: grid;
    grid-template-columns: 1fr;
    place-content: center;
    position: relative;
    touch-action: none;
    z-index: 1;

    [data-swipeable-cards-card-wrapper] {
      align-content: center;
      align-self: center;
      grid-area: 1 / 1;
      opacity: calc(
        1 - clamp(0, var(--stack-index0) - var(--visible-stack-length), 1)
      );
      touch-action: none;
      transform-origin: center 0;
      transition: all 0.2s var(--ease-out-cubic);
      transition-property: opacity, scale, padding-top, margin-top;
      width: 100%;
      will-change: opacity, scale, padding-top, margin-top, transform;
    }
  }

  &:is([data-style="stacked-offset"], [data-style="stacked-rotation"]) {
    [data-swipeable-cards-cards] {
      [data-swipeable-cards-card-wrapper] {
        scale: calc(
          100% - min(var(--stack-index0), var(--visible-stack-length)) * 10%
        );
      }
    }
  }

  &[data-style="stacked-offset"] {
    [data-swipeable-cards-cards] {
      [data-swipeable-cards-card-wrapper] {
        --p: calc(
          var(--card-top-distance, 0) *
            max(var(--visible-stack-length) - var(--stack-index0), 0)
        );
        --m: calc(
          var(--card-top-distance, 0) *
            (
              var(--visible-stack-length) -
                max(var(--visible-stack-length) - var(--stack-index0), 0)
            )
        );
        margin-top: calc(var(--m) * -1);
        padding-top: calc(var(--p));
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
npm install @daformat/react-swipeable-cards
  `.trim();
  const installInstructionsNpm = await codeToHtml(
    installInstructionsSourceNpm,
    getOptions("bash")
  );

  const installInstructionsSourceYarn = `
yarn add @daformat/react-swipeable-cards
  `.trim();
  const installInstructionsYarn = await codeToHtml(
    installInstructionsSourceYarn,
    getOptions("bash")
  );

  const installInstructionsSourcePnpm = `
pnpm add @daformat/react-swipeable-cards
  `.trim();
  const installInstructionsPnpm = await codeToHtml(
    installInstructionsSourcePnpm,
    getOptions("bash")
  );

  const installInstructionsSourceBun = `
bun add @daformat/react-swipeable-cards
  `.trim();
  const installInstructionsBun = await codeToHtml(
    installInstructionsSourceBun,
    getOptions("bash")
  );

  const installInstructionsSourceDeno = `
deno add npm:@daformat/react-swipeable-cards
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

const componentId: ComponentId = "swipeable-cards";

const SwipeableCardsPage = (props: CodeBlocks) => {
  const component = COMPONENTS[componentId];
  return (
    <>
      <PageMetas {...component.metas} />
      <TableOfContents.Provider>
        <SwipeableCardsPageContent {...props} />
      </TableOfContents.Provider>
    </>
  );
};

const cardsSources = [
  {
    id: "2bc312dc-803e-4ab2-b727-aabff8aec505",
    dark: "/media/hello-mat-dark.png",
    light: "/media/hello-mat-light.png",
    rotation: 1,
  },
  {
    id: "a7e24cb8-16da-4215-bbef-83b59718244c",
    dark: "/media/design-engineering/details/og-details-dark.png",
    light: "/media/design-engineering/details/og-details-light.png",
    rotation: -3.5,
  },
  // {
  //   id: "040147cc-f129-49d0-8551-cc2b399498cd",
  //   dark: "/media/design-engineering/images-and-embeds/og-media-dark.png",
  //   light: "/media/design-engineering/images-and-embeds/og-media-light.png",
  // },
  {
    id: "85623db9-de4d-43bc-8be6-df7a5f9905a1",
    dark: "/media/design-engineering/collapsible-toolbar/og-collapsible-toolbar-dark.png",
    light:
      "/media/design-engineering/collapsible-toolbar/og-collapsible-toolbar-light.png",
    rotation: 3.5,
  },
  // {
  //   id: "278f0eb3-bf92-41ad-ad62-17a0e5752e05",
  //   dark: "/media/design-engineering/publish-button/og-publish-button-dark.png",
  //   light:
  //     "/media/design-engineering/publish-button/og-publish-button-light.png",
  // },
  {
    id: "d3519545-e090-414f-a62c-49de2cbc6482",
    dark: "/media/design-engineering/dock/og-dock-dark.png",
    light: "/media/design-engineering/dock/og-dock-light.png",
    rotation: -3,
  },
  {
    id: "320fc292-94fb-4e72-ada0-33911abce69f",
    dark: "/media/design-engineering/carousel/og-carousel-dark.png",
    light: "/media/design-engineering/carousel/og-carousel-light.png",
    rotation: 3,
  },
  {
    id: "320fc292-94fb-4e72-ada0-33911abce697",
    dark: "/media/design-engineering/stacking-cards/og-stacking-cards-dark.png",
    light:
      "/media/design-engineering/stacking-cards/og-stacking-cards-light.png",
    rotation: -3,
  },
].reverse();

const cards = cardsSources.map(({ id, light, dark, rotation }, index) => ({
  id,
  card: (
    <picture
      key={index}
      className="card flat shadow"
      style={{
        display: "inline-block",
        fontSize: 0,
        padding: 8,
        width: "100%",
      }}
    >
      <source media="(prefers-color-scheme: dark)" srcSet={dark} />
      <img
        src={light}
        alt=""
        style={{ aspectRatio: "1200 / 630", width: "100%" }}
      />
    </picture>
  ),
  rotation,
}));

const cards2 = cardsSources.map(({ id, light, dark, rotation }, index) => ({
  id,
  card: (
    <picture
      key={index}
      className="card flat shadow"
      style={{
        display: "inline-block",
        fontSize: 0,
        padding: 8,
        width: "100%",
        transformOrigin: "center",
        rotate: `${rotation}deg`,
      }}
    >
      <source media="(prefers-color-scheme: dark)" srcSet={dark} />
      <img
        src={light}
        alt=""
        style={{ aspectRatio: "1200 / 630", width: "100%" }}
      />
    </picture>
  ),
}));

// const SwipeableCards2 = () => {
//   const stack = SwipeableCards.useSwipeableCardsStack();
//   return stack.map((card) => {
//     return (
//       <SwipeableCards.CardWrapper key={card.id} card={card} className={styles.card2}>
//         <div
//           style={{
//             transformOrigin: "center",
//             rotate: `${
//               cards.find((c) => c.id === card.id.split("#")[0])?.rotation
//             }deg`,
//           }}
//         >
//           {card.card}
//         </div>
//       </SwipeableCards.CardWrapper>
//     );
//   });
// };

const SwipeableCardsPageContent = (props: CodeBlocks) => {
  const tocContext = TableOfContents.useToc();
  const contentRef = useRef<HTMLDivElement>(null);
  const demoRef = useRef<HTMLDivElement>(null);
  const [swipeStyle, setswipeStyle] = useState<SwipeStyle>("discard");
  const [loop, setLoop] = useState(true);
  const [animate, setAnimate] = useState(false);
  useCssSizeVariables(demoRef);
  const [_swipedCards, setSwipedCards] = useState<
    Record<SwipeDirection, string[]>
  >({
    up: [],
    down: [],
    left: [],
    right: [],
  });

  useEffect(() => {
    if (contentRef.current) {
      tocContext.setRootElement(contentRef.current);
    }
  });

  const StackStat = () => {
    const { stack } = SwipeableCards.useSwipeableCardsContext();
    return (
      <small style={{ opacity: 0.8 }}>
        {stack.length} card{stack.length > 1 ? "s" : ""}
      </small>
    );
  };

  const AddMoreButton = () => {
    const { setStack, stack } = SwipeableCards.useSwipeableCardsContext();
    return (
      <button
        className="button"
        onClick={() => {
          if (stack.length === 0) {
            setAnimate(true);
          }
          setStack((prev) => [
            ...cards.map(({ id, ...rest }) => ({
              id: id + "#" + Math.random(),
              ...rest,
            })),
            ...prev,
          ]);
        }}
      >
        Add more cards
      </button>
    );
  };

  return (
    <>
      <TableOfContents.Root />
      <div ref={contentRef} className="prose page">
        <Link href="/design-engineering" className="back_link">
          Back to gallery
        </Link>
        <h1 id="design-engineering-a-swipeable-cards-carousel">
          Design engineering: a swipeable cards carousel
        </h1>
        <p>
          A cards carousel with swipe gestures, loopable or not. This is an
          interaction pioneered by{" "}
          <a href={"https://tinder.com/"} target="_blank" rel="noopener">
            Tinder
          </a>{" "}
          and that is not so common in desktop apps. It’s so much fun to use, go
          ahead and drag / swipe cards around and see what happens.
        </p>
        <div ref={demoRef} className="demo">
          <Tabs
            defaultValue="stackedOffset"
            tabs={[
              {
                id: "stackedOffset",
                trigger: "Stacked with offset",
                content: (
                  <div
                    style={{
                      marginBlock: 32,
                      maxWidth: 650,
                      marginInline: "auto",
                    }}
                  >
                    <SwipeableCards.Root
                      className={styles.cards_root}
                      data-style={"stacked-offset"}
                      cards={[...cards]}
                      swipeStyle={swipeStyle}
                      sendToBackMargin={0}
                      getCardElement={(element) => {
                        return element.firstElementChild ?? element;
                      }}
                      onSwipe={(direction, cardId) => {
                        setSwipedCards((prev) => {
                          const newSwipedCards = { ...prev };
                          if (newSwipedCards[direction]?.includes(cardId)) {
                            return prev;
                          } else {
                            Object.entries(newSwipedCards).forEach(
                              ([key, value]) => {
                                if (key !== direction) {
                                  newSwipedCards[key as SwipeDirection] =
                                    value.filter((id) => id !== cardId);
                                } else {
                                  newSwipedCards[key as SwipeDirection] = [
                                    ...value,
                                    cardId,
                                  ];
                                }
                              }
                            );
                          }
                          return newSwipedCards;
                        });
                      }}
                      {...(loop
                        ? { loop }
                        : {
                            loop,
                            emptyView: <EmptyView setAnimate={setAnimate} />,
                          })}
                    >
                      <SwipeableCards.Cards
                        visibleStackLength={4}
                        style={{ aspectRatio: "650 / 400" }}
                        data-loop={loop ? "true" : "false"}
                        data-animate-card={animate ? "true" : "false"}
                        onAnimationEnd={(event) => {
                          if (event.animationName === styles.grow) {
                            setAnimate(false);
                          }
                        }}
                      />
                      <p
                        style={{
                          textAlign: "center",
                          display: "flex",
                          gap: 8,
                          justifyContent: "center",
                        }}
                      >
                        <span>
                          <SwipeableCards.SwipeLeftButton
                            className={styles.button}
                          >
                            <PiArrowFatLeftBold />
                          </SwipeableCards.SwipeLeftButton>{" "}
                          <SwipeableCards.SwipeUpButton
                            className={styles.button}
                          >
                            <PiArrowFatUpBold />
                          </SwipeableCards.SwipeUpButton>{" "}
                          <SwipeableCards.SwipeDownButton
                            className={styles.button}
                          >
                            <PiArrowFatDownBold />
                          </SwipeableCards.SwipeDownButton>{" "}
                          <SwipeableCards.SwipeRightButton
                            className={styles.button}
                          >
                            <PiArrowFatRightBold />
                          </SwipeableCards.SwipeRightButton>
                        </span>
                      </p>
                      <p
                        style={{
                          textAlign: "center",
                          display: "flex",
                          justifyContent: "center",
                          gap: 8,
                        }}
                      >
                        <label
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <Checkbox
                            checked={swipeStyle === "sendToBack"}
                            onChange={(event) => {
                              setswipeStyle(
                                event.target.checked ? "sendToBack" : "discard"
                              );
                            }}
                          />
                          <small style={{ opacity: 0.8 }}>send to back</small>
                        </label>
                        <label
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <Checkbox
                            checked={loop}
                            onChange={(event) => {
                              setLoop(event.target.checked);
                            }}
                          />
                          <small style={{ opacity: 0.8 }}>loop</small>
                        </label>
                      </p>
                      <p
                        style={{
                          textAlign: "center",
                          display: "flex",
                          justifyContent: "center",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <StackStat />
                        <AddMoreButton />
                      </p>
                    </SwipeableCards.Root>
                  </div>
                ),
              },
              {
                id: "stackedRotation",
                trigger: "Stacked with rotation",
                content: (
                  <div
                    style={{
                      marginBlock: 32,
                      maxWidth: 650,
                      marginInline: "auto",
                    }}
                  >
                    <SwipeableCards.Root
                      data-style={"stacked-rotation"}
                      cards={[...cards2]}
                      className={styles.cards_root}
                      swipeStyle={swipeStyle}
                      getCardElement={(element) => {
                        return element.firstElementChild ?? element;
                      }}
                      onSwipe={(direction, cardId) => {
                        setSwipedCards((prev) => {
                          const newSwipedCards = { ...prev };
                          if (newSwipedCards[direction]?.includes(cardId)) {
                            return prev;
                          } else {
                            Object.entries(newSwipedCards).forEach(
                              ([key, value]) => {
                                if (key !== direction) {
                                  newSwipedCards[key as SwipeDirection] =
                                    value.filter((id) => id !== cardId);
                                } else {
                                  newSwipedCards[key as SwipeDirection] = [
                                    ...value,
                                    cardId,
                                  ];
                                }
                              }
                            );
                          }
                          return newSwipedCards;
                        });
                      }}
                      {...(loop
                        ? { loop }
                        : {
                            loop,
                            emptyView: <EmptyView setAnimate={setAnimate} />,
                          })}
                    >
                      <SwipeableCards.Cards
                        visibleStackLength={5}
                        style={{ aspectRatio: "650 / 400" }}
                        data-loop={loop ? "true" : "false"}
                        data-animate-card={animate ? "true" : "false"}
                        onAnimationEnd={(event) => {
                          if (event.animationName === styles.grow) {
                            setAnimate(false);
                          }
                        }}
                      />
                      <p
                        style={{
                          textAlign: "center",
                          display: "flex",
                          gap: 8,
                          justifyContent: "center",
                        }}
                      >
                        <span>
                          <SwipeableCards.SwipeLeftButton
                            className={styles.button}
                          >
                            <PiArrowFatLeftBold />
                          </SwipeableCards.SwipeLeftButton>{" "}
                          <SwipeableCards.SwipeUpButton
                            className={styles.button}
                          >
                            <PiArrowFatUpBold />
                          </SwipeableCards.SwipeUpButton>{" "}
                          <SwipeableCards.SwipeDownButton
                            className={styles.button}
                          >
                            <PiArrowFatDownBold />
                          </SwipeableCards.SwipeDownButton>{" "}
                          <SwipeableCards.SwipeRightButton
                            className={styles.button}
                          >
                            <PiArrowFatRightBold />
                          </SwipeableCards.SwipeRightButton>
                        </span>
                      </p>
                      <p
                        style={{
                          textAlign: "center",
                          display: "flex",
                          justifyContent: "center",
                          gap: 8,
                        }}
                      >
                        <label
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <Checkbox
                            checked={swipeStyle === "sendToBack"}
                            onChange={(event) => {
                              setswipeStyle(
                                event.target.checked ? "sendToBack" : "discard"
                              );
                            }}
                          />
                          <small style={{ opacity: 0.8 }}>send to back</small>
                        </label>
                        <label
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <Checkbox
                            checked={loop}
                            onChange={(event) => {
                              setLoop(event.target.checked);
                            }}
                          />
                          <small style={{ opacity: 0.8 }}>loop</small>
                        </label>
                      </p>
                      <p
                        style={{
                          textAlign: "center",
                          display: "flex",
                          justifyContent: "center",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <StackStat />
                        <AddMoreButton />
                      </p>
                    </SwipeableCards.Root>
                  </div>
                ),
              },
              {
                id: "minimal",
                trigger: "Minimal",
                content: (
                  <div
                    style={{
                      marginBlock: 32,
                      maxWidth: 650,
                      marginInline: "auto",
                    }}
                  >
                    <SwipeableCards.Root
                      data-style={"minimal"}
                      className={styles.cards_root}
                      sendToBackMargin={16}
                      style={{
                        margin: "auto",
                        aspectRatio: "650 / 400",
                      }}
                      cards={[...cards]}
                      swipeStyle={swipeStyle}
                      getCardElement={(element) => {
                        return element.firstElementChild ?? element;
                      }}
                      onSwipe={(direction, cardId) => {
                        setSwipedCards((prev) => {
                          const newSwipedCards = { ...prev };
                          if (newSwipedCards[direction]?.includes(cardId)) {
                            return prev;
                          } else {
                            Object.entries(newSwipedCards).forEach(
                              ([key, value]) => {
                                if (key !== direction) {
                                  newSwipedCards[key as SwipeDirection] =
                                    value.filter((id) => id !== cardId);
                                } else {
                                  newSwipedCards[key as SwipeDirection] = [
                                    ...value,
                                    cardId,
                                  ];
                                }
                              }
                            );
                          }
                          return newSwipedCards;
                        });
                      }}
                      {...(loop
                        ? { loop }
                        : {
                            loop,
                            emptyView: (
                              <EmptyView
                                setAnimate={setAnimate}
                                style={{ aspectRatio: "650 / 349" }}
                              />
                            ),
                          })}
                    >
                      <SwipeableCards.Cards
                        visibleStackLength={3}
                        style={{ aspectRatio: "650 / 400" }}
                        data-loop={loop ? "true" : "false"}
                        data-animate-card={animate ? "true" : "false"}
                        onAnimationEnd={(event) => {
                          if (event.animationName === styles.grow) {
                            setAnimate(false);
                          }
                        }}
                      />
                      <p
                        style={{
                          textAlign: "center",
                          display: "flex",
                          gap: 8,
                          justifyContent: "center",
                        }}
                      >
                        <span>
                          <SwipeableCards.SwipeLeftButton
                            className={styles.button}
                          >
                            <PiArrowFatLeftBold />
                          </SwipeableCards.SwipeLeftButton>{" "}
                          <SwipeableCards.SwipeUpButton
                            className={styles.button}
                          >
                            <PiArrowFatUpBold />
                          </SwipeableCards.SwipeUpButton>{" "}
                          <SwipeableCards.SwipeDownButton
                            className={styles.button}
                          >
                            <PiArrowFatDownBold />
                          </SwipeableCards.SwipeDownButton>{" "}
                          <SwipeableCards.SwipeRightButton
                            className={styles.button}
                          >
                            <PiArrowFatRightBold />
                          </SwipeableCards.SwipeRightButton>
                        </span>
                      </p>
                      <p
                        style={{
                          textAlign: "center",
                          display: "flex",
                          justifyContent: "center",
                          gap: 8,
                        }}
                      >
                        <label
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <Checkbox
                            checked={swipeStyle === "sendToBack"}
                            onChange={(event) => {
                              setswipeStyle(
                                event.target.checked ? "sendToBack" : "discard"
                              );
                            }}
                          />
                          <small style={{ opacity: 0.8 }}>send to back</small>
                        </label>
                        <label
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <Checkbox
                            checked={loop}
                            onChange={(event) => {
                              setLoop(event.target.checked);
                            }}
                          />
                          <small style={{ opacity: 0.8 }}>loop</small>
                        </label>
                      </p>
                      <p
                        style={{
                          textAlign: "center",
                          display: "flex",
                          justifyContent: "center",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <StackStat />
                        <AddMoreButton />
                      </p>
                    </SwipeableCards.Root>
                  </div>
                ),
              },
            ]}
          />
        </div>

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
          (and drop a star if you like it!)
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

        <h2 id="code-sample">Code sample</h2>
        <p>
          Below is a minimal example to reproduce the examples above, view the
          full{" "}
          <a
            href={
              "https://github.com/daformat/hello-mat/blob/master/pages/design-engineering/component/swipeable-cards.tsx"
            }
            target="_blank"
            rel="noopener"
          >
            tsx
          </a>{" "}
          and{" "}
          <a
            href={
              "https://github.com/daformat/hello-mat/blob/master/components/SwipeableCards/SwipeableCards.module.scss"
            }
            target="_blank"
            rel="noopener"
          >
            scss
          </a>{" "}
          on github
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

        <h2 id="swipe-gesture">Swipe gestures</h2>
        <p>
          Performing swipe gestures on the web is not a native feature, so
          you’ll have to do it yourself. The gist of it is to translate the card
          as you drag it, and compute the velocity of the swipe for a realistic
          momentum to be applied as you discard a card. This is done simply by
          dividing the distance traveled by the card by the amount of time
          elapsed since the last pointer move event.
        </p>
        <h3 id="handling-low-velocity">Handling low velocity</h3>
        <p>
          If you drag a card just a little a bit and release the pointer, the
          card will return to the stack. Unless you moved it by some minimal
          distance. In this case, we need to &rdquo;fake&ldquo; the velocity so
          the card properly animates out of the viewport.
        </p>
        <h3 id="faking-gestures">Faking gestures when using buttons</h3>
        <p>
          When using buttons, the user didn’t actually perform a swipe gesture,
          so we need to simulate it. We do this by mocking the dragging state,
          so that the card properly animates out.
        </p>
        <h2 id="send-to-back">Sending to back</h2>
        <p>
          When sending the cards to the back of the stack, we need to ensure the
          swiped card has travelled enough so that when swapping its z-index,
          the card doesn’t overlap the stack. Many implementations disregard
          this issue, as this is not trivial to implement. This package properly
          ensures that, no more partial clipping when sending a card to the
          bottom of the stack!
        </p>
        <p>
          The component allows you to customize the margin by using the{" "}
          <code>sendToBackMargin</code> prop, which is used to specify the
          pixels-based distance to enforce when sending a card to the back.
        </p>
        <h2 id="conclusion">That’s a wrap</h2>
        <p>
          I was curious to see how I would implement this, so I settled on
          finding out. I’m overall pretty pleased with the result, and I think
          I’ll re-use the component in the future. There is something deeply
          satisfying in using this interaction, and I think Tinder made it their
          landmark for a reason.
        </p>
        <PrevNextNavigation currentComponentId={componentId} />
      </div>
    </>
  );
};

const EmptyView = ({
  setAnimate,
  style,
  ...props
}: {
  setAnimate: Dispatch<SetStateAction<boolean>>;
} & ComponentPropsWithoutRef<"div">) => {
  const { setStack, cards } = useContext(SwipeableCards.Context);
  return (
    <div
      style={{
        backgroundColor: "var(--color-background)",
        textAlign: "center",
        padding: "8px 16px",
        borderRadius: 8,
        border: "2px dashed var(--color-border-1)",
        width: "100%",
        aspectRatio: "1200 / 630",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        boxSizing: "border-box",
        gap: 8,
        ...style,
      }}
      {...props}
    >
      No more cards to show
      <button
        className="button"
        onClick={() => {
          setAnimate(true);
          setStack(cards);
        }}
      >
        Reset stack
      </button>
    </div>
  );
};

export default SwipeableCardsPage;
