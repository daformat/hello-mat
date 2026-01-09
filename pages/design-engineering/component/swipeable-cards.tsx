import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { FaCheck, FaXmark } from "react-icons/fa6";
import { PiStarBold } from "react-icons/pi";

import { NextCard, PrevCard } from "@/components/Navigation/NextCard";
import { PageMetas } from "@/components/PageMetas/PageMetas";
import {
  DiscardStyle,
  SwipeableCards,
  SwipeDirection,
} from "@/components/SwipeableCards/SwipeableCards";
import { TableOfContents } from "@/components/TableOfContents/TocComponent";
import { Checkbox } from "@/components/ui/Checkbox/Checkbox";
import {
  COMPONENTS,
  getNextComponent,
  getPreviousComponent,
} from "@/constants/design-engineering/components";
import { useCssSizeVariables } from "@/hooks/useCssSizeVariables";

const SwipeableCardsPage = () => {
  const component = COMPONENTS["swipeable-cards"];
  return (
    <>
      <PageMetas {...component.metas} />
      <TableOfContents.Provider>
        <SwipeableCardsPageContent />
      </TableOfContents.Provider>
    </>
  );
};

const SwipeableCardsPageContent = () => {
  const nextComponent = getNextComponent("swipeable-cards");
  const prevComponent = getPreviousComponent("swipeable-cards");
  const tocContext = TableOfContents.useToc();
  const contentRef = useRef<HTMLDivElement>(null);
  const demoRef = useRef<HTMLDivElement>(null);
  const [discardStyle, setDiscardStyle] = useState<DiscardStyle>("sendToBack");
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

  const cardsSources = [
    {
      id: "2bc312dc-803e-4ab2-b727-aabff8aec505",
      dark: "/media/hello-mat-dark.png",
      light: "/media/hello-mat-light.png",
    },
    {
      id: "a7e24cb8-16da-4215-bbef-83b59718244c",
      dark: "/media/design-engineering/details/og-details-dark.png",
      light: "/media/design-engineering/details/og-details-light.png",
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
    },
    {
      id: "320fc292-94fb-4e72-ada0-33911abce69f",
      dark: "/media/design-engineering/carousel/og-carousel-dark.png",
      light: "/media/design-engineering/carousel/og-carousel-light.png",
    },
  ];

  const cards = cardsSources.map(({ id, light, dark }, index) => ({
    id,
    card: (
      <picture
        key={index}
        className="card flat shadow"
        style={{ display: "inline-block", fontSize: 0, padding: 8 }}
      >
        <source media="(prefers-color-scheme: dark)" srcSet={dark} />
        <img src={light} alt="" style={{ aspectRatio: "1200 / 630" }} />
      </picture>
    ),
  }));

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
        <div
          ref={demoRef}
          className="demo"
          style={{ marginBlock: 32, maxWidth: 650, marginInline: "auto" }}
        >
          <SwipeableCards.Root
            cards={[...cards]}
            visibleStackLength={3}
            discardStyle={discardStyle}
            onSwipe={(direction, cardId) => {
              setSwipedCards((prev) => {
                const newSwipedCards = { ...prev };
                if (newSwipedCards[direction].includes(cardId)) {
                  return prev;
                } else {
                  Object.entries(newSwipedCards).forEach(([key, value]) => {
                    if (key !== direction) {
                      newSwipedCards[key as SwipeDirection] = value.filter(
                        (id) => id !== cardId
                      );
                    } else {
                      newSwipedCards[key as SwipeDirection] = [
                        ...value,
                        cardId,
                      ];
                    }
                  });
                }
                return newSwipedCards;
              });
            }}
            loop
            // emptyView={<EmptyView />}
          >
            <SwipeableCards.Cards />
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
              }}
            >
              <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Checkbox
                  defaultChecked={discardStyle === "sendToBack"}
                  onChange={(event) =>
                    setDiscardStyle(
                      event.target.checked ? "sendToBack" : "fling"
                    )
                  }
                />
                <small style={{ opacity: 0.8 }}>send cards to back</small>
              </label>
            </p>
          </SwipeableCards.Root>
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
        <div
          style={{
            display: "flex",
            gap: 24,
            width: "100%",
            flexWrap: "wrap",
            marginTop: "2em",
          }}
        >
          <PrevCard href={prevComponent.metas.url}>
            {prevComponent.shortTitle}
          </PrevCard>
          <NextCard href={nextComponent.metas.url}>
            {nextComponent.shortTitle}
          </NextCard>
        </div>
      </div>
    </>
  );
};

// Unused component - kept for potential future use
// const EmptyView = () => {
//   const { setStack, cards } = useContext(SwipeableCards.Context)
//   return (
//     <div style={{ padding: 8 }}>
//       <div
//         style={{
//           textAlign: "center",
//           padding: "8px 16px",
//           borderRadius: 8,
//           border: "2px dashed var(--color-border-1)",
//           width: "var(--inline-size)",
//           aspectRatio: "1200 / 630",
//           display: "flex",
//           alignItems: "center",
//           justifyContent: "center",
//           flexDirection: "column",
//           boxSizing: "border-box",
//           gap: 8,
//         }}
//       >
//         No more cards to show
//         <button className="button" onClick={() => setStack(cards)}>
//           Reset stack
//         </button>
//       </div>
//     </div>
//   )
// }

export default SwipeableCardsPage;
