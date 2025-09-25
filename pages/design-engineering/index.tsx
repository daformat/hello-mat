import Link from "next/link"

const DesignEngineeringIndex = () => (
  <>
    <div
      className="page"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        width: "min(calc(100vw - 200px), 900px)",
      }}
    >
      <Link
        href={"/design-engineering/component/table-of-contents"}
        style={{
          alignItems: "center",
          backgroundColor: "var(--color-toolbar-background)",
          borderRadius: "14px",
          boxShadow: `0 1px 12px var(--color-shadow-1),
          inset 0 0 2px 0.75px var(--color-border-2),
          inset 0 0 0 0.75px var(--color-border-1)`,
          display: "flex",
          flexDirection: "row",
          gap: "8px",
          justifyContent: "center",
          padding: "7px",
          transition: `color 0.2s ease-in-out, background-color 0.2s ease-in-out",
            boxShadow 0.2s ease-in-out;`,
        }}
      >
        A Table of content component
      </Link>
      <Link
        href={"/design-engineering/component/details-disclosure-component"}
        style={{
          alignItems: "center",
          backgroundColor: "var(--color-toolbar-background)",
          borderRadius: "14px",
          boxShadow: `0 1px 12px var(--color-shadow-1),
          inset 0 0 2px 0.75px var(--color-border-2),
          inset 0 0 0 0.75px var(--color-border-1)`,
          display: "flex",
          flexDirection: "row",
          gap: "8px",
          justifyContent: "center",
          padding: "7px",
          transition: `color 0.2s ease-in-out, background-color 0.2s ease-in-out",
            boxShadow 0.2s ease-in-out;`,
        }}
      >
        A details (or disclosure) component
      </Link>
      <Link
        href={"/design-engineering/component/images-and-embeds"}
        style={{
          alignItems: "center",
          backgroundColor: "var(--color-toolbar-background)",
          borderRadius: "14px",
          boxShadow: `0 1px 12px var(--color-shadow-1),
          inset 0 0 2px 0.75px var(--color-border-2),
          inset 0 0 0 0.75px var(--color-border-1)`,
          display: "flex",
          flexDirection: "row",
          gap: "8px",
          justifyContent: "center",
          padding: "7px",
          transition: `color 0.2s ease-in-out, background-color 0.2s ease-in-out",
            boxShadow 0.2s ease-in-out;`,
        }}
      >
        Images and embeds
      </Link>
    </div>
  </>
)

export default DesignEngineeringIndex
