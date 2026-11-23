import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  // The dev APK is built with APP_ID=app.kira.dev (see dev-apk.yml).
  appId: process.env.APP_ID ?? 'app.kira',
  appName: process.env.APP_LABEL ?? 'kira',
  webDir: 'dist',
  plugins: {
    FirebaseAuthentication: { skipNativeAuth: true, providers: ['google.com'] },
  },
};

export default config;
