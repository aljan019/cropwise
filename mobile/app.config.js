import 'dotenv/config'

export default {
  expo: {
    name: 'Cropwise',
    slug: 'beejrakshak-mobile',
    version: '0.1.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#0B1F16',
    },
    assetBundlePatterns: ['**/*'],
    ios: { supportsTablet: true },
    android: {
      package: 'com.beejrakshak.mobile',
      permissions: [
        'android.permission.CAMERA',
        'android.permission.READ_EXTERNAL_STORAGE',
        'android.permission.READ_MEDIA_IMAGES',
      ],
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#0B1F16',
      },
    },
    web: { favicon: './assets/favicon.png' },
    plugins: [
      [
        'expo-image-picker',
        {
          photosPermission: 'Cropwise uses photos to scan leaf diseases.',
          cameraPermission: 'Cropwise uses the camera to photograph crop leaves.',
        },
      ],
    ],
    extra: {
      SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
      SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '',
      OPENWEATHER_API_KEY: process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY || process.env.OPENWEATHER_API_KEY || process.env.VITE_OPENWEATHER_API_KEY || '',
      API_ORIGIN: process.env.EXPO_PUBLIC_API_ORIGIN || process.env.API_ORIGIN || 'http://localhost:8001',
      MANDI_API_BASE: process.env.EXPO_PUBLIC_MANDI_API_BASE || process.env.MANDI_API_BASE || 'http://localhost:8001/mandi',
    },
  },
}
