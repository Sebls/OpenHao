---
name: plan-commits
description: Propose small, modular commits for current repository changes, with Commitizen-style messages and an exact file list per commit. Use when the user asks to split changes into focused commits or plan commit messages; proposing a plan does not authorize staging or committing.
---

# Plan commits

Review the current repository changes and propose an ordered commit plan. Each commit should have one clearly defined purpose and a Commitizen-style message. Keep the skill independent of any particular repository or technology.

## Inspect the actual changes

- Read applicable repository instructions and existing commit conventions, including Commitizen or commitlint configuration when present.
- Inspect `git status --short`, staged and unstaged diffs, and recent commit subjects. Inspect the contents of relevant untracked files too; diff statistics alone are insufficient to infer their purpose.
- Include staged, unstaged, deleted, renamed, and relevant untracked files in the review. Preserve the distinction between staged and unstaged portions when it affects the proposal.
- If the working tree is clean, say there are no current changes to split. Do not invent commits or switch to reviewing historical commits unless requested.

## Define small, coherent commits

- Prefer several narrowly scoped commits over a broad commit covering unrelated changes. Split by independently explainable behavior, fix, component, or documentation purpose, rather than grouping everything by file extension or top-level folder.
- Include directly related tests, types, and required configuration with the behavior they support when separating them would leave an incoherent intermediate state. Keep dependency manifests and their corresponding lockfile changes together.
- Do not impose a fixed file count. Several files may belong to one small change; one file may contain several unrelated changes.
- When a file spans multiple proposed commits, identify the exact functions, sections, or changes assigned to each commit and mark it as **partial file**. Avoid overlapping assignments. If the current edits cannot be separated cleanly, explain the required preparatory split instead of claiming whole-file staging will work.
- Order commits by dependency so intermediate states remain coherent and can build or pass relevant checks where practical. Name dependencies explicitly. Do not claim these states were tested unless they actually were.
- Account for every changed file. Clearly identify intentionally excluded generated output, local-only files, or unrelated changes and explain why they are omitted. Flag suspected credentials without reproducing their contents.

## Write Commitizen-style messages

Use the repository's configured convention. Otherwise use Conventional Commits syntax commonly used by Commitizen:

```text
type(scope): imperative summary
```

- Use a concrete scope matching the commit's single purpose; avoid vague scopes such as `misc` or `changes`.
- Choose an appropriate type, normally `feat`, `fix`, `refactor`, `docs`, `test`, `style`, `perf`, `build`, `ci`, or `chore`. Use `style` for formatting changes that do not affect behavior, rather than as a catchall for interface changes.
- Keep the summary concise and specific. Use `!` and a `BREAKING CHANGE:` footer only for an actual breaking change, following repository conventions.
- Do not invent issue numbers or infer breaking changes without evidence. Add a body or footer only when it conveys necessary context.

## Present the proposal

Start with the number of proposed commits and a short explanation of the grouping. Then use an ordered list. For each commit provide:

1. The exact suggested message in a code span or code block.
2. One sentence defining its purpose.
3. The exact repository-relative paths to include, with additions, deletions, renames, or partial-file assignments identified when useful.
4. Any dependency or practical split limitation, only when relevant.

Finish with excluded files or unresolved grouping issues, if any. Keep the output concrete and reviewable; do not add alternative plans unless requested.

This workflow proposes commits only. Do not modify files, stage changes, create commits, or alter branches unless the user separately requests execution. If execution is requested later, refresh the status and diffs before acting on the plan.
