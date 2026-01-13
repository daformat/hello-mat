import { GetStaticProps } from "next";
import Link from "next/link";
import { CSSProperties, useEffect, useRef } from "react";
import { codeToHtml } from "shiki";

import { NextCard, PrevCard } from "@/components/Navigation/NextCard";
import { PageMetas } from "@/components/PageMetas/PageMetas";
import { TableOfContents } from "@/components/TableOfContents/TocComponent";
import { TiltingTile } from "@/components/TiltingTile/TiltingTile";
import {
  COMPONENTS,
  getNextComponent,
  getPreviousComponent,
} from "@/constants/design-engineering/components";

interface CodeBlocks {
  highlightedCode: string;
  highlightedCode2: string;
}

export const getStaticProps: GetStaticProps<CodeBlocks> = async () => {
  const codeSnippet = `
useEffect(() => {
  const span = ref.current;
  if (span) {
    const handleGlobalPointerMove = (event: PointerEvent) => {
      const span = ref.current;
      if (span) {
        const maxAngle = 5;
        const { left, top, width, height } = span.getBoundingClientRect();
        const x = event.clientX - left;
        const y = event.clientY - top;
        const dX = (x / width - 0.5) * 2;
        const dY = (y / height - 0.5) * 2;
        const tiltX = Math.min(dX ** 2 * maxAngle, maxAngle) * Math.sign(dX);
        const tiltY = Math.min(dY ** 2 * maxAngle, maxAngle) * Math.sign(dY);
        span.style.setProperty(
          "--tilt-x",
          \`\${Math.round(tiltY * 100) / 100}deg\`
        );
        span.style.setProperty(
          "--tilt-y",
          \`\${-Math.round(tiltX * 100) / 100}deg\`
        );
        span.style.setProperty("--pointer-x", \`\${(x / width) * 100}%\`);
        span.style.setProperty("--pointer-y", \`\${(y / height) * 100}%\`);
        span.style.setProperty("--pointer-dx", \`\${dX}\`);
        span.style.setProperty("--pointer-dy", \`\${dY}\`);
      }
    };
    document.addEventListener("pointermove", handleGlobalPointerMove);
    return () => {
      document.removeEventListener("pointermove", handleGlobalPointerMove);
    };
  }
}, []);
  `.trim();
  const highlightedCode = await codeToHtml(codeSnippet, {
    lang: "tsx",
    themes: {
      light: "vitesse-light",
      dark: "houston",
    },
  });

  const codeSnippet2 = `
.titling_tile {
  // ...

  .specular {
    background-image: radial-gradient(
      circle at var(--pointer-x) var(--pointer-y),
      #fff,
      transparent var(--specular-size, 100%)
    );
    // ...
  }

  &:hover,
  &:active {
    animation: rotate-in 0.2s var(--ease-out-cubic) backwards;
    transform: rotateX(var(--tilt-x, 0)) rotateY(var(--tilt-y, 0));

    .layer {
      animation: translate-in 0.2s var(--ease-out-cubic) backwards;
      transform: translate(
        calc(var(--pointer-dx, 0) * var(--depth) * -0.5%),
        calc(var(--pointer-dy, 0) * var(--depth) * -0.5%)
      );
    }
  }
}
`.trim();

  const highlightedCode2 = await codeToHtml(codeSnippet2, {
    lang: "scss",
    themes: {
      light: "vitesse-light",
      dark: "houston",
    },
  });

  return {
    props: {
      highlightedCode,
      highlightedCode2,
    },
  };
};

const SliderPage = (props: CodeBlocks) => {
  const component = COMPONENTS["tilting-tile"] ?? {};
  return (
    <>
      <PageMetas {...component.metas} />
      <TableOfContents.Provider>
        <SliderPageContent {...props} />
      </TableOfContents.Provider>
    </>
  );
};

const SliderPageContent = (props: CodeBlocks) => {
  const nextComponent = getNextComponent("tilting-tile");
  const prevComponent = getPreviousComponent("tilting-tile");
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
        <h1 id="design-engineering-a-swipeable-cards-carousel">
          Design engineering: a tvOS inspired tilting card component
        </h1>
        <p>
          I am always fascinated when I see these subtle parallax effects on
          tvOS, it adds so much depth and never fails to make me smile. These
          are fairly easy components to re-create, it just takes a fair amount
          of tweaking the layers to get the parallax effect right. Not to
          mention you have to create layered images and masks, but it’s worth
          the effort. Hover the cards below and move your pointer around.
        </p>
        <div
          className="demo card alt"
          style={{
            marginBlock: 32,
            padding: "0",
            // maxWidth: 650,
            marginInline: "clamp(-100px, -7vw, 0px)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            backgroundColor: "transparent",
            gap: 16,
            border: "none",
            boxShadow: "none",
          }}
        >
          <div
            style={
              {
                display: "flex",
                gap: "clamp(16px, 2vw, 32px)",
                alignItems: "center",
                width: "100%",
                justifyContent: "center",
                perspective: "500px",
                transformStyle: "preserve-3d",
                perspectiveOrigin: "center",
                filter: `
                  drop-shadow(0 1px 12px var(--color-shadow-strong))
                  `,
                "--specular-size": "50%",
              } as CSSProperties
            }
          >
            <TiltingTile
              layers={[
                {
                  img: (
                    <img
                      width={698 / 2}
                      height={991 / 2}
                      src={
                        "/media/design-engineering/tilting-tile/godfather-bg.jpg"
                      }
                      style={{ scale: 1.2 }}
                    />
                  ),
                  depth: -5,
                },
                {
                  img: (
                    <img
                      width={698 / 2}
                      height={991 / 2}
                      src={
                        "/media/design-engineering/tilting-tile/godfather-mid.jpg"
                      }
                      style={{
                        maskImage:
                          "url(/media/design-engineering/tilting-tile/godfather-mid-mask.png)",
                        // maskMode: "luminance",
                        maskSize: "100% 100%",
                        maskRepeat: "no-repeat",
                        scale: 1.02,
                        transformOrigin: "center -60%",
                        willChange: "mask-image",
                      }}
                    />
                  ),
                  depth: -2,
                },
                {
                  img: (
                    <img
                      width={698 / 2}
                      height={991 / 2}
                      src={
                        "/media/design-engineering/tilting-tile/godfather-fg.jpg"
                      }
                      style={{
                        maskImage:
                          "url(/media/design-engineering/tilting-tile/godfather-fg-mask.png)",
                        // maskMode: "luminance",
                        maskSize: "100% 100%",
                        maskRepeat: "no-repeat",
                        transform: "translateY(5%)",
                        willChange: "mask-image",
                      }}
                    />
                  ),
                  depth: -2,
                },
              ]}
            />
            <TiltingTile
              layers={[
                {
                  img: (
                    <img
                      width={698 / 2}
                      height={991 / 2}
                      src={
                        "/media/design-engineering/tilting-tile/fight-club-bg.jpg"
                      }
                      style={{ scale: 1.2 }}
                    />
                  ),
                  depth: -6,
                },
                {
                  img: (
                    <img
                      width={698 / 2}
                      height={991 / 2}
                      src={
                        "/media/design-engineering/tilting-tile/fight-club-mid.jpg"
                      }
                      style={{
                        maskImage:
                          "url(/media/design-engineering/tilting-tile/fight-club-mid-mask.png)",
                        // maskMode: "luminance",
                        maskSize: "100% 100%",
                        maskRepeat: "no-repeat",
                        scale: 1.06,
                        transformOrigin: "center 60%",
                        willChange: "mask-image",
                      }}
                    />
                  ),
                  depth: -4,
                },
                {
                  img: (
                    <img
                      width={698 / 2}
                      height={991 / 2}
                      src={
                        "/media/design-engineering/tilting-tile/fight-club-fg.jpg"
                      }
                      style={{
                        maskImage:
                          "url(/media/design-engineering/tilting-tile/fight-club-fg-mask.png)",
                        // maskMode: "luminance",
                        maskSize: "100% 100%",
                        maskRepeat: "no-repeat",
                        scale: 1.04,
                        transformOrigin: "50% center",
                        willChange: "mask-image",
                      }}
                    />
                  ),
                  depth: -3,
                },
              ]}
            />
            <TiltingTile
              layers={[
                {
                  img: (
                    <img
                      width={698 / 2}
                      height={991 / 2}
                      src={
                        "/media/design-engineering/tilting-tile/matrix-bg.jpg"
                      }
                      style={{ scale: 1.1 }}
                    />
                  ),
                  depth: -6,
                },
                {
                  img: (
                    <img
                      width={698 / 2}
                      height={991 / 2}
                      src={
                        "/media/design-engineering/tilting-tile/matrix-mid.jpg"
                      }
                      style={{
                        maskImage:
                          "url(/media/design-engineering/tilting-tile/matrix-mid-mask.png)",
                        // maskMode: "luminance",
                        maskSize: "100% 100%",
                        maskRepeat: "no-repeat",
                        scale: 1.06,
                        transformOrigin: "center 60%",
                        willChange: "mask-image",
                      }}
                    />
                  ),
                  depth: -4,
                },
                {
                  img: (
                    <img
                      width={698 / 2}
                      height={991 / 2}
                      src={
                        "/media/design-engineering/tilting-tile/matrix-fg.jpg"
                      }
                      style={{
                        maskImage:
                          "url(/media/design-engineering/tilting-tile/matrix-fg-mask.png)",
                        // maskMode: "luminance",
                        maskSize: "100% 100%",
                        maskRepeat: "no-repeat",
                        scale: 1.04,
                        transformOrigin: "50% center",
                        willChange: "mask-image",
                      }}
                    />
                  ),
                  depth: -3,
                },
              ]}
            />
          </div>
        </div>

        <h2 id="tilting-card-effect">
          Hoz does the parallax tilting card effect work?
        </h2>
        <p>
          As I said, this is fairly simple: we listen to the pointer position
          and derive the tilting angle, the parallax layer shifts, and the
          position of the specular highlight from that. We listen to the{" "}
          <code>pointer move</code> event on the whole document, since we want
          the specular highlight to follow the pointer, no matter if it is
          hovering the tile / card or not.
        </p>
        <div dangerouslySetInnerHTML={{ __html: props.highlightedCode }} />
        <p>
          From there on, it’s just a little bit of css magic to rotate the card,
          shift layers based on their depth, and position the specular
          highlight. Here’s the gist of it:
        </p>
        <div dangerouslySetInnerHTML={{ __html: props.highlightedCode2 }} />
        <h2 id="conclusion">That’s a wrap</h2>
        <p>
          In the end, it’s a simple effect to achieve, tilting the cards and
          achieving the parallax effect is as easy as getting the pointer
          position and do a little bit of math, nothing too crazy. However
          simple technically speaking, the tilting card effect with parallax and
          specular highlight is incredibly satisfying. Apple really nailed it in
          tvOS, it’s a shame so little tiles are using the parallax effect, but
          I can understand since this needs crating layered assets manually.
          Stay tuned
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

export default SliderPage;
