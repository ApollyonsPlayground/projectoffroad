/**
 * Native app version — kept in sync with `app-version.json` via `npm run version:sync`.
 * Display-only on web; Play/App Store use android/app/build.gradle + Xcode.
 */
import version from '../../app-version.json';

export const APP_VERSION = version.versionName;
export const ANDROID_VERSION_CODE = version.androidVersionCode;
export const IOS_BUILD_NUMBER = version.iosBuildNumber;
