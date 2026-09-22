# codex-chatgpt-bridge

[![Status](https://img.shields.io/badge/status-alpha-orange)](#status)
[![License](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D22-339933)](./package.json)
[![Adapter](https://img.shields.io/badge/adapter-Playwright-2EAD33)](#adapters)

**Languages:** English | [Japanese](./README.ja.md)

A local experimental bridge that lets Codex ask ChatGPT Web for compact second opinions.

Codex stays the executor. ChatGPT stays the advisor. The bridge only moves small structured delegation packets between them.

```text
Codex -> cgpt CLI -> local browser bridge -> ChatGPT Project -> structured response -> Codex
```

## Status

This is an experimental, unofficial alpha tool.

It is not affiliated with, endorsed by, or supported by OpenAI. ChatGPT Web automation can break when the web UI changes. Use it for local experimentation only.

## Important Safety Notice

This project automates ChatGPT Web through a logged-in browser session. Before using or publishing derivatives, review the terms that apply to your ChatGPT account and use case. OpenAI's terms include restrictions around automated or programmatic extraction of Output.

This tool is not intended for scraping, bulk extraction, dataset generation, account sharing, or bypassing API access.

Recommended guardrails:

| Area | Recommendation |
| --- | --- |
| Usage | Keep this local, low-volume, and user-initiated. |
| Secrets | Do not delegate secrets, tokens, credentials, private logs, or sensitive personal data. |
| Session data | Browser login state is stored outside the repo by default under the user's home directory. |
| Debugging | Debug commands require `--unsafe-debug` because they can expose page text. |
| Verification | Treat ChatGPT output as advice. Codex must verify before editing files or running actions. |

## Why

Codex is strong at acting on the local machine: reading files, editing, running commands, and verifying changes. ChatGPT is often useful as a thinking partner for planning, research, critique, and summarization. This bridge explores a middle path: Codex sends a small delegation packet to ChatGPT and only reads back a short structured result.

The goal is to reduce Codex context usage for compact second opinions without giving ChatGPT control over your machine.

## Current Capabilities

| Capability | Current state |
| --- | --- |
| Manual prompt-packet workflow | Implemented |
| Playwright ChatGPT Web delegation | Implemented |
| Explicit model selection | Verified against the web menu before and after a request |
| Background browser operation | Minimized Chrome by default; optional headless mode |
| Dedicated ChatGPT Project targeting | Implemented by URL, with name fallback |
| ChatGPT Project instructions template | Implemented |
| Structured response validation | Implemented |
| Local `doctor` checks | Implemented |
| Optional Playwright `doctor` reachability check | Implemented |
| stdio MCP wrapper | Implemented for delegation and project instructions |

## Current Limitations

- ChatGPT Web automation depends on the current web UI and can break without a code change in this project.
- Project targeting is verified before Playwright delegation and by `doctor --adapter playwright`, but there is not yet a separate post-submit Project membership smoke test.
- Invalid ChatGPT response schemas currently fail fast; automatic repair retry is not implemented yet.
- Context packets are not automatically redacted yet. Keep delegated context small and exclude secrets manually.
- There is no Chrome extension adapter yet; Playwright is the only automated browser adapter.
- Model selection depends on the web menu and requires the exact visible model label. Labels and available options vary by account and UI locale. It verifies the UI selection, not the backend model identity.
- Headless mode may be blocked by ChatGPT verification. Minimized Chrome has been tested on Windows; other platforms and browser channels may behave differently.

## Install

```powershell
npm install
npm run build
```

Requirements:

- Node.js 22+
- Chrome or Edge
- A ChatGPT account you can log into locally

## First Login

Use a dedicated browser profile for the bridge. Login always opens a visible window; complete any sign-in or verification manually:

```powershell
node .\dist\cli.js login --channel chrome
```

If Chrome is not installed:

```powershell
node .\dist\cli.js login --channel msedge
```

The browser profile is stored outside the repository by default:

```text
~/.codex-chatgpt-bridge/browser-profile
```

Override it if needed:

```powershell
$env:CGPT_BROWSER_PROFILE_DIR="C:\path\to\profile"
```

## Recommended: Use a ChatGPT Project

Create a dedicated ChatGPT Project, for example `Codex Bridge`.

Save the project URL:

```powershell
node .\dist\cli.js project-set --url "https://chatgpt.com/g/g-p-.../project"
```

Or target the project by sidebar name:

```powershell
node .\dist\cli.js project-set --name "Codex Bridge"
```

Generate project instructions:

```powershell
node .\dist\cli.js project-instructions
```

Paste `.cgpt/project-instructions.md` into the ChatGPT Project instructions. This tells ChatGPT that incoming messages may be delegated by Codex rather than typed by the human user.

## Usage

Ask through the Playwright adapter:

```powershell
node .\dist\cli.js ask --adapter playwright --mode review --question "List the top 3 risks in this bridge design."
```

Use a one-off project target:

```powershell
node .\dist\cli.js ask --adapter playwright --project-name "Codex Bridge" --mode plan --question "What should be built next?"
```

Create a manual prompt packet:

```powershell
node .\dist\cli.js ask --adapter manual --mode research --question "What is the smallest useful architecture?"
```

Save a manual response:

```powershell
node .\dist\cli.js save --job <job-id> --from-file .\answer.md
```

Read a response:

```powershell
node .\dist\cli.js show --job <job-id>
```

### Select a model

Use the exact label shown in ChatGPT's model menu:

```powershell
node .\dist\cli.js ask --adapter playwright --model "GPT-5.6 Sol" --question "Summarize the main tradeoffs in this design."
```

The bridge checks the selected menu item before submitting and again after receiving the response. It fails if the requested model is unavailable or cannot be verified; it never substitutes another model. `Auto` is not supported.

You can use `--model Latest` to select ChatGPT's latest model option. It is a dynamic label, not a fixed model version. The result reports both the requested menu option (`model: Latest`) and the selector's display text (for example, `model_display: 6 Pro`). The display text must remain the same before and after the request. This records the UI state for that run; it does not establish a permanent mapping or independently identify the backend model.

For a model that exposes the Power control, `--power` selects a one-based level from lowest to highest. The number of levels and their labels vary by account and UI locale; the requested level must exist in the current control. A five-level English interface uses:

| Value | Level |
| --- | --- |
| 1 | Instant |
| 2 | Medium |
| 3 | High |
| 4 | Extra High |
| 5 | Pro |

```powershell
node .\dist\cli.js ask --adapter playwright --model "GPT-5.6 Sol" --power 3 --question "Review this plan."
```

The bridge checks the Power control's value and accessible description before and after submission. An unavailable level or inconsistent UI produces `POWER_UNVERIFIABLE`. `--power` requires an explicit `--model`; omit Power to preserve the current setting. Labels and availability can change with the account or web interface. Choosing a level changes the dedicated profile's current Power setting.

Without `--model`, the browser's default selection is used and reported as unverified. Available labels depend on your account and the current ChatGPT interface.

### Browser window options

Playwright runs normal Chrome minimized by default, using the dedicated profile. No window flags are needed. Only run one command at a time against that profile.

| Option for `ask` | Behavior |
| --- | --- |
| No window options | Normal Chrome, minimized |
| `--minimized false` | Visible browser window |
| `--headless true` | Experimental operation without a window |

`--minimized true` and `--headless true` cannot be combined. Login always remains visible. A minimized window can briefly appear during startup or when the site requests interaction.

If ChatGPT requires verification, restore the window or run `login` and complete it manually. The bridge stops on verification pages, HTTP errors and rate limits; it does not automatically switch modes or bypass these checks.

A response timeout or a model-verification failure after submission can mean the request already ran. Check the chat before retrying. Partial responses are not reported as completed.

## Doctor

Run local checks without sending a prompt to ChatGPT:

```powershell
node .\dist\cli.js doctor
```

Run browser and Project reachability checks:

```powershell
node .\dist\cli.js doctor --adapter playwright
```

The Playwright doctor opens ChatGPT with the configured browser profile, verifies that the prompt editor is reachable, and checks the configured Project target when one is set. It does not submit a delegation prompt.

## Modes

| Mode | Use for |
| --- | --- |
| `ask` | Small general questions |
| `research` | External or exploratory research summaries |
| `review` | Design and risk critique |
| `debug` | Error and failure analysis |
| `plan` | Implementation planning |
| `summarize` | Compressing long context |

## Response Contract

ChatGPT responses are validated before they are saved:

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

If the response does not include a valid `verdict` and at least one `summary` item, the CLI fails instead of saving an ambiguous result.

## Adapters

| Adapter | Command | Notes |
| --- | --- | --- |
| Manual | `--adapter manual` | Generates a prompt file for copy/paste. |
| Playwright | `--adapter playwright` | Opens ChatGPT Web using a persistent local browser profile. |

## MCP Server

Build the project and run the stdio MCP server:

```powershell
npm run build
node .\dist\mcp.js
```

The server exposes:

| Tool | Purpose |
| --- | --- |
| `chatgpt_delegate` | Create a manual prompt packet or delegate directly through Playwright. |
| `chatgpt_project_instructions` | Return the recommended ChatGPT Project instructions. |

The Playwright adapter also accepts these optional fields in `chatgpt_delegate`:

| Field | Default | Purpose |
| --- | --- | --- |
| `model` | Browser selection, unverified | Exact web-menu label to select and verify |
| `power` | Current setting, unchanged | Integer 1–5; requires an explicit `model` |
| `headless` | `false` | Request experimental headless operation |
| `minimized` | `true` unless headless | Set `false` for a visible browser |

These browser options require `adapter: "playwright"`. The manual adapter remains the default.

## Debugging

Debug commands can expose account names, chat titles, project names, and page content. They are gated:

```powershell
node .\dist\cli.js debug-page --unsafe-debug
node .\dist\cli.js debug-submit --unsafe-debug --text "hello"
```

Use these only in a private local environment.

Show the active browser profile path:

```powershell
node .\dist\cli.js profile-path
```

If ChatGPT appears to "forget" login, first check that `cgpt`, `cgpt-mcp`, and any manually opened browser window are using the same profile directory. The default is:

```text
~/.codex-chatgpt-bridge/browser-profile
```

## Codex Skill

The included skill lives at:

```text
skills/chatgpt-delegate/SKILL.md
```

It tells Codex when to delegate, how to keep context small, and how to treat ChatGPT output as non-authoritative advice.

## Local State

| Path | Purpose | Git status |
| --- | --- | --- |
| `.cgpt/jobs/` | Local prompt packets | ignored |
| `.cgpt/responses/` | Local response files | ignored |
| `.cgpt/config.json` | Project URL/name | ignored |
| `~/.codex-chatgpt-bridge/browser-profile` | Browser login profile | outside repo |

## Development

```powershell
npm run check
npm test
```

Tests include a local model-menu fixture and require Chrome, or Edge selected through `CGPT_BROWSER_CHANNEL=msedge`. They do not sign in to ChatGPT or send prompts.

## Roadmap

- Chrome extension adapter for more stable DOM integration.
- Post-submit Project membership smoke test after each Playwright delegation.
- Retry-on-schema-failure with a repair prompt.
- Redaction helpers for context packets.
