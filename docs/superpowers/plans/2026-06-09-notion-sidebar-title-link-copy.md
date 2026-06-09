# Notion Sidebar Title Link Copy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Notion のサイドパネルで開いたページでも、タイトル hover UI からタイトルコピーと単体ページ Markdown リンクコピーを使えるようにする。

**Architecture:** 既存の `title-copy-hover` controller を維持し、タイトル候補探索と Markdown リンク URL 生成だけを小さく拡張する。サイドパネル内の見えている H1 を通常ページ H1 より優先し、`p` query parameter があるときは `https://www.notion.so/{p}` を単体ページ URL として使う。

**Tech Stack:** WXT, React, TypeScript, Vite+, jsdom, `vite-plus/test`

---

## File Structure

- Modify: `lib/notion/title-copy-hover.ts`
  - タイトル検出 helper を追加する。
  - Markdown リンク用の単体ページ URL helper を追加する。
  - 既存の hover UI、clipboard 状態遷移、設定連携は変更しない。
- Modify: `tests/title-copy-hover.spec.ts`
  - サイドパネル DOM のテスト fixture を追加する。
  - `?p={pageId}` 付き URL で単体ページ URL がコピーされることをテストする。
  - 通常ページ URL の既存挙動が壊れないことを維持する。

## Task 1: Failing Tests For Sidebar Title And `p` URL

**Files:**
- Modify: `tests/title-copy-hover.spec.ts`

- [ ] **Step 1: Add a reusable DOM setup helper for title hover tests**

Add this helper below `setPanelSize` in `tests/title-copy-hover.spec.ts`:

```ts
const setupTitleHoverDom = (document: Document): (() => void) => {
  const originalDocument = globalThis.document;
  const originalMutationObserver = globalThis.MutationObserver;
  const originalWindow = globalThis.window;
  const originalNavigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  const targetNavigator = document.defaultView?.navigator;
  const clipboardDescriptor = targetNavigator
    ? Object.getOwnPropertyDescriptor(targetNavigator, "clipboard")
    : undefined;
  const writeText = vi.fn().mockResolvedValue(undefined);

  Object.assign(globalThis, {
    document,
    window: document.defaultView,
    MutationObserver: setupMutationObserverMock(),
  });
  Object.defineProperty(targetNavigator ?? {}, "clipboard", {
    value: {
      writeText,
    },
    configurable: true,
  });
  Object.defineProperty(globalThis, "navigator", {
    value: targetNavigator,
    configurable: true,
  });

  return () => {
    Object.assign(globalThis, {
      document: originalDocument,
      window: originalWindow,
      MutationObserver: originalMutationObserver,
    });
    if (originalNavigatorDescriptor) {
      Object.defineProperty(globalThis, "navigator", originalNavigatorDescriptor);
    } else {
      delete (globalThis as { navigator?: Navigator }).navigator;
    }
    if (targetNavigator) {
      if (clipboardDescriptor) {
        Object.defineProperty(targetNavigator, "clipboard", clipboardDescriptor);
      } else {
        delete (targetNavigator as { clipboard?: unknown }).clipboard;
      }
    }
  };
};
```

- [ ] **Step 2: Add a test for sidebar title detection**

Add this test inside `describe("copy title hover controller", () => { ... })`:

```ts
it("adds the hover panel for a sidebar page title", () => {
  const { window } = new JSDOM(
    `<!doctype html><html><head></head><body>
      <main><h1>Parent page</h1></main>
      <div role="dialog" aria-label="Side peek">
        <section class="notion-page-block">
          <h1>  Sidebar Page  </h1>
        </section>
      </div>
    </body></html>`,
    { url: "https://www.notion.so/parent-page?p=abcdef1234567890" },
  );
  const restore = setupTitleHoverDom(window.document);
  const controller = createCopyTitleHoverController();

  try {
    controller.setEnabled(true);

    const sidebarTitle = window.document.querySelector('[role="dialog"] h1:first-of-type');
    const panel = window.document.getElementById("notion-enhancer-title-copy-hover");
    expect(sidebarTitle).not.toBeNull();
    expect(panel).not.toBeNull();

    sidebarTitle?.dispatchEvent(new window.MouseEvent("mouseenter", { bubbles: true }));
    expect(panel?.hidden).toBe(false);
  } finally {
    controller.dispose();
    restore();
  }
});
```

- [ ] **Step 3: Add a test for copying the sidebar page title and standalone `p` URL**

Add this test inside `describe("copy actions", () => { ... })`:

```ts
it("copies sidebar title text and a standalone page link from the p query parameter", async () => {
  const pageId = "abcdef1234567890abcdef1234567890";
  const { window } = new JSDOM(
    `<!doctype html><html><head></head><body>
      <main><h1>Parent page</h1></main>
      <div role="dialog" aria-label="Side peek">
        <section class="notion-page-block">
          <h1>  [Sidebar](Page)  </h1>
        </section>
      </div>
    </body></html>`,
    { url: `https://www.notion.so/parent-page?p=${pageId}` },
  );
  const restore = setupTitleHoverDom(window.document);
  const writeText = vi.mocked(navigator.clipboard.writeText);
  const controller = createCopyTitleHoverController();

  try {
    controller.setEnabled(true);

    const buttons = window.document.querySelectorAll<HTMLButtonElement>("button[data-key]");
    const titleButton = [...buttons].find(
      (button) => button.getAttribute("data-key") === "title",
    );
    const markdownButton = [...buttons].find(
      (button) => button.getAttribute("data-key") === "markdown",
    );
    expect(titleButton).not.toBeUndefined();
    expect(markdownButton).not.toBeUndefined();

    titleButton?.click();
    markdownButton?.click();
    await Promise.resolve();
    await Promise.resolve();

    expect(writeText).toHaveBeenCalledWith("【Sidebar】（Page）");
    expect(writeText).toHaveBeenCalledWith(
      `[【Sidebar】（Page）](https://www.notion.so/${pageId})`,
    );
  } finally {
    controller.dispose();
    restore();
  }
});
```

- [ ] **Step 4: Run the focused test and verify it fails**

Run:

```bash
vp test tests/title-copy-hover.spec.ts
```

Expected result:

```text
FAIL tests/title-copy-hover.spec.ts
```

The new sidebar title test should fail because `title-copy-hover.ts` does not yet select the sidebar title. The new `p` URL test should fail because Markdown links still use the current pathname.

## Task 2: Implement Sidebar Title Detection

**Files:**
- Modify: `lib/notion/title-copy-hover.ts`
- Test: `tests/title-copy-hover.spec.ts`

- [ ] **Step 1: Replace the single selector with focused selector constants**

In `lib/notion/title-copy-hover.ts`, replace:

```ts
const titleSelector = "main h1:first-of-type, .notion-page-block:first-child h1:first-of-type";
```

with:

```ts
const pageTitleSelector = "main h1:first-of-type, .notion-page-block:first-child h1:first-of-type";
const sidebarTitleSelector = '[role="dialog"] h1:first-of-type';
```

- [ ] **Step 2: Add visible element and title lookup helpers**

Add these helpers below `normalizeMarkdownTitle`:

```ts
const isVisibleElement = (element: HTMLElement): boolean => {
  if (element.hidden || element.getAttribute("aria-hidden") === "true") {
    return false;
  }

  const style = window.getComputedStyle(element);
  return style.display !== "none" && style.visibility !== "hidden";
};

const findTitle = (): HTMLHeadingElement | null => {
  const sidebarTitle = [...document.querySelectorAll<HTMLHeadingElement>(sidebarTitleSelector)]
    .find(isVisibleElement);

  if (sidebarTitle) {
    return sidebarTitle;
  }

  const pageTitle = document.querySelector<HTMLHeadingElement>(pageTitleSelector);
  return pageTitle?.tagName === "H1" ? pageTitle : null;
};
```

- [ ] **Step 3: Use `findTitle()` for copied title text**

Replace this code:

```ts
const buildTitleCopyText = (): string =>
  normalizeMarkdownTitle(document.querySelector(titleSelector)?.textContent?.trim() ?? "");
```

with:

```ts
const buildTitleCopyText = (): string =>
  normalizeMarkdownTitle(findTitle()?.textContent?.trim() ?? "");
```

- [ ] **Step 4: Use `findTitle()` in `install()`**

Replace this code:

```ts
const install = (): boolean => {
  const title = document.querySelector(titleSelector);
  if (!title || title.tagName !== "H1") {
    detachTitleHandlers();
    return false;
  }

  attachTitleHandlers(title as HTMLHeadingElement);
  return true;
};
```

with:

```ts
const install = (): boolean => {
  const title = findTitle();
  if (!title) {
    detachTitleHandlers();
    return false;
  }

  attachTitleHandlers(title);
  return true;
};
```

- [ ] **Step 5: Run the focused test and confirm only URL behavior remains failing**

Run:

```bash
vp test tests/title-copy-hover.spec.ts
```

Expected result:

```text
FAIL tests/title-copy-hover.spec.ts
```

The sidebar hover panel test should now pass. The `p` URL expectation may still fail until Task 3.

## Task 3: Implement Standalone URL From `p`

**Files:**
- Modify: `lib/notion/title-copy-hover.ts`
- Test: `tests/title-copy-hover.spec.ts`

- [ ] **Step 1: Add a standalone page URL helper**

Add this helper below `findTitle()`:

```ts
const buildStandalonePageUrl = (): string => {
  const locationUrl = new URL(window.location.href);
  const sidebarPageId = locationUrl.searchParams.get("p")?.trim();

  if (sidebarPageId) {
    return `${locationUrl.origin}/${sidebarPageId}`;
  }

  locationUrl.search = "";
  locationUrl.hash = "";
  return `${locationUrl.origin}${locationUrl.pathname}`;
};
```

- [ ] **Step 2: Use the helper in Markdown link creation**

Replace:

```ts
const buildMarkdownLink = (): string => {
  const title = normalizeMarkdownTitle(
    document.querySelector(titleSelector)?.textContent?.trim() ?? "",
  );
  const locationUrl = new URL(window.location.href);
  locationUrl.search = "";
  locationUrl.hash = "";
  return `[${title}](${locationUrl.origin}${locationUrl.pathname})`;
};
```

with:

```ts
const buildMarkdownLink = (): string => {
  const title = buildTitleCopyText();
  return `[${title}](${buildStandalonePageUrl()})`;
};
```

- [ ] **Step 3: Run the focused test and verify it passes**

Run:

```bash
vp test tests/title-copy-hover.spec.ts
```

Expected result:

```text
PASS tests/title-copy-hover.spec.ts
```

- [ ] **Step 4: Commit the implementation**

Run:

```bash
git add lib/notion/title-copy-hover.ts tests/title-copy-hover.spec.ts
git commit -m "fix: Notion サイドパネルのタイトルリンクコピーに対応する"
```

## Task 4: Simplify And Verify

**Files:**
- Modify if needed: `lib/notion/title-copy-hover.ts`
- Modify if needed: `tests/title-copy-hover.spec.ts`

- [ ] **Step 1: Apply the `code-simplifier` skill**

Review the edited code for unnecessary branching or duplicate helper setup. Keep the implementation small:

```ts
const findTitle = (): HTMLHeadingElement | null => {
  const sidebarTitle = [...document.querySelectorAll<HTMLHeadingElement>(sidebarTitleSelector)]
    .find(isVisibleElement);

  if (sidebarTitle) {
    return sidebarTitle;
  }

  const pageTitle = document.querySelector<HTMLHeadingElement>(pageTitleSelector);
  return pageTitle?.tagName === "H1" ? pageTitle : null;
};
```

Do not add fallback paths beyond the approved `p` parameter behavior and existing normal URL behavior.

- [ ] **Step 2: Run focused tests**

Run:

```bash
vp test tests/title-copy-hover.spec.ts
```

Expected result:

```text
PASS tests/title-copy-hover.spec.ts
```

- [ ] **Step 3: Run the full project check**

Run:

```bash
vp check
```

Expected result:

```text
All checks pass
```

The exact command output may include separate format, lint, test, and type-test sections. Treat any non-zero exit as a failure to investigate before handoff.

- [ ] **Step 4: Commit simplification changes if Step 1 changed files**

If `git status --short` shows changes after simplification, commit them:

```bash
git add lib/notion/title-copy-hover.ts tests/title-copy-hover.spec.ts
git commit -m "refactor: タイトルリンクコピー処理を簡潔に保つ"
```

If Step 1 made no file changes, skip this commit.
