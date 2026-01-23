---
description: The nuclear option for when dependencies are completely broken
---

1. **Remove node_modules**:
   - Delete the existing `node_modules` folder to clear installed packages.
   // turbo
   - Run `rm -rf node_modules`

2. **Remove Lock File**:
   - Delete `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`, or `bun.lockb`.
   // turbo
   - Run `rm package-lock.json yarn.lock pnpm-lock.yaml bun.lockb`

3. **Clean Cache**:
   - Clean the package manager cache.
   // turbo
   - Run `npm cache clean --force`

4. **Reinstall Dependencies**:
   - Install dependencies from scratch.
   // turbo
   - Run `npm install`

5. **Pro Tips**:
   - **Yarn:** `yarn install`
   - **pnpm:** `pnpm install`
   - **Bun:** `bun install`
   - Restart your VS Code window after this to ensure the TypeScript server picks up the new modules.