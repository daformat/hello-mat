import { ButtonGroup } from "../../../components/ButtonGroup/ButtonGroup"
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
} from "react-icons/fa6"
import { DropdownItem } from "../../../components/ButtonGroup/Dropdown/DropdownItem"
import { Toolbar } from "../../../components/Toolbar/Toolbar"
import { ToolbarButton } from "components/Toolbar/ToolbarButton"
import Head from "next/head"
import { TableOfContents } from "components/TableOfContents/TocComponent"
import { useEffect, useRef, useState } from "react"
import { NextCard } from "../../../components/Navigation/NextCard"
import Link from "next/link"

const CollapsibleToolbarPage = () => {
  return (
    <>
      <Head>
        <title>Design engineering: a collapsible toolbar</title>
        <meta
          name="description"
          content="Building a collapsible / resizable toolbar using React, TypeScript, and SCSS."
        />
        <meta
          name="og:video"
          content="https://hello-mat.com/design-engineering/collapsible-toolbar/collapsible-toolbar-overview-light.mp4"
        />
        <meta property="og:video:type" content="video/mp4" />
        <meta property="og:video:width" content="990" />
        <meta property="og:video:height" content="500" />
        <meta name="twitter:card" content="player" />
        <meta
          name="twitter:player"
          content="https://hello-mat.com/design-engineering/collapsible-toolbar/collapsible-toolbar-overview-light.mp4"
        />
        <meta name="twitter:player:width" content="990" />
        <meta name="twitter:player:height" content="500" />
        <meta
          name="twitter:player:stream"
          content="https://hello-mat.com/design-engineering/collapsible-toolbar/collapsible-toolbar-overview-light.mp4"
        />
      </Head>
      <TableOfContents.Provider>
        <CollapsibleToolbarPageContent />
      </TableOfContents.Provider>
    </>
  )
}

const CollapsibleToolbarPageContent = () => {
  const tocContext = TableOfContents.useToc()
  const contentRef = useRef<HTMLDivElement>(null)
  const [slow, setSlow] = useState(false)

  useEffect(() => {
    if (contentRef.current) {
      tocContext.setRootElement(contentRef.current)
    }
  })

  return (
    <>
      <TableOfContents.Root />
      <div ref={contentRef} className="page prose">
        <Link href="/design-engineering" className="back_link">
          Back to gallery
        </Link>
        <h1>Design engineering: a collapsible resizable toolbar</h1>
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
        <NextCard href={"/design-engineering/component/publish-button"}>
          Publish button
        </NextCard>
      </div>
    </>
  )
}

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
]

export default CollapsibleToolbarPage
