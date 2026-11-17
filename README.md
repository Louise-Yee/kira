# kira

Every ringgit, accounted for. A personal expense tracker PWA: offline-first, synced through Firebase (free Spark plan), Google sign-in.

- Product spec: [SPEC.md](SPEC.md)
- Build plan: [PLAN.md](PLAN.md)
- Rules for contributors and agents: [CLAUDE.md](CLAUDE.md)

## Run locally

```sh
cp .env.example .env   # fill in from Firebase console → Project settings → Your apps
npm install
npm run dev
```

## Deploy

Pushing to `main` builds and deploys to Firebase Hosting. Each pull request gets a preview URL that expires after 7 days. Both workflows are in `.github/workflows/`.
