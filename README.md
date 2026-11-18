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

| Event | What CI does |
|---|---|
| Pull request | Lint, check scripts and build (`checks.yml`), then a preview URL that expires after 1 hour (re-run the workflow for a fresh one) (`preview.yml`). |
| Merge into `main` | The same checks, then deploys the live site (`deploy.yml`). The PWA updates itself on the next launch. |
| Merge that bumps `version` in `package.json` | Also builds a signed APK and publishes it as release `vX.Y.Z` (`deploy.yml`). |

`main` only accepts PRs whose checks pass. `firestore.rules` is not deployed by CI; after changing it, run `firebase deploy --only firestore:rules`.

## Releasing

The web app ships on every merge. The Android app ships only when the version changes, and `package.json` is the one place that version lives.

1. Branch `chores/release-X.Y.Z` off `main`.
2. Set `"version"` in `package.json` to the new version ([semver](https://semver.org)): patch for fixes, minor for features, major only for something that breaks older installs. Minor and patch stay between 0 and 99, because Android's `versionCode` is `major*10000 + minor*100 + patch`.
3. For an urgent fix (security, data loss) that older installs must not keep running, also raise `"minVersion"` to the new version. The app blocks anything below `minVersion` until it is updated.
4. Open a PR and merge it. CI tags `vX.Y.Z`, builds and signs the APK, and publishes the release, with notes generated from the merged PRs.

The version must be higher than the latest release, or the release job fails. Don't push `v*` tags by hand.

**Old app versions keep running.** An installed APK is a snapshot that reads and writes the same Firestore data as the latest web app. Data changes must be additive: add fields, but never rename or remove them or change what an existing one means. Never tighten `firestore.rules` in a way that rejects writes from an older version.

## Install on Android

Releases are sideloaded from GitHub only (no Play Store):

1. Open the latest release on the [Releases page](../../releases) and download `kira-vX.Y.Z.apk`.
2. Open it on the phone and allow "Install unknown apps" for the browser or file manager when asked.
3. To update, install the newer APK over the old one (same signing key, so your data stays).
