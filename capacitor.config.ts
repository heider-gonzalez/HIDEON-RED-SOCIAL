import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.hsocial.app',
  appName: 'hsocial-com-95-43-34-51-34',
  webDir: 'dist',
  server: {
    url: 'https://hsocial-app.onrender.com/',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 3000,
      launchAutoHide: true,
      backgroundColor: "#000000",
      androidSplashResourceName: "splash",
      androidSpinnerStyle: "large",
      iosSpinnerStyle: "small",
      spinnerColor: "#9b87f5",
      showSpinner: true,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#ffffff',
      overlaysWebView: false,
    },
  }
};

export default config;