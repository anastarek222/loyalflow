---
name: loyalflow-git-workflow
description: Trigger for Git operations, commit planning, and repository management. Automatically activates when planning commits, reviewing diffs, or managing branches.
---
## LoyalFlow Git Workflow Skill

### Key Responsibilities
- Plan atomic commits (feature scope, bug fix)
- Review diffs before commit
- Suggest conventional commit messages
- Prevent dangerous operations (force push, big commits)
- Maintain branch naming convention (feature/bugfix-*, chore/docs, etc.)
- Protect main branch integrity

### Trigger Scenarios

This skill activates when:
- Running `git status` or `git diff`
- Preparing to commit changes
- Creating new branches
- Merging branches
- Resolving conflicts
- Force pushing or rewriting history
