# Android APK (Capacitor WebView)

The first version of the Android app is a thin Capacitor WebView wrapper
around your VPS-hosted website. **No API keys** are bundled in the APK; the
app only talks to your VPS backend over HTTPS.

## Prerequisites

- Node.js 20+
- Java JDK 17 (Android Gradle Plugin 8.x requires it)
- Android Studio Hedgehog or newer (for SDK + signing tools)
- A VPS that's already serving the site over HTTPS (see `deploy/README.md`)

## 1. Configure the production URL

Open `capacitor.config.ts` and replace the placeholder:

```ts
server: {
  url: 'https://your-domain.com', // <-- your real HTTPS domain
  cleartext: false,
  androidScheme: 'https',
},
```

Do **not** use `localhost`, `127.0.0.1`, or a raw IP. You need a real domain
with a valid TLS certificate; otherwise MIUI / ColorOS WebView will refuse to
load the page.

## 2. Add the Android platform (one-time)

```bash
cd ai-image-generator-platform
npm install
npx cap add android
npx cap sync android
```

This creates an `android/` directory containing a Gradle project. We
intentionally `.gitignore` it - regenerate it whenever you bump Capacitor.

## 3. Open in Android Studio

```bash
npx cap open android
```

In Android Studio:

1. Wait for Gradle sync to finish.
2. Set the application ID under `android/app/build.gradle` to match the one
   in `capacitor.config.ts` (`com.aig.imagegenerator` by default).
3. Set `minSdkVersion = 24` (Android 7.0+) — works on virtually all current
   devices and avoids legacy WebView quirks.
4. Add an app icon: `app > New > Image Asset` (or use the Capacitor default).

## 4. Build a release APK

In Android Studio:

1. `Build > Generate Signed Bundle / APK`
2. Pick **APK** (or AAB if you'll publish on Google Play).
3. Create a keystore and sign.
4. Choose `release` build variant.
5. Output: `android/app/release/app-release.apk` — distribute that file.

Or from the command line:

```bash
cd android
./gradlew assembleRelease
# Output: android/app/build/outputs/apk/release/app-release-unsigned.apk
```

You'll need to sign the unsigned APK separately (see Android docs).

## 5. Permissions

The app uses these runtime permissions:

- `INTERNET` — required for the WebView (auto-granted)
- `WRITE_EXTERNAL_STORAGE` / `READ_MEDIA_IMAGES` — to save generated images
  on Android 10+. The Capacitor `Filesystem` plugin handles this.
- `POST_NOTIFICATIONS` (Android 13+) — optional, only if you later add
  generation-complete push notifications.

## 6. Permission install on Xiaomi MIUI / HyperOS

MIUI and HyperOS often block sideloaded APK installs by default. On the
target phone:

1. Settings → Privacy protection → Special permissions → **Install unknown apps**
2. Allow your file manager / browser used to download the APK.
3. If install is blocked with "for your security", switch off
   *MIUI optimization* under Developer Options or use ADB sideload:
   ```bash
   adb install app-release.apk
   ```

If the page renders blank or images don't load:

- Open Settings → Apps → System app settings → Android System WebView, make
  sure it is **enabled and updated**. MIUI 14 / HyperOS occasionally disables
  it in favor of Mi Browser; the WebView component is still required by
  Capacitor.
- Check that the app has Internet permission (Settings → Apps → AI Image
  Generator → Permissions). MIUI's "data saver" can block background fetches.

## 7. OPPO ColorOS

ColorOS often shows extra warnings on first install:

1. Allow the install source in Settings → Privacy → Install from this source.
2. When the app first runs, ColorOS shows a "background activity" prompt —
   choose **Allow**, otherwise the app may be killed mid-generation.
3. If image saving fails, grant **Files and media** permission explicitly:
   Settings → Apps → AI Image Generator → Permissions → Files and media → Allow.
4. Disable battery optimization for the app under
   Settings → Battery → Background app management.

## 8. Adapting to safe areas

We already declare `viewport-fit=cover` and use CSS `env(safe-area-inset-*)`
in `app/globals.css`. To make the status bar match the page:

- The status-bar plugin is configured in `capacitor.config.ts` to be light
  background, non-overlay.
- If you want a dark status bar on dark mode, listen to the
  `prefers-color-scheme: dark` media query in JS and call
  `StatusBar.setStyle({ style: Style.Dark })`.

## 9. Notes / TODOs (v1)

The first APK release is a pure WebView; native integrations are stubbed.
The Capacitor plugins are pre-installed in `package.json`, so the JS layer
can call them directly when needed. Suggested next iterations:

- [ ] Use `@capacitor/filesystem` to save the result PNG to gallery
      (Android: `Directory.Documents` or `Directory.External`).
- [ ] Use `@capacitor/share` to trigger system share for the image URL.
- [ ] Use `@capacitor/network` to show an offline banner when the device
      drops connectivity mid-generation.
- [ ] Use `@capacitor/preferences` to remember the user's last-selected
      API source on the device (no API key, just an id).

The web UI already has Copy URL / Copy prompt / Download buttons that work
in the WebView via standard browser APIs.
