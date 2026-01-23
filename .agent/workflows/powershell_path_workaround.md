---
description: How to run npm scripts and commands when system PATH is missing in the current session
---

When the agent cannot rely on the system PATH (e.g., in a session before a restart after PATH updates), use the following PowerShell pattern to execute commands that depend on tools like `node`, `npm`, or `ng`.

1. **Verify Binary Locations**:
   Ensure you know the absolute paths to the tools (e.g., `C:\Program Files\nodejs`).

2. **Construct the PowerShell Command**:
   Combine the following steps into a single `run_command` call:
   - Update the *process-level* PATH environment variable temporarily (`$env:Path += ...`).
   - Change the directory to the target project (`Set-Location ...`).
   - Execute the tool using its absolute path (`& "..." args`).

   **Template:**
   ```powershell
   $env:Path += ";C:\Program Files\nodejs;C:\Program Files\Git\cmd"; Set-Location "C:\Target\Directory"; & "C:\Program Files\nodejs\npm.cmd" run build
   ```

3. **Execution**:
   - Set `Cwd` to a safe, trusted directory (e.g., the scratch space).
   - Set `SafeToAutoRun` to `true` if appropriate.
   - Use `WaitMsBeforeAsync` to allow long-running processes to start.

// turbo
4. **Example: Run Angular Build**:
   ```powershell
   $env:Path += ";C:\Program Files\nodejs"; Set-Location "C:\Users\Administrator\.antigravity\ppl26"; & "C:\Program Files\nodejs\npm.cmd" run build:ui
   ```
