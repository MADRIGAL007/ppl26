---
description: Standardize VS Code settings across the team
---

1. **Create settings.json**:
   - Create `.vscode/settings.json` for workspace-specific settings.
   // turbo
   - Run `mkdir -p .vscode && printf '{\n  "editor.formatOnSave": true,\n  "editor.defaultFormatter": "esbenp.prettier-vscode",\n  "editor.codeActionsOnSave": {\n    "source.fixAll.eslint": true\n  }\n}' > .vscode/settings.json`

2. **Create extensions.json**:
   - Recommend extensions for the team.
   // turbo
   - Run `printf '{\n  "recommendations": [\n    "dbaeumer.vscode-eslint",\n    "esbenp.prettier-vscode",\n    "bradlc.vscode-tailwindcss"\n  ]\n}' > .vscode/extensions.json`

3. **Pro Tips**:
   - Commit the `.vscode` folder (excluding user-specific files) to git.