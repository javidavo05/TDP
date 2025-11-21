import sharp from "sharp";
import { writeFileSync, existsSync, mkdirSync } from "fs";
import { resolve } from "path";
import { PWA_CONFIGS, ICON_SIZES, getIconFileName, getFaviconFileName, type PWAType } from "../src/config/pwa-icons";

async function generateIcon(
  size: number,
  outputPath: string,
  config: typeof PWA_CONFIGS[PWAType]
) {
  // Create icon with gradient and text
  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad-${size}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${config.primaryColor};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${config.secondaryColor};stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="${size}" height="${size}" fill="url(#grad-${size})" rx="${size * 0.15}"/>
      <text 
        x="50%" 
        y="50%" 
        font-family="Arial, sans-serif" 
        font-size="${size * 0.35}" 
        font-weight="bold" 
        fill="white" 
        text-anchor="middle" 
        dominant-baseline="central"
      >${config.text}</text>
    </svg>
  `;

  await sharp(Buffer.from(svg))
    .png()
    .toFile(outputPath);

  console.log(`  ✅ ${outputPath} (${size}x${size})`);
}

async function generateFavicon(
  outputPath: string,
  config: typeof PWA_CONFIGS[PWAType]
) {
  // Generate 32x32 icon for favicon
  const svg = `
    <svg width="32" height="32" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad-favicon" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${config.primaryColor};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${config.secondaryColor};stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" fill="url(#grad-favicon)" rx="4"/>
      <text 
        x="50%" 
        y="50%" 
        font-family="Arial, sans-serif" 
        font-size="11" 
        font-weight="bold" 
        fill="white" 
        text-anchor="middle" 
        dominant-baseline="central"
      >${config.text}</text>
    </svg>
  `;

  // Generate ICO format (multi-size)
  const sizes = [16, 32];
  const images = await Promise.all(
    sizes.map(async (size) => {
      const resized = await sharp(Buffer.from(svg))
        .resize(size, size)
        .png()
        .toBuffer();
      return { size, buffer: resized };
    })
  );

  // For simplicity, we'll create a PNG favicon (browsers support it)
  // To create a true ICO file, you'd need a library like 'to-ico'
  await sharp(Buffer.from(svg))
    .resize(32, 32)
    .png()
    .toFile(outputPath.replace('.ico', '.png'));

  console.log(`  ✅ ${outputPath.replace('.ico', '.png')} (favicon)`);
}

async function generateIconsForPWA(type: PWAType) {
  const config = PWA_CONFIGS[type];
  console.log(`\n🎨 Generating icons for ${type.toUpperCase()} PWA...`);
  console.log(`   Name: ${config.name}`);
  console.log(`   Colors: ${config.primaryColor} → ${config.secondaryColor}`);

  const publicDir = resolve(process.cwd(), "public");

  // Generate all icon sizes
  for (const size of ICON_SIZES) {
    const fileName = getIconFileName(type, size);
    const outputPath = resolve(publicDir, fileName);
    await generateIcon(size, outputPath, config);
  }

  // Generate favicon
  const faviconFileName = getFaviconFileName(type);
  const faviconPath = resolve(publicDir, faviconFileName);
  await generateFavicon(faviconPath, config);
}

async function generateIcons() {
  console.log("🎨 Generating PWA icons for all applications...\n");

  const pwaTypes: PWAType[] = ["public", "admin", "pos", "scanner"];

  for (const type of pwaTypes) {
    await generateIconsForPWA(type);
  }

  console.log("\n✨ All icons generated successfully!");
  console.log("\n📝 Next steps:");
  console.log("   1. Update manifests to reference the new icon files");
  console.log("   2. Update layouts to use the correct favicons");
  console.log("   3. Test PWA installation on different devices");
}

generateIcons().catch((error) => {
  console.error("❌ Error generating icons:", error);
  process.exit(1);
});

