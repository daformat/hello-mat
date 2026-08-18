import { useEffect, useRef, useState } from "react";
import { FaCheck, FaRegCopy } from "react-icons/fa6";

import styles from "./CodeBlock.module.scss";

/**
 * A highlighted snippet, with a copy button in its top right corner.
 *
 * The HTML comes from shiki at build time, so what gets copied is read back out
 * of the rendered block rather than passed in beside it: one source, and no way
 * for the thing you read and the thing you paste to drift apart.
 *
 * The button sits over the block rather than in a bar above it, because a bar
 * would push every snippet on the site down by its own height for a control
 * most readers never use.
 */
export const CodeBlock = ({
  html,
  label = "code",
}: {
  html: string;
  /** Named in the button's accessible label, for pages with several blocks. */
  label?: string;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  // Long enough to read, short enough that the button is back to normal before
  // you next want it.
  useEffect(() => {
    if (!copied) {
      return;
    }
    const timeout = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(timeout);
  }, [copied]);

  const copy = async () => {
    const code = ref.current?.querySelector("code")?.textContent;
    if (!code) {
      return;
    }
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch {
      // Insecure contexts and older Safari have no clipboard API. The old
      // trick still works everywhere, and failing silently would leave the
      // button looking broken.
      const textarea = document.createElement("textarea");
      textarea.value = code;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      try {
        setCopied(document.execCommand("copy"));
      } catch {
        setCopied(false);
      }
      textarea.remove();
    }
  };

  return (
    <div className={styles.code_block}>
      <div ref={ref} dangerouslySetInnerHTML={{ __html: html }} />
      <button
        type="button"
        className={styles.copy}
        data-copied={copied}
        aria-label={`Copy ${label}`}
        title={`Copy ${label}`}
        onClick={copy}
      >
        {copied ? (
          <FaCheck aria-hidden={true} />
        ) : (
          <FaRegCopy aria-hidden={true} />
        )}
      </button>
      {/* The button's own label stays put, so the confirmation is announced
          here instead of renaming the control under the cursor. */}
      <span role="status" className={styles.visually_hidden}>
        {copied ? `${label} copied to clipboard` : ""}
      </span>
    </div>
  );
};
