import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vite-plus/test";

import App from "../entrypoints/popup/app";

const storageState: Record<string, boolean> = {
  copyMarkdownButtonEnabled: true,
  headingMarkerEnabled: true,
  copyTitleHoverEnabled: true,
};

vi.mock("wxt/browser", () => ({
  browser: {
    storage: {
      local: {
        get: vi.fn(async (defaults: Record<string, boolean>) => ({
          ...defaults,
          ...storageState,
        })),
        set: vi.fn(async (items: Record<string, boolean>) => {
          Object.assign(storageState, items);
        }),
      },
    },
    runtime: {
      sendMessage: vi.fn(),
    },
  },
}));

describe("popup", () => {
  it("shows only the feature toggles as popup controls", () => {
    const markup = renderToStaticMarkup(<App />);

    expect(markup.match(/role="switch"/g)).toHaveLength(3);
    expect(markup).toContain("Notion Enhancer");
    expect(markup).toContain("Markdown コピー");
    expect(markup).toContain("Notion ページを Markdown としてコピーします。");
    expect(markup).toContain("見出しマーカー");
    expect(markup).toContain("見出しの横に Markdown 記法の目印を表示します。");
    expect(markup).toContain("タイトル hover UI");
    expect(markup).toContain("タイトルに触れたときコピー操作を表示します。");
    expect(markup).not.toContain("使い方");
    expect(markup).not.toContain("変換の方針");
    expect(markup).not.toContain("Background");
    expect(markup).not.toContain("Chrome 拡張機能");
    expect(markup.match(/<button/g)).toHaveLength(3);
  });
});
