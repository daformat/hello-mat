import Link from "next/link";
import { CSSProperties, useEffect, useMemo, useRef } from "react";

import { NextCard } from "@/components/Navigation/NextCard";
import { Slider } from "@/components/Slider/Slider";
import StyledSlider from "@/components/Slider/StyledSlider.module.scss";
import { TableOfContents } from "@/components/TableOfContents/TocComponent";
import {
  COMPONENTS,
  getNextComponent,
} from "@/constants/design-engineering/components";

const SliderPage = () => {
  const component = COMPONENTS["slider"] ?? {};
  return (
    <>
      {/*<PageMetas {...(component.metas)} />*/}
      <TableOfContents.Provider>
        <SliderPageContent />
      </TableOfContents.Provider>
    </>
  );
};

const SliderPageContent = () => {
  const nextComponent = getNextComponent("slider");
  const tocContext = TableOfContents.useToc();
  const contentRef = useRef<HTMLDivElement>(null);

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
            // padding: 0,
            // maxWidth: 650,
            marginInline: "auto",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            backgroundColor: "transparent",
          }}
        >
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <small>Stepped</small>
            <div className={StyledSlider.wrapper}>
              <Slider.Root
                min={0}
                max={100}
                step={10}
                defaultValues={[{ id: 1, value: 10, label: "" }]}
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
                          "calc(min(var(--velocity-1, 0), 3) / 15 * -90deg)",
                      } as CSSProperties
                    }
                  >
                    <Slider.Value valueId={1} className={StyledSlider.value}>
                      <span className={StyledSlider.arrow} />
                    </Slider.Value>
                  </span>
                </Slider.Thumb>
              </Slider.Root>
            </div>
          </div>
          <br />
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <small>Multiple</small>
            <div className={StyledSlider.wrapper}>
              <Slider.Root
                min={0}
                max={100}
                defaultValues={[
                  { id: 1, value: 10, label: "" },
                  { id: 2, value: 12, label: "" },
                  { id: 3, value: 60, label: "" },
                  { id: 4, value: 80, label: "" },
                ]}
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
                          "calc(min(var(--velocity-1, 0), 3) / 15 * -90deg)",
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
                          "calc(min(var(--velocity-2, 0), 3) / 15 * -90deg)",
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
                          "calc(min(var(--velocity-3, 0), 3) / 15 * -90deg)",
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
                          "calc(min(var(--velocity-4, 0), 3) / 15 * -90deg)",
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

export default SliderPage;
