---
trigger: always_on
---

# RULE: git — Git Workflow, Mandatory Post-Task Commit & Zero-Push Policy

## Core Mandate — ALWAYS ON
This rule is ALWAYS ACTIVE for every task, every file, every code change — no exceptions.
Whenever the agent makes any modifications, additions, or deletions in the workspace, immediately after finishing and verifying the work, the agent **MUST** commit the changes locally using `git commit`.
Executing `git push` under ANY circumstances is **STRICTLY AND CATEGORICALLY FORBIDDEN**. **ONLY `git commit` is permitted.**

---

## ABSOLUTE PROHIBITIONS

### 1. ZERO GIT PUSH — NEVER NEGOTIABLE
- Running `git push`, `git push origin`, `git push --force`, `git push -u`, `git push --all`, `git push --tags`, or any command or script that pushes code to a remote repository is **ABSOLUTELY FORBIDDEN**.
- Initiating any automated pipeline, webhook, or external tool designed to push commits to remote is **STRICTLY PROHIBITED**.
- Pushing to remote repositories is the **exclusive right and responsibility of the human developer/user**. The agent must NEVER attempt, initiate, or execute a remote push.
- Reason: Pushing unverified or unreviewed code directly to remote branches risks corrupting upstream branches, breaking production builds, triggering unintended CI/CD deployments, and violating team workflow protocols.

### 2. ZERO UNCOMMITTED WORK UPON TASK COMPLETION
- Leaving modified, unstaged, or untracked workspace files uncommitted after declaring a task completed is **STRICTLY FORBIDDEN**.
- Once all file changes, scratch script cleanups, and task verifications are complete, the agent MUST create a clean git commit before concluding its response.
- Leaving a dirty git working tree after completing a task is a compliance failure.

---

## Mandatory Post-Task Commit Protocol

Whenever any workspace changes are made during a task:

### Step 1: Pre-Commit Hygiene & Verification
1. Ensure all temporary scratch files, debug scripts, or test logs have been safely cleaned up.
2. Run mandatory validation gates:
   - `npm run typecheck` MUST pass with zero errors.
   - `npm run lint` MUST pass with zero warnings/errors.
3. Inspect changes using `git status` to verify that only intended files are included.

### Step 2: Staging & Conventional Commit
1. Stage all task-related changes:
   ```bash
   git add <files>
   ```
2. Create a clear, descriptive commit using the **Conventional Commits** specification:
   ```bash
   git commit -m "<type>(<scope>): <clear concise description>"
   ```
   Allowed types:
   - `feat`: New feature or capability
   - `fix`: Bug fix, security fix, or patch
   - `refactor`: Code restructuring without behavioral/visual change
   - `chore`: Maintenance, rules, dependencies, config updates
   - `docs`: Documentation or markdown updates
   - `test`: Unit or format tests
   - `style`: Formatting, CSS, or UI token updates

### Step 3: Inform the User & Conclude (NEVER PUSH)
1. Report the created commit message and hash to the user in your final response.
2. Explicitly remind the user that changes are committed locally on their current branch and ready for their manual review and push.
3. **STOP HERE. Do NOT run `git push`.**

---

## Enforcement Checklist
Before finishing ANY task that modified workspace files:
- [ ] All code changes, fixes, or additions verified (`npm run typecheck` passes)
- [ ] All temporary/scratch files cleaned up
- [ ] `git status` inspected to verify staged files
- [ ] `git commit` executed with a descriptive Conventional Commit message
- [ ] ZERO `git push` commands executed or scheduled
- [ ] Commit details reported clearly to the user
