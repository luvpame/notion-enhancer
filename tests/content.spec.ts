import { describe, expect, it } from "vite-plus/test";

import contentScript from "../entrypoints/content";

describe("content script", () => {
  it("runs on both current and legacy Notion app URLs", () => {
    expect(contentScript.matches).toEqual([
      "https://www.notion.so/*",
      "https://app.notion.com/*",
      "https://*.notion.site/*",
    ]);
  });
});
