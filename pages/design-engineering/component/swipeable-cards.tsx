import Link from "next/link";
import {
  Dispatch,
  SetStateAction,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { FaCheck, FaXmark } from "react-icons/fa6";
import { PiStarBold } from "react-icons/pi";

import { PrevNextNavigation } from "@/components/Navigation/PrevNextNavigation";
import { PageMetas } from "@/components/PageMetas/PageMetas";
import {
  DiscardStyle,
  SwipeableCards,
  SwipeDirection,
} from "@/components/SwipeableCards/SwipeableCards";
import styles from "@/components/SwipeableCards/SwipeableCards.module.scss";
import { TableOfContents } from "@/components/TableOfContents/TocComponent";
import { Checkbox } from "@/components/ui/Checkbox/Checkbox";
import {
  ComponentId,
  COMPONENTS,
} from "@/constants/design-engineering/components";
import { useCssSizeVariables } from "@/hooks/useCssSizeVariables";
import { Tabs } from "@/components/Tabs/Tabs";

const componentId: ComponentId = "swipeable-cards";

const SwipeableCardsPage = () => {
  const component = COMPONENTS[componentId];
  return (
    <>
      <PageMetas {...component.metas} />
      <TableOfContents.Provider>
        <SwipeableCardsPageContent />
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

const SwipeableCards2 = () => {
  const stack = SwipeableCards.useSwipeableCardsStack();
  return stack.map((card) => {
    return (
      <SwipeableCards.Card key={card.id} card={card} className={styles.card2}>
        <div
          style={{
            transformOrigin: "center",
            rotate: `${cards.find((c) => c.id === card.id.split("#")[0])?.rotation}deg`,
          }}
        >
          {card.card}
        </div>
      </SwipeableCards.Card>
    );
  });
};

const SwipeableCardsPageContent = () => {
  const tocContext = TableOfContents.useToc();
  const contentRef = useRef<HTMLDivElement>(null);
  const demoRef = useRef<HTMLDivElement>(null);
  const [discardStyle, setDiscardStyle] = useState<DiscardStyle>("fling");
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
                      cards={[...cards]}
                      discardStyle={discardStyle}
                      onSwipe={(direction, cardId) => {
                        setSwipedCards((prev) => {
                          const newSwipedCards = { ...prev };
                          if (newSwipedCards[direction].includes(cardId)) {
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
                        className={styles.swipeable_cards}
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
                          <SwipeableCards.DeclineButton>
                            <FaXmark />
                          </SwipeableCards.DeclineButton>{" "}
                          <SwipeableCards.StarButton>
                            <PiStarBold />
                          </SwipeableCards.StarButton>{" "}
                          <SwipeableCards.AcceptButton>
                            <FaCheck />
                          </SwipeableCards.AcceptButton>
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
                            checked={discardStyle === "sendToBack"}
                            onChange={(event) => {
                              setDiscardStyle(
                                event.target.checked ? "sendToBack" : "fling"
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
                      cards={[...cards]}
                      discardStyle={discardStyle}
                      onSwipe={(direction, cardId) => {
                        setSwipedCards((prev) => {
                          const newSwipedCards = { ...prev };
                          if (newSwipedCards[direction].includes(cardId)) {
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
                        className={styles.swipeable_cards}
                        onAnimationEnd={(event) => {
                          if (event.animationName === styles.grow) {
                            setAnimate(false);
                          }
                        }}
                      >
                        <SwipeableCards2 />
                      </SwipeableCards.Cards>
                      <p
                        style={{
                          textAlign: "center",
                          display: "flex",
                          gap: 8,
                          justifyContent: "center",
                        }}
                      >
                        <span>
                          <SwipeableCards.DeclineButton>
                            <FaXmark />
                          </SwipeableCards.DeclineButton>{" "}
                          <SwipeableCards.StarButton>
                            <PiStarBold />
                          </SwipeableCards.StarButton>{" "}
                          <SwipeableCards.AcceptButton>
                            <FaCheck />
                          </SwipeableCards.AcceptButton>
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
                            checked={discardStyle === "sendToBack"}
                            onChange={(event) => {
                              setDiscardStyle(
                                event.target.checked ? "sendToBack" : "fling"
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
}: {
  setAnimate: Dispatch<SetStateAction<boolean>>;
}) => {
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
      }}
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
