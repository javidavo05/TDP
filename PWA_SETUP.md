# PWA Setup Guide - App Store y Google Play

Este documento describe cómo configurar la aplicación PWA para su publicación en App Store (iOS) y Google Play (Android).

## Configuración Actual

La aplicación ya está configurada como PWA usando `next-pwa`. El `manifest.json` está optimizado para instalación en dispositivos móviles.

## Google Play - Trusted Web Activity (TWA)

### Requisitos

1. **Android Studio** instalado
2. **Java JDK** 11 o superior
3. **Bubblewrap CLI** de Google

### Pasos

1. **Instalar Bubblewrap**:
```bash
npm install -g @bubblewrap/cli
```

2. **Inicializar proyecto TWA**:
```bash
bubblewrap init --manifest https://tu-dominio.com/manifest.json
```

3. **Configurar aplicación**:
   - Package name: `com.tdp.ticketing`
   - App name: TDP Ticketing System
   - Launcher name: TDP Tickets
   - Signing key: Generar nueva o usar existente

4. **Construir APK/AAB**:
```bash
bubblewrap build
```

5. **Firmar APK** (si es necesario):
```bash
jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 -keystore tu-keystore.jks app-release-unsigned.apk alias-name
```

6. **Subir a Google Play Console**:
   - Crear nueva aplicación
   - Subir AAB/APK firmado
   - Completar información de la tienda
   - Configurar políticas de privacidad

## iOS App Store - Capacitor

### Requisitos

1. **Xcode** (solo en macOS)
2. **CocoaPods** instalado
3. **Node.js** y npm

### Pasos

1. **Instalar Capacitor**:
```bash
npm install @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android
npx cap init
```

2. **Configurar Capacitor**:
```javascript
// capacitor.config.ts
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tdp.ticketing',
  appName: 'TDP Ticketing System',
  webDir: 'out',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    Camera: {
      permissions: {
        camera: 'Necesitamos acceso a la cámara para escanear códigos QR'
      }
    },
    Geolocation: {
      permissions: {
        location: 'Necesitamos acceso a la ubicación para GPS tracking'
      }
    }
  }
};

export default config;
```

3. **Agregar plataformas**:
```bash
npx cap add ios
npx cap add android
```

4. **Sincronizar**:
```bash
npm run build
npx cap sync
```

5. **Abrir en Xcode**:
```bash
npx cap open ios
```

6. **Configurar en Xcode**:
   - Configurar Bundle Identifier
   - Agregar capabilities (Camera, Location)
   - Configurar signing & capabilities
   - Configurar App Icons y Launch Screen

7. **Construir y archivar**:
   - Product > Archive
   - Distribuir App
   - Subir a App Store Connect

## Iconos Requeridos

Necesitas crear los siguientes iconos:

### PWA (Web)
- `/public/icon-192x192.png` (192x192px)
- `/public/icon-512x512.png` (512x512px)

### Android
- `mipmap-mdpi/ic_launcher.png` (48x48px)
- `mipmap-hdpi/ic_launcher.png` (72x72px)
- `mipmap-xhdpi/ic_launcher.png` (96x96px)
- `mipmap-xxhdpi/ic_launcher.png` (144x144px)
- `mipmap-xxxhdpi/ic_launcher.png` (192x192px)

### iOS
- `AppIcon.appiconset/` con múltiples tamaños:
  - 20x20, 29x29, 40x40, 60x60, 76x76, 83.5x83.5, 1024x1024

## Permisos Necesarios

### Android (AndroidManifest.xml)
```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
```

### iOS (Info.plist)
```xml
<key>NSCameraUsageDescription</key>
<string>Necesitamos acceso a la cámara para escanear códigos QR</string>
<key>NSLocationWhenInUseUsageDescription</key>
<string>Necesitamos acceso a la ubicación para GPS tracking</string>
```

## Testing

1. **Probar PWA**:
   - Abrir en Chrome/Edge
   - Verificar instalación
   - Probar offline
   - Probar notificaciones

2. **Probar TWA**:
   - Instalar APK en dispositivo Android
   - Verificar que abre la PWA
   - Probar funcionalidades nativas

3. **Probar Capacitor iOS**:
   - Ejecutar en simulador iOS
   - Probar en dispositivo físico
   - Verificar permisos

## Deployment

### Producción

1. **Build de producción**:
```bash
npm run build
```

2. **Deploy a Vercel/Netlify**:
   - Configurar variables de entorno
   - Deploy automático desde GitHub

3. **Actualizar URLs en TWA/Capacitor**:
   - Actualizar `manifest.json` URL en Bubblewrap
   - Actualizar `server.url` en Capacitor config

## Notas Importantes

- **HTTPS es requerido** para PWA y TWA
- Los iconos deben ser **maskable** para Android
- iOS requiere **App Store Connect** account ($99/año)
- Google Play requiere **Developer account** ($25 una vez)
- Las actualizaciones de PWA son automáticas
- TWA/Capacitor requieren actualizaciones de app nativa

## Recursos

- [PWA Documentation](https://web.dev/progressive-web-apps/)
- [Bubblewrap Documentation](https://github.com/GoogleChromeLabs/bubblewrap)
- [Capacitor Documentation](https://capacitorjs.com/docs)
- [App Store Connect](https://appstoreconnect.apple.com/)
- [Google Play Console](https://play.google.com/console/)

