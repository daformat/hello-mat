import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  FaAlignCenter,
  FaAlignLeft,
  FaAlignRight,
  FaAnglesRight,
  FaCode,
  FaList,
  FaListOl,
  FaMagnifyingGlass,
  FaRegCopy,
  FaRegMessage,
  FaScissors,
  FaSliders,
} from "react-icons/fa6";

import { ButtonGroup } from "@/components/ButtonGroup/ButtonGroup";
import { DropdownItem } from "@/components/ButtonGroup/Dropdown/DropdownItem";
import { ArticleDates } from "@/components/Navigation/ArticleDates";
import { PrevNextNavigation } from "@/components/Navigation/PrevNextNavigation";
import { ComponentPageMetas } from "@/components/PageMetas/ComponentPageMetas";
import { TableOfContents } from "@/components/TableOfContents/TocComponent";
import { Toolbar } from "@/components/Toolbar/Toolbar";
import { ToolbarButton } from "@/components/Toolbar/ToolbarButton";
import { ComponentId } from "@/constants/design-engineering/components";

const componentId: ComponentId = "collapsible-toolbar";

const CollapsibleToolbarPage = () => {
  return (
    <>
      <ComponentPageMetas componentId={componentId} />
      <TableOfContents.Provider>
        <CollapsibleToolbarPageContent />
      </TableOfContents.Provider>
    </>
  );
};

const CollapsibleToolbarPageContent = () => {
  const tocContext = TableOfContents.useToc();
  const contentRef = useRef<HTMLDivElement>(null);
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    if (contentRef.current) {
      tocContext.setRootElement(contentRef.current);
    }
  });

  return (
    <>
      <TableOfContents.Root />
      <div ref={contentRef} className="page prose">
        <Link href="/design-engineering" className="back_link">
          Back to gallery
        </Link>
        <h1 id="design-engineering-a-collapsible-toolbar">
          A collapsible, resizable toolbar
        </h1>
        <ArticleDates componentId={componentId} />
        <p>
          Within many applications, we need toolbars. The problem is that they
          can only fit as many tools as their size allows. What happens we we
          resize the UI and the tools that fit previously don’t fit anymore?
          This component, made at{" "}
          <a target="_blank" rel="noopener" href="https://kosmik.app">
            Kosmik
          </a>
          , solves this problem by turning the items that don’t fit into a
          dropdown, so that all actions are always available.
        </p>
        <p>
          Try resizing the card below, using the bottom-right corner, to shrink
          the toolbar:
        </p>
        <div
          className="card"
          style={{
            backgroundColor: "var(--color-card-background-secondary)",
            resize: "horizontal",
            overflow: "hidden",
            padding: "2em",
            minWidth: "114px",
            maxWidth: "100%",
          }}
        >
          <Toolbar style={{ minWidth: "54px" }}>
            <ButtonGroup
              collapsible
              buttons={buttons}
              speed={slow ? 0.1 : 1}
              dropdownTrigger={
                <ToolbarButton>
                  <FaAnglesRight />
                </ToolbarButton>
              }
            />
          </Toolbar>
        </div>
        <div style={{ textAlign: "right", marginTop: "0.5em" }}>
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
        <h2 id="how-it-decides-what-to-hide">How it decides what to hide</h2>
        <p>
          There are no breakpoints in this component, and it never listens for
          window resizes. A <code>ResizeObserver</code> watches the toolbar
          itself, which is the only thing that works when the element that
          changed size is a panel, a split view, or in this case a card with a
          resize handle on it, rather than the window.
        </p>
        <p>
          Each item is then measured against the space available, with one
          wrinkle worth pointing out: every item except the last is checked
          against the container width{" "}
          <strong>minus the dropdown trigger</strong>, while the last item is
          checked against the full width. The last item doesn’t have to make
          room for a trigger that would only need to exist if something had
          overflowed, and without that exception you get a toolbar that hides
          its final button in order to make space for a menu containing exactly
          that button.
        </p>
        <h2 id="the-floor">The floor</h2>
        <p>
          On mount, the container takes a <code>min-width</code> equal to the
          trigger’s own width, so however far you drag the handle the toolbar
          can’t shrink past the one control that has to stay reachable.
          Everything else moves into the dropdown as the room runs out, which is
          the whole point: at any size, every action is still available.
        </p>
        <PrevNextNavigation currentComponentId={componentId} />
      </div>
    </>
  );
};

const buttons = [
  {
    id: "left",
    button: (
      <ToolbarButton>
        <FaAlignLeft size={18} />
      </ToolbarButton>
    ),
    menuItem: (
      <DropdownItem displayAction prefix={<FaAlignLeft size={12} />}>
        Align left
      </DropdownItem>
    ),
  },
  {
    id: "center",
    button: (
      <ToolbarButton>
        <FaAlignCenter size={18} />
      </ToolbarButton>
    ),
    menuItem: (
      <DropdownItem displayAction prefix={<FaAlignCenter size={12} />}>
        Align center
      </DropdownItem>
    ),
  },
  {
    id: "right",
    button: (
      <ToolbarButton>
        <FaAlignRight size={18} />
      </ToolbarButton>
    ),
    menuItem: (
      <DropdownItem displayAction prefix={<FaAlignRight size={12} />}>
        Align right
      </DropdownItem>
    ),
  },
  {
    id: "list",
    button: (
      <ToolbarButton>
        <FaList size={18} />
      </ToolbarButton>
    ),
    menuItem: (
      <DropdownItem displayAction prefix={<FaList size={12} />}>
        Insert list
      </DropdownItem>
    ),
  },
  {
    id: "olist",
    button: (
      <ToolbarButton>
        <FaListOl size={18} />
      </ToolbarButton>
    ),
    menuItem: (
      <DropdownItem displayAction prefix={<FaListOl size={12} />}>
        Insert ordered list
      </DropdownItem>
    ),
  },
  {
    id: "code",
    button: (
      <ToolbarButton>
        <FaCode size={18} />
      </ToolbarButton>
    ),
    menuItem: (
      <DropdownItem displayAction prefix={<FaCode size={12} />}>
        Insert code
      </DropdownItem>
    ),
  },
  {
    id: "copy",
    button: (
      <ToolbarButton>
        <FaRegCopy size={18} />
      </ToolbarButton>
    ),
    menuItem: (
      <DropdownItem displayAction prefix={<FaRegCopy size={12} />}>
        Copy
      </DropdownItem>
    ),
  },
  {
    id: "cut",
    button: (
      <ToolbarButton>
        <FaScissors size={18} />
      </ToolbarButton>
    ),
    menuItem: (
      <DropdownItem displayAction prefix={<FaScissors size={12} />}>
        Cut
      </DropdownItem>
    ),
  },
  {
    id: "comment",
    button: (
      <ToolbarButton>
        <FaRegMessage size={18} />
      </ToolbarButton>
    ),
    menuItem: (
      <DropdownItem displayAction prefix={<FaRegMessage size={12} />}>
        Comment
      </DropdownItem>
    ),
  },
  {
    id: "settings",
    button: (
      <ToolbarButton>
        <FaSliders size={18} />
      </ToolbarButton>
    ),
    menuItem: (
      <DropdownItem displayAction prefix={<FaSliders size={12} />}>
        Open settings…
      </DropdownItem>
    ),
  },
  {
    id: "search",
    button: (
      <ToolbarButton>
        <FaMagnifyingGlass size={18} />
      </ToolbarButton>
    ),
    menuItem: (
      <DropdownItem displayAction prefix={<FaMagnifyingGlass size={12} />}>
        Search…
      </DropdownItem>
    ),
  },
];

export default CollapsibleToolbarPage;
