import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.focusflow.app',
  appName: 'FocusFlow',
  webDir: 'dist',
  // We use a custom scheme inside the WebView. file:// would break IndexedDB
  // persistence on iOS; capacitor:// keeps storage scoped to the app.
  ios: {
    contentInset: 'always',
  },
};

export default config;
