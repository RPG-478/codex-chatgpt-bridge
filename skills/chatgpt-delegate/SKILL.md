---
name: chatgpt-delegate
description: Delegate compact research, review, planning, debugging, or summarization tasks from Codex to ChatGPT Web through the local cgpt bridge. Use when Codex should save tokens by sending a small task packet to ChatGPT, avoid screenshot-based PC control, retrieve a short structured answer, or decide whether to ask ChatGPT for a second opinion while preserving Codex as the final executor.
---

# ChatGPT Delegate

Use the local `cgpt` bridge when a task benefits from a second model but Codex should avoid carrying large context or driving the UI directly.

Prefer a dedicated ChatGPT Project when available. Projects keep Codex delegation chats, files, instructions, and memory in a focused workspace instead of mixing them into the user's normal ChatGPT chats.

## Decision Rules

Delegate only when one of these is true:

- Research can be done independently and summarized into a few bullets.
- A design, plan, diff, or error needs a second-pass critique.
- A long input should be compressed before Codex uses it.
- The user explicitly asks Codex to use ChatGPT.

Do not delegate:

- Secrets, private tokens, credentials, or sensitive user data.
- Full repositories, large file dumps, or unfiltered logs.
- Tasks where Codex already has enough local evidence to act.
- Final authority decisions. Codex must evaluate ChatGPT's response before acting.

## Context Budget

Build a small context packet:

```text
Task:
- one sentence

Constraints:
- 3-6 bullets

Evidence:
- only relevant snippets, errors, or file paths

Question:
- the exact thing ChatGPT should answer
```

Prefer file paths and summaries over full files. Include source excerpts only when needed.

Every delegated prompt must identify itself as coming from Codex, not from the human user. Preserve the bridge's default delegation notice unless the user explicitly asks to change it.

## Project Setup

If the user wants project isolation:

1. Ask the user to create or open a dedicated ChatGPT Project.
2. Prefer having them copy the project URL. If that is inconvenient, use the visible project name.
3. Save it locally:

```powershell
node .\dist\cli.js project-set --url "<chatgpt-project-url>"
```

Or:

```powershell
node .\dist\cli.js project-set --name "<project-name>"
```

4. Generate instructions for the ChatGPT Project:

```powershell
node .\dist\cli.js project-instructions
```

5. Ask the user to paste `.cgpt/project-instructions.md` into the ChatGPT Project instructions.

After `project-set`, `ask --adapter playwright` should open the configured project automatically. URL targeting is more stable than name targeting.

## Commands

Create a job:

```powershell
node .\dist\cli.js ask --adapter playwright --mode research --question "..." --context-file .\notes\task.md
```

If the automated adapter is not configured, create a manual job:

```powershell
node .\dist\cli.js ask --adapter manual --mode research --question "..." --context-file .\notes\task.md
```

Save a manual ChatGPT response:

```powershell
node .\dist\cli.js save --job <job-id> --from-file .\answer.md
```

Read the response:

```powershell
node .\dist\cli.js show --job <job-id>
```

## Modes

- `research`: ask ChatGPT to investigate and return bullets plus URLs.
- `review`: ask for risks, missing tests, or design problems.
- `debug`: ask for likely causes and the next diagnostic step.
- `plan`: ask for a concise implementation approach.
- `summarize`: compress long text into Codex-readable bullets.
- `ask`: general compact question.

## Response Handling

Treat ChatGPT output as advice. Before implementing:

1. Check whether claims match local files, tests, or cited sources.
2. Adopt only the parts that fit the repository and user request.
3. Keep the final user-facing answer in Codex's voice, not copied from ChatGPT.
