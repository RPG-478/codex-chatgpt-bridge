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

## 現在の機能

| 機能 | 現在の状態 |
| --- | --- |
| 手動プロンプトパケット workflow | 実装済み |
| Playwright ChatGPT Web 委任 | 実装済み |
| 明示的なモデル選択 | リクエスト前後に Web メニューで検証 |
| バックグラウンドブラウザ実行 | Chrome をデフォルトで最小化、headless mode は任意 |
| 専用 ChatGPT Project の指定 | URL 指定を実装済み、名前指定は fallback |
| ChatGPT Project instructions テンプレート | 実装済み |
| 構造化レスポンス検証 | 実装済み |
| ローカル `doctor` チェック | 実装済み |
| 任意の Playwright `doctor` 到達性チェック | 実装済み |
| stdio MCP wrapper | 委任と Project instructions 用に実装済み |

## 現在の制限

- ChatGPT Web 自動化は現在の Web UI に依存するため、このプロジェクトのコード変更なしに壊れる可能性があります。
- Project 指定は Playwright 委任前と `doctor --adapter playwright` で検証しますが、送信後に独立して確認する Project 所属 smoke test はまだありません。
- ChatGPT のレスポンス schema が無効な場合、現状は即失敗します。自動 repair retry は未実装です。
- context packet の自動 redaction はまだありません。委任する文脈は小さく保ち、secret は手動で除外してください。
- Chrome extension adapter はまだありません。自動ブラウザ adapter は Playwright のみです。
- モデル選択は Web メニューに依存し、画面に表示される正確なモデル名を指定する必要があります。モデル名と選択肢はアカウントや UI locale によって異なります。確認するのは UI 上の選択であり、バックエンドのモデル識別情報ではありません。
- headless mode は ChatGPT の検証画面に阻止される場合があります。最小化した Chrome は Windows で検証済みですが、ほかの platform や browser channel は未検証です。

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

bridge 専用のブラウザプロファイルを使います。ログイン時は常にブラウザウィンドウが表示されるため、必要に応じてサインインや検証を手動で完了してください。

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

### モデルを選択する

ChatGPT のモデルメニューに表示される正確な名前を指定します。

```powershell
node .\dist\cli.js ask --adapter playwright --model "GPT-5.6 Sol" --question "Summarize the main tradeoffs in this design."
```

bridge は送信前とレスポンス受信後に選択中のモデルを確認します。指定したモデルを利用できない場合や確認できない場合は失敗し、別のモデルへ自動的に切り替えることはありません。`Auto` には対応していません。

`--model Latest` を使うと、ChatGPT の最新モデルオプションを選択できます。これは固定のモデルバージョンではなく、動的なラベルです。結果には要求したメニュー項目（`model: Latest`）と、その実行時に表示されていたラベル（例: `model_display: 6 Pro`）の両方が記録されます。送信前後で表示ラベルが同一であることも確認しますが、バックエンドのモデルを独立して識別するものではありません。

Power control を持つモデルでは、Power を低い順に1から数えた値で `--power` に指定します。段階数とラベルはアカウントや UI locale によって異なるため、現在の control に存在する値を指定してください。英語UIが5段階を表示する場合の対応は次のとおりです。

| 値 | Level |
| --- | --- |
| 1 | Instant |
| 2 | Medium |
| 3 | High |
| 4 | Extra High |
| 5 | Pro |

```powershell
node .\dist\cli.js ask --adapter playwright --model "GPT-5.6 Sol" --power 3 --question "Review this plan."
```

bridge は送信前後に Power control の値と説明を確認します。指定した level を利用できない場合や UI の状態が矛盾する場合は `POWER_UNVERIFIABLE` で失敗します。`--power` には明示的な `--model` が必要です。Power を省略すると現在の設定を維持します。利用できるラベルや level は、アカウントや Web UI の変更によって変わる可能性があります。level を選ぶと、専用プロファイルの現在の Power 設定も変わります。

`--model` を省略した場合は、ブラウザの現在の選択を未検証のまま使用します。利用できるモデル名は、アカウントと現在の ChatGPT UI に依存します。

### ブラウザウィンドウのオプション

Playwright は専用プロファイルを使い、デフォルトでは通常の Chrome を最小化して実行します。ウィンドウ用のフラグは不要です。同じプロファイルに対して複数のコマンドを同時に実行しないでください。

| `ask` のオプション | 動作 |
| --- | --- |
| ウィンドウオプションなし | 通常の Chrome を最小化して実行 |
| `--minimized false` | ブラウザウィンドウを表示 |
| `--headless true` | ウィンドウなしの実験的な実行 |

`--minimized true` と `--headless true` は併用できません。ログイン時は常にブラウザウィンドウを表示します。起動時やサイトが操作を要求した場合、一時的に最小化前のウィンドウが見えることがあります。

ChatGPT が検証を要求した場合は、ウィンドウを表示するか `login` を実行して手動で完了してください。bridge は検証画面、HTTP error、rate limit を検出すると停止し、mode の自動切り替えや回避は行いません。

レスポンスの timeout や送信後のモデル検証失敗は、リクエスト自体がすでに実行されたことを意味する場合があります。再試行する前に対象チャットを確認してください。部分的なレスポンスを完了済みとして返すことはありません。

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

Playwright adapter では、`chatgpt_delegate` に次の任意 field も指定できます。

| Field | Default | 用途 |
| --- | --- | --- |
| `model` | ブラウザの選択、未検証 | 選択・検証する Web メニュー上の正確なモデル名 |
| `power` | 現在の設定を維持 | 1〜5の整数、明示的な `model` が必要 |
| `headless` | `false` | ウィンドウなしの実験的な実行を要求 |
| `minimized` | headless でなければ `true` | `false` でブラウザウィンドウを表示 |

これらのブラウザオプションには `adapter: "playwright"` が必要です。デフォルトは引き続き manual adapter です。

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

テストにはローカルのモデルメニュー fixture が含まれ、Chrome が必要です。Edge を使う場合は `CGPT_BROWSER_CHANNEL=msedge` を指定してください。テストは ChatGPT へのログインやプロンプト送信を行いません。

## ロードマップ

- より安定した DOM 統合のための Chrome extension adapter。
- Playwright 委任ごとの送信後 Project 所属 smoke test。
- スキーマ失敗時の repair prompt によるリトライ。
- context packet 用の redaction helper。
