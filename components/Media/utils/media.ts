/**
 * Stop any nested medias in the given containing element
 * - For iframe this is done through resetting the iframe's src attribute
 * - For Audio and Video html elements, this is done through the native .pause() method
 * This hacky, but super handy trick was found on https://gist.github.com/cferdinandi/9044694
 * @param container
 */
export const stopNestedMedias = (container: HTMLElement | null): void => {
  if (container) {
    const iframes = container.querySelectorAll("iframe")
    const medias = container.querySelectorAll(
      "video, audio"
    ) as NodeListOf<HTMLMediaElement>
    // If we don't remove the lazy attribute, the media will only
    // stop playing when shown again, so we want to make sure we remove it
    const removeLoading = (element: HTMLElement) =>
      element.setAttribute("loading", "")
    iframes.forEach((iframe) => {
      removeLoading(iframe)
      const src = iframe.src
      if (src) {
        iframe.src = src
      }
    })
    medias.forEach((media) => {
      removeLoading(media)
      media.pause()
    })
  } else {
    console.warn("Cannot stop nested medias without a container element")
  }
}
