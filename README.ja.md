# codex-chatgpt-bridge

[![Status](https://img.shields.io/badge/status-alpha-orange)](#ステータス)
[![License](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D22-339933)](./package.json)
[![Adapter](https://img.shields.io/badge/adapter-Playwright-2EAD33)](#アダプタ)

**Languages:** [English](./README.md) | 日本語

Codex が ChatGPT Web に小さな相談タスクを委任するための、ローカル実験 bridge です。

Codex は実行役。ChatGPT は相談役。この bridge は、両者の間で小さな構造化パケットだけを受け渡します。

```text
Codex -> cgpt CLI -> local browser bridge -> ChatGPT Project -> structured response -> Codex
```

## ステータス

これは実験的な非公式 alpha ツールです。

OpenAI による公式・承認・サポート済みのツールではありません。ChatGPT Web の UI 変更で壊れる可能性があります。ローカルでの実験用途として扱ってください。

## 重要な安全上の注意

このプロジェクトは、ログイン済みブラウザセッションを通じて ChatGPT Web を自動操作します。利用や派生物の公開前に、自分の ChatGPT アカウントと用途に適用される規約を確認してください。OpenAI の規約には、Output の自動的またはプログラム的な抽出に関する制限が含まれます。

このツールは、スクレイピング、大量抽出、データセット生成、アカウント共有、API 利用制限の回避を目的としたものではありません。

推奨ガードレール:

| 項目 | 推奨 |
| --- | --- |
| 利用範囲 | ローカル、低頻度、ユーザー起点の実行に留める。 |
| 秘密情報 | シークレット、トークン、認証情報、private log、個人情報を委任しない。 |
| セッションデータ | ブラウザのログイン状態は、デフォルトでリポジトリ外のホームディレクトリ配下に保存される。 |
| デバッグ | `debug-*` コマンドはページ内容を出力し得るため `--unsafe-debug` が必要。 |
| 検証 | ChatGPT 出力は助言として扱い、Codex が編集や実行前に必ず検証する。 |

## なぜ作るのか

Codex はローカルマシン上での実行に強いです。ファイルを読み、編集し、コマンドを実行し、結果を検証できます。一方で ChatGPT は、計画、調査、批評、要約の相談役として役立つことがあります。この bridge はその中間を狙います。Codex が小さな委任パケットを ChatGPT に送り、短い構造化結果だけを読み戻します。

目的は、ChatGPT にマシン操作権限を渡さずに、Codex のコンテキスト消費を抑えつつ小さなセカンドオピニオンを得ることです。

## 機能

| 機能 | 現在の状態 |
| --- | --- |
| 手動委任 | 実装済み |
| Playwright ChatGPT Web アダプタ | 実装済み |
| 専用 ChatGPT Project の指定 | 実装済み |
| Project instructions テンプレート | 実装済み |
| 構造化レスポンス検証 | 実装済み |
| MCP server wrapper | 実装済み |
| ローカル doctor チェック | 実装済み |
| Chrome extension adapter | 予定 |

## インストール

```powershell
npm install
npm run build
```

必要なもの:

- Node.js 22+
- Chrome または Edge
- ローカルでログインできる ChatGPT アカウント

## 初回ログイン

bridge 専用のブラウザプロファイルを使います。

```powershell
node .\dist\cli.js login --channel chrome
```

Chrome がない場合:

```powershell
node .\dist\cli.js login --channel msedge
```

ブラウザプロファイルはデフォルトでリポジトリ外に保存されます。

```text
~/.codex-chatgpt-bridge/browser-profile
```

必要なら保存先を上書きできます。

```powershell
$env:CGPT_BROWSER_PROFILE_DIR="C:\path\to\profile"
```

## 推奨: ChatGPT Project を使う

`Codex Bridge` のような専用 ChatGPT Project を作成します。

Project URL を保存します。

```powershell
node .\dist\cli.js project-set --url "https://chatgpt.com/g/g-p-.../project"
```

またはサイドバー上の Project 名で指定できます。

```powershell
node .\dist\cli.js project-set --name "Codex Bridge"
```

Project instructions を生成します。

```powershell
node .\dist\cli.js project-instructions
```

`.cgpt/project-instructions.md` の内容を ChatGPT Project の instructions に貼り付けてください。これにより、ChatGPT は受け取るメッセージが人間本人ではなく Codex から委任された可能性を理解します。

## 使い方

Playwright アダプタで質問します。

```powershell
node .\dist\cli.js ask --adapter playwright --mode review --question "List the top 3 risks in this bridge design."
```

コマンドごとに Project を指定できます。

```powershell
node .\dist\cli.js ask --adapter playwright --project-name "Codex Bridge" --mode plan --question "What should be built next?"
```

手動プロンプトパケットを作成します。

```powershell
node .\dist\cli.js ask --adapter manual --mode research --question "What is the smallest useful architecture?"
```

手動レスポンスを保存します。

```powershell
node .\dist\cli.js save --job <job-id> --from-file .\answer.md
```

レスポンスを読みます。

```powershell
node .\dist\cli.js show --job <job-id>
```

## Doctor

ChatGPT にプロンプトを送信せず、ローカル状態だけを確認します。

```powershell
node .\dist\cli.js doctor
```

ブラウザログインと Project 到達性も確認します。

```powershell
node .\dist\cli.js doctor --adapter playwright
```

Playwright doctor は設定済みブラウザプロファイルで ChatGPT を開き、プロンプトエディタに到達できることと、Project が設定されている場合はその到達性を確認します。委任プロンプトは送信しません。

## モード

| Mode | 用途 |
| --- | --- |
| `ask` | 小さな一般質問 |
| `research` | 外部調査や探索的調査の要約 |
| `review` | 設計やリスクの批評 |
| `debug` | エラーや失敗原因の分析 |
| `plan` | 実装計画 |
| `summarize` | 長い文脈の圧縮 |

## レスポンス契約

ChatGPT の返答は保存前に検証されます。

```markdown
verdict: proceed | revise | blocked

summary:
- concise bullet

risks:
- material risk only

sources:
- optional URL

next_action: one concrete sentence
```

有効な `verdict` と少なくとも 1 つの `summary` item がない場合、CLI は曖昧な結果を保存せず失敗します。

## アダプタ

| Adapter | Command | Notes |
| --- | --- | --- |
| Manual | `--adapter manual` | コピー&ペースト用のプロンプトファイルを生成する。 |
| Playwright | `--adapter playwright` | 永続ローカルブラウザプロファイルで ChatGPT Web を開く。 |

## MCP Server

ビルド後、stdio MCP server として起動できます。

```powershell
npm run build
node .\dist\mcp.js
```

公開する tool:

| Tool | 用途 |
| --- | --- |
| `chatgpt_delegate` | 手動プロンプトパケット作成、または Playwright 経由の直接委任。 |
| `chatgpt_project_instructions` | 推奨 ChatGPT Project instructions を返す。 |

## デバッグ

デバッグコマンドは、アカウント名、チャットタイトル、Project 名、ページ内容を出力する可能性があります。そのため明示フラグが必要です。

```powershell
node .\dist\cli.js debug-page --unsafe-debug
node .\dist\cli.js debug-submit --unsafe-debug --text "hello"
```

private なローカル環境でのみ使用してください。

現在使っているブラウザプロファイルパスを表示できます。

```powershell
node .\dist\cli.js profile-path
```

ChatGPT のログインが消えたように見える場合は、まず `cgpt`、`cgpt-mcp`、手動で開いたブラウザが同じプロファイルディレクトリを使っているか確認してください。デフォルトは以下です。

```text
~/.codex-chatgpt-bridge/browser-profile
```

## Codex Skill

同梱 Skill は以下にあります。

```text
skills/chatgpt-delegate/SKILL.md
```

この Skill は、Codex がいつ委任するか、どう文脈を小さく保つか、ChatGPT 出力を非権威的な助言としてどう扱うかを定義します。

## ローカル状態

| Path | Purpose | Git status |
| --- | --- | --- |
| `.cgpt/jobs/` | ローカルプロンプトパケット | ignored |
| `.cgpt/responses/` | ローカルレスポンスファイル | ignored |
| `.cgpt/config.json` | Project URL/name | ignored |
| `~/.codex-chatgpt-bridge/browser-profile` | ブラウザログインプロファイル | repo 外 |

## 開発

```powershell
npm run check
npm test
```

## ロードマップ

- より安定した DOM 統合のための Chrome extension adapter。
- 各委任後の Project 所属 smoke test。
- スキーマ失敗時の repair prompt によるリトライ。
- context packet 用の redaction helper。
