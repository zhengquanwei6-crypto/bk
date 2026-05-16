import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor configuration for the Android shell of AI Image Generator.
 *
 * Strategy: this APK is a thin WebView wrapper around the production website
 * hosted on the user's VPS. No API keys are bundled - all network calls go
 * through the VPS backend.
 *
 * Before building, change `server.url` below to your real HTTPS site URL.
 */
const config: CapacitorConfig = {
  appId: 'com.aig.imagegenerator',
  appName: 'AI Image Generator',
  // The Android project lives under ./android (created via `npx cap add android`).
  // We don't bundle a webDir because the WebView loads the live site directly.
  webDir: 'public',
  bundledWebRuntime: false,

  server: {
    // === IMPORTANT ===
    // Set this to your real HTTPS domain before building the APK.
    // Do NOT use localhost / 127.0.0.1 / your VPS IP - use the public domain.
    url: 'https://your-domain.com',
    // Keep cleartext disabled - the APK should only talk to your HTTPS site.
    cleartext: false,
    androidScheme: 'https',
  },

  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
    // Make the WebView background match the app theme to avoid flashes
    // on Xiaomi MIUI / OPPO ColorOS during navigation.
    backgroundColor: '#f7f8fb',
  },

  plugins: {
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#ffffff',
      overlaysWebView: false,
    },
    // Filesystem / Share / Clipboard / Network / Browser / Preferences plugins
    // are configured per-call from JS. No plugin-level config needed today.
  },
};

export default config;
