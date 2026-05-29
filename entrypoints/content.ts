import { browser } from "wxt/browser";

import {
  createCopyMarkdownButtonController,
  registerCopyMarkdownButton,
} from "../lib/notion/copy-markdown-button";
import { registerHeadingMarker } from "../lib/notion/heading-marker";
import {
  createCopyTitleHoverController,
  registerCopyTitleHoverButtons,
} from "../lib/notion/title-copy-hover";

export default defineContentScript({
  matches: ["https://www.notion.so/*", "https://app.notion.com/*", "https://*.notion.site/*"],
  runAt: "document_idle",
  main() {
    const copyMarkdownButtonController = createCopyMarkdownButtonController();
    const titleCopyHoverController = createCopyTitleHoverController();

    void registerCopyMarkdownButton(browser, copyMarkdownButtonController);
    void registerCopyTitleHoverButtons(browser, titleCopyHoverController);
    void registerHeadingMarker(browser);

    document.addEventListener("turbo:load", () => {
      copyMarkdownButtonController.refresh();
      titleCopyHoverController.refresh();
    });
    window.addEventListener("popstate", () => {
      window.setTimeout(() => {
        copyMarkdownButtonController.refresh();
        titleCopyHoverController.refresh();
      }, 500);
    });
  },
});
