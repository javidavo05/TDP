# Electron POS Terminal Setup

Este documento explica cómo configurar y construir la aplicación POS Terminal usando Electron.

## Requisitos Previos

- Node.js 18+ y npm
- Windows 10+ (para construir el .exe)
- Next.js build configurado

## Instalación

1. Instalar dependencias:
```bash
npm install
```

2. Las dependencias de Electron se instalarán automáticamente:
   - `electron`: Runtime de Electron
   - `electron-builder`: Herramienta para construir instaladores
   - `concurrently`: Para ejecutar Next.js y Electron simultáneamente
   - `wait-on`: Para esperar a que Next.js esté listo

## Desarrollo

Para ejecutar en modo desarrollo:

```bash
npm run electron:dev
```

Esto iniciará:
1. Next.js en `http://localhost:3000`
2. Electron cuando Next.js esté listo
3. Abrirá automáticamente la aplicación en `/dashboard/pos`

## Construcción

### Construir para Windows (.exe)

```bash
npm run electron:build:win
```

Esto generará:
- Un instalador NSIS en `dist-electron/TDP POS Terminal Setup.exe`
- Soporta arquitecturas x64 e ia32

### Construir para todas las plataformas

```bash
npm run electron:build
```

### Solo empaquetar (sin instalador)

```bash
npm run electron:pack
```

## Configuración

### Modo Kiosco

Para habilitar el modo kiosco (pantalla completa, sin salir), edita `electron/main.js`:

```javascript
mainWindow = new BrowserWindow({
  // ...
  fullscreen: true,  // Cambiar a true
  kiosk: true,       // Cambiar a true
  frame: false,      // Sin barra de título
});
```

### Puerto de Impresora

Los servicios de impresión (`FiscalService` y `ThermalPrinterService`) se conectan a impresoras a través de:

- **Windows**: Puertos COM (COM1, COM2, etc.)
- **USB**: Identificadores de dispositivo USB
- **Red**: Direcciones IP para impresoras de red

Para configurar, usa los métodos `connect()` de cada servicio:

```typescript
await thermalPrinter.connect("COM3");
await fiscalService.connect("COM4");
```

## Integración con Impresoras

### Impresora Térmica

El servicio `ThermalPrinterService` genera comandos ESC/POS estándar para impresoras térmicas de 80mm.

**Impresoras compatibles:**
- Epson TM-T20, TM-T82, etc.
- Star TSP100, TSP650, etc.
- Cualquier impresora ESC/POS

### Sistema Fiscal

El servicio `FiscalService` está diseñado para integrarse con sistemas fiscales panameños.

**Sistemas compatibles:**
- Impresoras fiscales con protocolo estándar
- Sistemas de facturación electrónica (FE) de Panamá

**Nota:** La implementación específica del protocolo fiscal dependerá del modelo de impresora fiscal utilizado.

## Estructura de Archivos

```
electron/
  ├── main.js          # Proceso principal de Electron
  ├── preload.js       # Script de preload (API bridge)
  └── package.json     # Configuración del paquete Electron

electron-builder.config.js  # Configuración de electron-builder
```

## API de Electron

La aplicación expone una API a través de `preload.js`:

```typescript
// En el renderer (Next.js)
if (window.electronAPI) {
  // Imprimir ticket térmico
  await window.electronAPI.printTicket(ticketData);
  
  // Imprimir factura fiscal
  await window.electronAPI.printFiscalInvoice(invoiceData);
  
  // Obtener información de plataforma
  const platform = window.electronAPI.getPlatform();
  const version = window.electronAPI.getVersion();
}
```

## Troubleshooting

### Error: "Cannot find module 'electron'"

Ejecuta `npm install` nuevamente para asegurar que todas las dependencias estén instaladas.

### Error: "Next.js build failed"

Asegúrate de que el build de Next.js funcione correctamente:
```bash
npm run build
```

### La impresora no imprime

1. Verifica que la impresora esté conectada y encendida
2. Verifica el puerto COM en Windows (Device Manager)
3. Asegúrate de que los drivers de la impresora estén instalados
4. Revisa los logs de la consola de Electron para errores

### El .exe no se genera

1. Verifica que `electron-builder` esté instalado: `npm list electron-builder`
2. Asegúrate de tener espacio en disco suficiente
3. Revisa los logs de construcción para errores específicos

## Próximos Pasos

- [ ] Implementar comunicación real con impresoras (COM ports, USB, red)
- [ ] Agregar configuración de impresora en la UI
- [ ] Implementar protocolo fiscal específico para Panamá
- [ ] Agregar soporte para múltiples impresoras
- [ ] Implementar cola de impresión para manejar múltiples tickets
- [ ] Agregar logs de impresión y errores

