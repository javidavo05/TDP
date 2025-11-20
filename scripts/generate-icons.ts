import sharp from "sharp";
import { writeFileSync } from "fs";
import { resolve } from "path";

async function generateIcon(size: number, outputPath: string) {
  // Create a simple icon with TDP text
  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#2563eb;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="${size}" height="${size}" fill="url(#grad)" rx="${size * 0.15}"/>
      <text 
        x="50%" 
        y="50%" 
        font-family="Arial, sans-serif" 
        font-size="${size * 0.4}" 
        font-weight="bold" 
        fill="white" 
        text-anchor="middle" 
        dominant-baseline="central"
      >TDP</text>
    </svg>
  `;

  await sharp(Buffer.from(svg))
    .png()
    .toFile(outputPath);

  console.log(`✅ Generated ${outputPath} (${size}x${size})`);
}

async function generateIcons() {
  console.log("🎨 Generating PWA icons...\n");

  const publicDir = resolve(process.cwd(), "public");

  // Generate 192x192 icon
  await generateIcon(192, resolve(publicDir, "icon-192x192.png"));

  // Generate 512x512 icon
  await generateIcon(512, resolve(publicDir, "icon-512x512.png"));

  console.log("\n✨ Icons generated successfully!");
}

generateIcons().catch((error) => {
  console.error("❌ Error generating icons:", error);
  process.exit(1);
});

