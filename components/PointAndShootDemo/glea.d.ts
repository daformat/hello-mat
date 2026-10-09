/** The parts of the Glea window the demo drives. */
export type GleaViewOptions = {
  markdown?: string;
  title?: string;
  date?: Date;
  /** Where `../assets/` images resolve, with a trailing slash. */
  assets?: string;
  /** An image's URL of your own (a screenshot taken on the page); false while it's loading. */
  resolve?: ((src: string) => string | false | undefined) | null;
  /** A block dragged in the window: the Markdown it leaves. */
  onChange?: ((markdown: string) => void) | null;
  /** Where the toolbar's symbols are, with a trailing slash. */
  symbols?: string;
};

export class GleaView {
  constructor(root: HTMLElement, options?: GleaViewOptions);
  setMarkdown(markdown: string): void;
  scrollToEnd(): void;
}

export class GleaWindow {
  constructor(root: HTMLElement, options?: GleaViewOptions);
  readonly view: GleaView;
  layout(): void;
}
