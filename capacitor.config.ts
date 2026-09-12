import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.animex.billing',
  appName: 'ANIMEX Billing',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
