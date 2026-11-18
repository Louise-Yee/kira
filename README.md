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

## Install on Android

Releases are sideloaded from GitHub only (no Play Store, no auto-update):

1. Open the latest release on the [Releases page](../../releases) and download `kira-vX.Y.Z.apk`.
2. Open it on the phone and allow "Install unknown apps" for the browser or file manager when asked.
3. To update, install the newer APK over the old one (same signing key, so your data stays).

Publishing a release: `git tag v1.0.0 && git push origin v1.0.0`. The Release workflow builds, signs and publishes the APK.
