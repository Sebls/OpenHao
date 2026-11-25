---
name: commit-and-pr
description: Commit the current changes on a separate branch from main, push it, and open a GitHub pull request with a concise Commitizen title and Objective, Implementation, and Validation sections. Use when the user asks to commit changes and open a PR.
---

# Commit and open a PR

Complete the workflow without routine confirmation when the user invokes this skill or requests it. Creating this skill alone does not authorize running the workflow.

1. Read repository instructions and inspect the current changes, branch, and remote. Include the requested changes; preserve unrelated work and exclude secrets and generated clutter.
2. Use a dedicated `antigravity/<short-description>` branch targeting `main`. Reuse the current branch if it already serves this work; otherwise create one safely. Preserve the current changes and any relevant existing commits without resetting or discarding work. Ensure the PR diff contains only the intended work.
3. Run the repository's required checks and checks appropriate to the changes. Reuse reliable existing validation when still applicable, clearly distinguishing it from newly run checks. Resolve failures caused by these changes when feasible; report unresolved failures honestly.
4. Commit in appropriately focused commits using Commitizen-style messages: `type(scope): short description`. Push the branch and open a PR against `main`, or update its existing PR. Never merge or force-push as part of this workflow.
5. Use a concise Commitizen-style PR title. Write the description in English with the template below, scaling detail to the change. Describe the final result, omit conversational history, and report only checks actually performed. Include relevant failed, skipped, or unverified checks and limitations. When using `gh`, supply the description through `--body-file` to preserve formatting.

```markdown
## Objective
Explain the problem and resulting benefit in one or two sentences.

## Implementation
- Summarize the meaningful changes.

## Validation
- State the checks performed and their results, plus relevant limitations.
```

Finish with the PR link, branch name, and a brief validation result. If authentication, permissions, or another blocker prevents completion, preserve completed work and explain what remains.
