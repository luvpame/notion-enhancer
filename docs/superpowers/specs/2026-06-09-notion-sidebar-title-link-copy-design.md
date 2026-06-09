# Notion Sidebar Title Link Copy Design

## Goal

Notion のサイドパネルでページを開いたときも、既存のタイトル hover UI からタイトルコピーと Markdown リンクコピーを使えるようにする。

Markdown リンクはサイドパネル状態の URL ではなく、対象ページ単体の URL にする。

## Current Behavior

- タイトル hover UI は `lib/notion/title-copy-hover.ts` に実装されている。
- 現在のタイトル検出は `main h1:first-of-type, .notion-page-block:first-child h1:first-of-type` に依存している。
- サイドパネルで開いたページでは、この検出に失敗して hover UI が表示されない。
- Markdown リンクは現在の `window.location.href` から query/hash を削除して生成している。
- サイドパネル表示時の URL には `p={pageId}` のような query parameter が付くため、現在の生成方式では対象ページ単体のリンクにならない。

## Design

変更対象は `lib/notion/title-copy-hover.ts` と、そのテストである `tests/title-copy-hover.spec.ts` に限定する。

既存の hover UI、ボタン、設定、clipboard の状態遷移は変更しない。タイトル検出と Markdown リンク生成だけを拡張する。

### Title Detection

タイトル候補の探索をサイドパネル内の H1 まで広げる。

複数の H1 が存在する場合は、見えているサイドパネル内のタイトルを優先する。サイドパネル内タイトルが見つからない場合は、既存の通常ページタイトル検出を使う。

この変更により、通常ページでの挙動を維持しつつ、サイドパネル表示でも同じ hover UI を表示できるようにする。

### Standalone Page URL

Markdown リンク生成時に `window.location.href` の query parameter `p` を確認する。

- `p` がある場合: `https://www.notion.so/{p}` をコピー対象 URL にする。
- `p` がない場合: これまで通り query/hash を削除した `origin + pathname` を使う。

`p` の値は Notion のページ ID として扱い、追加の DOM 探索やブラウザ権限は導入しない。

### Error Handling

clipboard 書き込み失敗時の挙動は既存通りにする。

- コピー開始時は `copying`
- 成功時は `success`
- 失敗時は `error`
- 一定時間後に `idle` へ戻す

タイトルが見つからない場合は hover UI を表示しない。既存の install/refresh の挙動を維持する。

## Testing

`tests/title-copy-hover.spec.ts` に次を追加または更新する。

- 通常ページ URL では、query/hash を除去した既存の Markdown リンクがコピーされる。
- `?p={pageId}` がある URL では、Markdown リンクが `https://www.notion.so/{pageId}` になる。
- サイドパネルを模した DOM 内の H1 でも hover UI が表示される。
- サイドパネル内タイトルがある場合、そのタイトルがタイトルコピーと Markdown リンクの表示名に使われる。

検証は実装後に `vp test` と `vp check` で行う。

## Out Of Scope

- 新しい popup 設定の追加
- content script の match pattern 追加
- Notion DOM から canonical URL を探索する仕組み
- browser-specific な分岐
- storage schema の変更
