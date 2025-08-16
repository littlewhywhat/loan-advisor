# Next.js Vercel CI Template

Minimal Next.js 15 (App Router, TypeScript, Radix UI) starter with preview and production deployments on Vercel.

## Prerequisites

- Node 20
- npm

## Development

```bash
cp .env.example .env.local
npm install
npm run dev
```

Home page shows an environment badge and links to the health check at `/api/health`.

## CI/CD

GitHub Actions deploys automatically:

- **Preview**: on every pull request, comments the preview URL.
- **Production**: on pushes to `main`, writes the production URL to the job summary.

Add these repository secrets before running the workflows:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

Find IDs with:

```bash
vercel org ls
vercel projects ls
```

Optionally set `NEXT_PUBLIC_ENV` for custom environment labels.

To link locally without secrets run:

```bash
npx vercel link
```

## Troubleshooting

- Ensure all secrets are set in **Repository Settings → Secrets and variables → Actions**.
- Verify organization and project IDs via the Vercel CLI.
- Run `npm run ci` locally to replicate the CI build.
