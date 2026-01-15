import { GetStaticProps } from "next";
import Link from "next/link";
import { CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import { codeToHtml } from "shiki";

import { PrevNextNavigation } from "@/components/Navigation/PrevNextNavigation";
import { PageMetas } from "@/components/PageMetas/PageMetas";
import { Slider, SliderValue } from "@/components/Slider/Slider";
import StyledSlider from "@/components/Slider/StyledSlider.module.scss";
import { TableOfContents } from "@/components/TableOfContents/TocComponent";
import {
  ComponentId,
  COMPONENTS,
} from "@/constants/design-engineering/components";

interface CodeBlocks {
  highlightedCode: string;
}

export const getStaticProps: GetStaticProps<CodeBlocks> = async () => {
  const codeSnippet = `
<Slider.Root>
  <Slider.Track>
    <Slider.Range />
  </Slider.Track>
  <Slider.Marker />
  <Slider.Thumb>
    <Slider.Value />
  </Slider.Thumb>
</Slider.Root>
  `.trim();
  const highlightedCode = await codeToHtml(codeSnippet, {
    lang: "tsx",
    themes: {
      light: "vitesse-light",
      dark: "houston",
    },
  });

  return {
    props: {
      highlightedCode,
    },
  };
};

const componentId: ComponentId = "slider";

const SliderPage = (props: CodeBlocks) => {
  const component = COMPONENTS[componentId];
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
  const tocContext = TableOfContents.useToc();
  const contentRef = useRef<HTMLDivElement>(null);
  const [values1, setValues1] = useState<SliderValue[]>([
    { id: 1, value: 82, label: "" },
  ]);
  const [values2, setValues2] = useState<SliderValue[]>([
    { id: 1, value: 32, label: "" },
  ]);
  const [values3, setValues3] = useState<SliderValue[]>([
    { id: 1, value: 10, label: "" },
    { id: 2, value: 42, label: "" },
    { id: 3, value: 60, label: "" },
    { id: 4, value: 80, label: "" },
  ]);

  useEffect(() => {
    if (contentRef.current) {
      tocContext.setRootElement(contentRef.current);
    }
  });

  const formatter = useMemo(
    () =>
      Intl.NumberFormat(undefined, {
        compactDisplay: "short",
        maximumFractionDigits: 0,
      }),
    []
  );

  return (
    <>
      <TableOfContents.Root />
      <div ref={contentRef} className="prose page">
        <Link href="/design-engineering" className="back_link">
          Back to gallery
        </Link>
        <h1 id="design-engineering-a-swipeable-cards-carousel">
          Design engineering: a composable headless slider component
        </h1>
        <p>
          This started out as an exercise, and out of a frustration that both{" "}
          <a
            href={"https://www.radix-ui.com/primitives/docs/components/slider"}
            target="_blank"
            rel="noopener"
          >
            radix
          </a>{" "}
          and{" "}
          <a
            href={"https://base-ui.com/react/components/slider"}
            target="_blank"
            rel="noopener"
          >
            base-ui
          </a>{" "}
          don’t mask the range when using multiple ranges. They highlight the
          whole range from the minimum value to the maximum value, including the
          gap between intermediary values. They also don’t support slider
          markers, which is one of the features I was looking for. While this
          component is far less complete than the ones from Radix and Base-ui,
          it’s feeling useful already. I also added a completely gratuitous
          velocity based effect on the value indicators, which I stole the idea
          from a random tweet I can‘t find anymore (if you recognize yourself or
          know who first posted this,{" "}
          <a href={"https://x.com/@daformat"} target="_blank" rel="noopener">
            let me know
          </a>{" "}
          so I can credit).
        </p>
        <div
          className="demo card alt"
          style={{
            marginBlock: 32,
            padding: "24px clamp(16px, 5vw, 24px)",
            // maxWidth: 650,
            marginInline: "auto",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            backgroundColor: "transparent",
            gap: 16,
          }}
        >
          <div style={{ width: "100%" }}>
            <h3 id="with-markers" style={{ marginTop: 0 }}>
              Fig. 1: a slider with markers
            </h3>
            <p style={{ marginBottom: 0 }}>
              The markers can optionally be made magnetic, with a configurable
              pixel threshold so the slider thumb snaps to the marker value
            </p>
          </div>
          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              width: "100%",
              justifyContent: "center",
            }}
          >
            <small>Markers</small>
            <div className={StyledSlider.wrapper}>
              <Slider.Root
                min={0}
                max={200}
                step={1}
                values={values1}
                onChange={setValues1}
                className={StyledSlider.slider}
                magnetizeMarkers
              >
                <Slider.Track className={StyledSlider.track}>
                  <Slider.Range className={StyledSlider.range} />
                </Slider.Track>
                <Slider.Marker
                  value={0}
                  className={StyledSlider.marker}
                  style={{ backgroundColor: "transparent" }}
                />
                <Slider.Marker value={25} className={StyledSlider.marker} />
                <Slider.Marker value={50} className={StyledSlider.marker} />
                <Slider.Marker value={75} className={StyledSlider.marker} />
                <Slider.Marker value={100} className={StyledSlider.marker} />
                <Slider.Marker value={125} className={StyledSlider.marker} />
                <Slider.Marker value={150} className={StyledSlider.marker} />
                <Slider.Marker value={175} className={StyledSlider.marker} />
                <Slider.Marker
                  value={200}
                  className={StyledSlider.marker}
                  style={{ backgroundColor: "transparent" }}
                />
                <Slider.Thumb valueId={1} className={StyledSlider.thumb}>
                  <span
                    className={StyledSlider.value_wrapper}
                    style={
                      {
                        "--rotate":
                          "calc(min(var(--velocity-abs-1, 0), 3) * var(--velocity-sign-1, 0) / 15 * -90deg)",
                      } as CSSProperties
                    }
                  >
                    <Slider.Value
                      valueId={1}
                      className={StyledSlider.value}
                      formatValue={formatter.format}
                    >
                      <span className={StyledSlider.arrow} />
                    </Slider.Value>
                  </span>
                </Slider.Thumb>
              </Slider.Root>
            </div>
          </div>
        </div>
        <div
          className="demo card alt"
          style={{
            marginBlock: 32,
            padding: "24px clamp(16px, 5vw, 24px)",
            // maxWidth: 650,
            marginInline: "auto",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            backgroundColor: "transparent",
            gap: 16,
          }}
        >
          <div style={{ width: "100%" }}>
            <h3 id="stepped-slider" style={{ marginTop: 0 }}>
              Fig. 2: a stepped slider
            </h3>
            <p style={{ marginBottom: 0 }}>
              No slider component would be usable without a <code>step</code>{" "}
              prop
            </p>
          </div>
          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              width: "100%",
              justifyContent: "center",
            }}
          >
            <small>Stepped</small>
            <div className={StyledSlider.wrapper}>
              <Slider.Root
                min={0}
                max={100}
                step={10}
                values={values2}
                onChange={setValues2}
                className={StyledSlider.slider}
              >
                <Slider.Track className={StyledSlider.track}>
                  <Slider.Range className={StyledSlider.range} />
                </Slider.Track>
                <Slider.Thumb valueId={1} className={StyledSlider.thumb}>
                  <span
                    className={StyledSlider.value_wrapper}
                    style={
                      {
                        "--rotate":
                          "calc(min(var(--velocity-abs-1, 0), 3) * var(--velocity-sign-1, 0) / 15 * -90deg)",
                      } as CSSProperties
                    }
                  >
                    <Slider.Value
                      valueId={1}
                      className={StyledSlider.value}
                      formatValue={formatter.format}
                    >
                      <span className={StyledSlider.arrow} />
                    </Slider.Value>
                  </span>
                </Slider.Thumb>
              </Slider.Root>
            </div>
          </div>
        </div>
        <div
          className="demo card alt"
          style={{
            marginBlock: 32,
            padding: "24px clamp(16px, 5vw, 24px)",
            // maxWidth: 650,
            marginInline: "auto",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            backgroundColor: "transparent",
            gap: 16,
          }}
        >
          <div style={{ width: "100%" }}>
            <h3 id="multiple-ranges-slider" style={{ marginTop: 0 }}>
              Fig. 3: multiple ranges
            </h3>
            <p style={{ marginBottom: 0 }}>
              Sometimes you need to provide the user with the option to select
              multiple ranges within a slider.
            </p>
          </div>
          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              width: "100%",
              justifyContent: "center",
            }}
          >
            <small>Multiple</small>
            <div className={StyledSlider.wrapper}>
              <Slider.Root
                min={0}
                max={100}
                values={values3}
                onChange={setValues3}
                className={StyledSlider.slider}
              >
                <Slider.Track className={StyledSlider.track}>
                  <Slider.Range className={StyledSlider.range} />
                </Slider.Track>
                <Slider.Thumb valueId={1} className={StyledSlider.thumb}>
                  <span
                    className={StyledSlider.value_wrapper}
                    style={
                      {
                        "--rotate":
                          "calc(min(var(--velocity-abs-1, 0), 3) * var(--velocity-sign-1, 0) / 15 * -90deg)",
                      } as CSSProperties
                    }
                  >
                    <Slider.Value
                      valueId={1}
                      className={StyledSlider.value}
                      formatValue={formatter.format}
                    >
                      <span className={StyledSlider.arrow} />
                    </Slider.Value>
                  </span>
                </Slider.Thumb>
                <Slider.Thumb valueId={2} className={StyledSlider.thumb}>
                  <span
                    className={StyledSlider.value_wrapper}
                    style={
                      {
                        "--rotate":
                          "calc(min(var(--velocity-abs-2, 0), 3) * var(--velocity-sign-2, 0) / 15 * -90deg)",
                      } as CSSProperties
                    }
                  >
                    <Slider.Value
                      valueId={2}
                      className={StyledSlider.value}
                      formatValue={formatter.format}
                    >
                      <span className={StyledSlider.arrow} />
                    </Slider.Value>
                  </span>
                </Slider.Thumb>
                <Slider.Thumb valueId={3} className={StyledSlider.thumb}>
                  <span
                    className={StyledSlider.value_wrapper}
                    style={
                      {
                        "--rotate":
                          "calc(min(var(--velocity-abs-3, 0), 3) * var(--velocity-sign-3, 0) / 15 * -90deg)",
                      } as CSSProperties
                    }
                  >
                    <Slider.Value
                      valueId={3}
                      className={StyledSlider.value}
                      formatValue={formatter.format}
                    >
                      <span className={StyledSlider.arrow} />
                    </Slider.Value>
                  </span>
                </Slider.Thumb>
                <Slider.Thumb valueId={4} className={StyledSlider.thumb}>
                  <span
                    className={StyledSlider.value_wrapper}
                    style={
                      {
                        "--rotate":
                          "calc(min(var(--velocity-abs-4, 0), 3) * var(--velocity-sign-4, 0) / 15 * -90deg)",
                      } as CSSProperties
                    }
                  >
                    <Slider.Value
                      valueId={4}
                      className={StyledSlider.value}
                      formatValue={formatter.format}
                    >
                      <span className={StyledSlider.arrow} />
                    </Slider.Value>
                  </span>
                </Slider.Thumb>
              </Slider.Root>
            </div>
          </div>
        </div>
        <h2 id="component-props">Component structure and parts</h2>
        <p>
          This component is built following the headless pattern, you decide how
          you want to style the parts. Here is the basic structure I used in
          these demos, note that <code>Slider.Value</code> doesn’t have to be
          within <code>Slider.Thumb</code>, I put it here so it’s positioned
          relative the to thumb:
        </p>
        <div dangerouslySetInnerHTML={{ __html: props.highlightedCode }} />
        <ul>
          <li>
            <code>Slider.Root</code>: the root, contains all the other parts
            which it provides context to. Accepts 1 or an even number of values.
          </li>
          <li>
            <code>Slider.Track</code>: the running track for the slider.
          </li>
          <li>
            <code>Slider.Range</code>: the active range for the slider (the
            highlighted part).
          </li>
          <li>
            <code>Slider.Thumb</code>: the thumb for a given value, there can be
            1 or an even number of thumbs.
          </li>
          <li>
            <code>Slider.Value</code>: the current value for a given value.
          </li>
          <li>
            <code>Slider.Marker</code>: a marker for a specified values, there
            can be any amount of markers.
          </li>
          <li>
            <code>Slider.useSliderContext</code>: in case you need the slider
            context for custom behavior.
          </li>
        </ul>
        <h2 id="conclusion">That’s a wrap</h2>
        <p>
          Granted; there are missing things: orientation and keyboard controls,
          mainly, I might add them in the future. But this slider component is
          already covering quite a lot of my use cases, and it was a fun way to
          practice the composable headless pattern, which is very powerful when
          building reusable ui components. And it’s just so damn fun to see the
          value react to the drag velocity. Stay tuned!
        </p>
        <PrevNextNavigation currentComponentId={componentId} />
      </div>
    </>
  );
};

export default SliderPage;
