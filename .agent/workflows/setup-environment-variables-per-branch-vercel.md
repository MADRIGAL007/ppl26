---
description: Configure different env vars for dev, staging, and production
---

1. **Local Development (.env.local)**:
   - Create `.env.local` for local overrides (never commit this).
   ```bash
   # .env.local
   DATABASE_URL=postgresql://localhost:5432/mydb
   API_URL=http://localhost:3001
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

2. **Shared Defaults (.env)**:
   - Create `.env` for defaults (commit this).
   ```bash
   # .env
   NEXT_PUBLIC_APP_NAME=MyApp
   NEXT_PUBLIC_MAX_UPLOAD_SIZE=5242880
   ```

3. **Vercel Environment Setup**:
   - In Vercel Dashboard → Project → Settings → Environment Variables.
   - Add variables for each environment:
     - **Production**: `main` branch
     - **Preview**: All other branches
     - **Development**: Local only

4. **Access Branch-Specific Vars**:
   - Vercel automatically injects `VERCEL_ENV`.
   ```tsx
   const apiUrl = process.env.VERCEL_ENV === 'production'
     ? 'https://api.myapp.com'
     : 'https://staging-api.myapp.com';
   ```

5. **GitHub Actions Setup**:
   - Use secrets for CI/CD.
   ```yaml
   # .github/workflows/test.yml
   env:
     DATABASE_URL: ${{ secrets.DATABASE_URL }}
     API_KEY: ${{ secrets.API_KEY }}
   ```

6. **Pro Tips**:
   - Prefix public vars with `NEXT_PUBLIC_` for client-side access.
   - Use `.env.example` as a template (commit).
   - Never log environment variables in production.
   - Use Vercel CLI to pull env vars: `vercel env pull .env.local`.