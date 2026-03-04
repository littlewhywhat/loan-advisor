# SPA Web App

Minimal Vite SPA starter (React, TypeScript, Radix UI, Hono API) for vibe coding and rapid prototyping. Deployed on Vercel.

## Stack

- **Frontend**: Vite, React, React Router, Radix UI Themes
- **Backend**: Hono (serverless on Vercel)
- **Tooling**: pnpm, ESLint, Prettier, TypeScript

## Prerequisites

- Node 22
- pnpm

## Development

```bash
cp .env.example .env
pnpm install
vercel dev
```

`vercel dev` runs the Vite dev server and Hono API together. Use `/api/health` as a sanity check.

## CI/CD

GitHub Actions deploys automatically:

- **Preview**: on every pull request, comments the preview URL
- **Production**: on pushes to `main`, writes the production URL to the job summary

Add these repository secrets:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

Find IDs with:

```bash
vercel org ls
vercel projects ls
```

To link locally:

```bash
vercel link
```

Set `VITE_ENV` for custom environment labels (e.g. `preview`, `production`).

## Troubleshooting

- Ensure all secrets are set in **Repository Settings → Secrets and variables → Actions**
- Verify organization and project IDs via the Vercel CLI
- Run `pnpm run ci` locally to replicate the CI build
