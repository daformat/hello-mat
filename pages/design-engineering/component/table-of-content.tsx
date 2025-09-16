import { TableOfContent } from "../../../components/TableOfContent/TocComponent"
import { useEffect, useRef } from "react"
import { DetailsComponent } from "../../../components/Details/DetailsComponent"
import Head from "next/head"

const TableOfContentPage = () => {
  return (
    <>
      <Head>
        <title>Design engineering: a table of contents component</title>
        <meta
          name="description"
          content="Building a table of contents component, using React, TypeScript, and SCSS."
        />
      </Head>
      <TableOfContent.Provider>
        <TableOfContentPageContent />
      </TableOfContent.Provider>
    </>
  )
}

const TableOfContentPageContent = () => {
  const tocContext = TableOfContent.useToc()
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (contentRef.current) {
      tocContext.setRootElement(contentRef.current)
    }
  })

  return (
    <>
      <TableOfContent.Root />
      <div ref={contentRef} className="prose page">
        <h1 id="design-engineering-a-table-of-content-component">
          Design engineering: a table of content component
        </h1>
        <p>
          This component (shown on the left hand-side, play with it!) was
          crafted at <a href="https://beamapp.co">Beam</a>, a browser with a
          first-class note taking experience. With beam, you can point and shoot
          elements from the pages you’re browsing and build rich-media notes out
          of them, complete with references and back-linking.
        </p>
        <h2 id="the-problem">The problem (requirements)</h2>
        <p>Click requirements to expand them</p>
        <h3 id="functional-requirements">Functional requirements</h3>
        <DetailsComponent
          id="requirements-1"
          summary={
            <>
              The table of content should display a structured list of headings
            </>
          }
        >
          <ul style={{ marginLeft: "0.9em" }}>
            <li>Given a specified html root element</li>
            <li>In the case of no headings, the component shouldn’t display</li>
          </ul>
        </DetailsComponent>
        <DetailsComponent
          id="requirements-2"
          summary={<>Each element in the list should be clickable</>}
        >
          <ul style={{ marginLeft: "0.9em" }}>
            <li>Clicking an element should scroll to the targeted element</li>
          </ul>
        </DetailsComponent>
        <DetailsComponent
          id="requirements-3"
          summary={
            <>
              The table of content should support elements with and without{" "}
              <code>id</code>
            </>
          }
        >
          <ul style={{ marginLeft: "0.9em" }}>
            <li>
              Scrolling to the targeted element, no matter if it has an{" "}
              <code>id</code> or&nbsp;not
            </li>
          </ul>
        </DetailsComponent>
        <DetailsComponent
          id="requirements-4"
          summary={
            <>
              The table of content should be responsive and adapt to the
              viewport
            </>
          }
        >
          <ul style={{ marginLeft: "0.9em" }}>
            <li>
              If the viewport is too small to display the summary links, keep
              only the collapsed state
            </li>
          </ul>
        </DetailsComponent>
        <DetailsComponent
          id="requirements-5"
          summary={<>The table of content should update automatically</>}
        >
          <ul style={{ marginLeft: "0.9em" }}>
            <li>When the html root element changes,</li>
            <li>or when its content updates</li>
          </ul>
        </DetailsComponent>
        <DetailsComponent
          id="requirements-6"
          summary={<>The table of content component should be fault-tolerant</>}
        >
          <ul style={{ marginLeft: "0.9em" }}>
            <li>
              correctly render even in the case where headings are not properly
              ordered in the document: <code>h1 &gt; h2 &gt; h3</code> should
              render the same as <code>h1 &gt; h3 &gt; h5</code>
            </li>
          </ul>
        </DetailsComponent>
        <DetailsComponent
          id="requirements-7"
          summary={<>The table of content should be scrollable</>}
        >
          <ul style={{ marginLeft: "0.9em" }}>
            <li>
              if taller than the viewport, the table of content should be
              scrollable
            </li>
          </ul>
        </DetailsComponent>
        <h3 id="non-functional-requirements">Non-functional requirements</h3>
        <ul>
          <li>The table of content should be accessible to screen readers</li>
          <li>The table of content should be accessible to keyboard users</li>
          <li>The table of content should be accessible to mouse users</li>
          <li>The table of content should be accessible to touch users</li>
          <li>
            The table of content should be responsive and adapt to the viewport
          </li>
        </ul>
        <h2 id="the-solution">The solution</h2>
        <p>
          The table of content component was built using React, TypeScript, and
          (s)CSS. It was designed to be flexible and adaptable to different
          scenarios. Let’s review some of the requirements and see how we went
          about.
        </p>
        <h3 id="anotomy-of-the-component">
          Anatomy of the Table of Content component
        </h3>
        <ul>
          <li>
            <code>TableOfContent.Root</code>: the table of content itself, it’s
            a simple component that calls a private <code>TocElement</code>
            component to render each entry in the table of content
          </li>
          <li>
            <code>TableOfContent.Provider</code>: a context provider that makes
            the table of content available to all its children
          </li>
          <li>
            <code>TableOfContent.useToc</code>: a hook that returns the table of
            content context, containing the <code>rootElement</code> and a
            setter for the <code>rootElement</code>
          </li>
        </ul>
        <h3 id="structured-list-of-headings">
          Display a structured list of headings
        </h3>
        <p>
          The table of content has two states: idle and active. When the table
          of content is idle, it displays dashes to represent the headings. The
          dashes length depends on the level of heading it represents. When the
          table of content is active, it displays the heading text (truncated if
          necessary).
        </p>
        <h3 id="clickable-and-scroll-to-the-targeted-element">
          Table of content entries should be clickable and scroll to the
          targeted element and should support elements with and without ids
        </h3>
        <p>
          Provided the headings have an <code>id</code>, we get this behavior
          for free by simply linking to the id of the heading using a hash.
          Should the headings not have an <code>id</code>, we can still provide
          a clickable element that scrolls to the targeted element, using
          <code>element.scrollIntoView()</code>. In this cas we also apply a
          temporary class to the targeted element so we can trigger a CSS
          animation highlighting the targeted element. We use this logic to also
          enable clicking the dashes when the viewport is too small to display
          the table of content.
        </p>
        <h3 id="automatic-updates">Update automatically</h3>
        <p>
          For the automatic updates, we have to take care of two possible events
        </p>
        <ul>
          <li>
            <strong>
              The <code>rootElement</code> itself changes
            </strong>
            : in the component that renders <code>rootElement</code>, we call th
            context setter to update it, in case of re-renders that would change
            the element itself
          </li>
          <li>
            <strong>
              The content of the rootElement<code>rootElement</code> changes
            </strong>
            : to account for modifications of the subtree of the root element,
            we use a <code>MutationObserver</code> that triggers a re-render of
            the table of content
          </li>
        </ul>
      </div>
    </>
  )
}

export default TableOfContentPage
