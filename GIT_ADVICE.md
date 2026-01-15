# Git & Deployment Advice (Simplified)

## 1. Merging vs. Rebasing (The "Like I'm 5" Explanation)

Imagine you are building a Lego tower.
*   **Your changes** are a set of new blue bricks you want to add on top.
*   **My changes** are a set of new red bricks I just added while you were working.

### The Problem
When you try to put your blue bricks on, you realize the tower looks different than when you started.

### Option A: Merge (Safe & Easy) 🟢
You say: "Okay, I see the red bricks. I'll just stack my blue bricks on top of them."
*   **Result:** A timeline that shows the truth: "Red bricks were added, then blue bricks were added."
*   **Why it's good:** It preserves history. If something breaks, we know exactly when and how.
*   **Command:** `git merge origin/main` (or just clicking "Merge" in GitHub).

### Option B: Rebase (Dangerous & Clean) 🔴
You say: "I don't like that the red bricks are there. I'm going to take my blue bricks off, pretend the red bricks were always there, and then secretly slip my blue bricks on top so it looks like I built on top of them from the start."
*   **Result:** A clean straight line, but you "rewrote history".
*   **Why it's bad:** If I (the AI) or another developer also have a copy of the tower, and you suddenly "rewrite" how the tower was built, our copies become "incompatible" (Unrelated Histories). This causes massive conflicts where Git says "I don't know which tower is real anymore!"

**Advice:** **ALWAYS use MERGE** unless you are the only person working on a branch. Never rebase a branch that someone else (like me) is also pushing to.

## 2. Dealing with Conflicts

Conflicts happen when we both try to change the exact same line of code.
*   **"Ours" vs "Theirs":**
    *   **Theirs (Remote/Origin):** Usually the code I (the agent) wrote.
    *   **Ours (Local):** The code you have on your machine.
*   **Resolution:**
    *   If I sent you a PR with a fix, usually you want to accept **"Theirs"** (my changes) for the files I touched.
    *   If you did custom work on `styles.css` and I didn't touch it, keep **"Ours"**.

## 3. Keeping the Repo Clean

To avoid "messing up the repo", follow these steps before you ask me to work:

1.  **Commit your work:** Don't leave things half-finished.
2.  **Pull latest changes:** `git pull origin main` (Merge, don't rebase!).
3.  **Ignore Build Files:** Never commit `dist/`, `.angular/`, or `node_modules/`. These are "generated" files. Committing them causes huge conflicts because they change every time you build.

## 4. Workflow for working with me

1.  **Start:** You give me a task.
2.  **I Work:** I create a branch (e.g., `fix/admin-issues`).
3.  **I Submit:** I create a Pull Request (PR).
4.  **You:**
    *   Go to GitHub/GitLab.
    *   View the PR.
    *   **SQUASH AND MERGE** (if available) or just **MERGE**.
    *   **Do NOT Rebase.**
5.  **Local Update:** On your computer, run:
    ```bash
    git checkout main
    git pull origin main
    ```
    Now you have my changes safely!

## Summary
*   **Rebase** = Rewriting history (Dangerous).
*   **Merge** = Adding to history (Safe).
*   **Stick to Merge.**
