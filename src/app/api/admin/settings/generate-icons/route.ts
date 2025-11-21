import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolve } from "path";
import { PWA_CONFIGS, type PWAType } from "@/config/pwa-icons";
import { SettingsService } from "@/services/admin/SettingsService";
import { SettingsRepository } from "@/infrastructure/db/supabase/SettingsRepository";

export const dynamic = 'force-dynamic';

const settingsRepository = new SettingsRepository();
const settingsService = new SettingsService(settingsRepository);

// Helper to check admin auth
async function checkAdminAuth() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (userData?.role !== "admin" && userData?.role !== "owner") {
    throw new Error("Forbidden: Admin access required");
  }

  return user;
}

export async function POST() {
  try {
    await checkAdminAuth();

    // Get PWA icons config from database or use defaults
    let configs = await settingsService.getPWAIconsConfig();
    if (!configs) {
      // Use default configs from pwa-icons.ts
      configs = PWA_CONFIGS;
    }

    // Import sharp dynamically
    const sharp = (await import("sharp")).default;
    const { ICON_SIZES, getIconFileName, getFaviconFileName } = await import("@/config/pwa-icons");

    const publicDir = resolve(process.cwd(), "public");

    async function generateIcon(
      size: number,
      outputPath: string,
      config: typeof PWA_CONFIGS[PWAType]
    ) {
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
    }

    async function generateFavicon(
      outputPath: string,
      config: typeof PWA_CONFIGS[PWAType]
    ) {
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

      await sharp(Buffer.from(svg))
        .resize(32, 32)
        .png()
        .toFile(outputPath.replace('.ico', '.png'));
    }

    const pwaTypes: PWAType[] = ["public", "admin", "pos", "scanner"];
    const generated: string[] = [];

    for (const type of pwaTypes) {
      const config = configs[type];
      
      // Generate all icon sizes
      for (const size of ICON_SIZES) {
        const fileName = getIconFileName(type, size);
        const outputPath = resolve(publicDir, fileName);
        await generateIcon(size, outputPath, config);
        generated.push(fileName);
      }

      // Generate favicon
      const faviconFileName = getFaviconFileName(type);
      const faviconPath = resolve(publicDir, faviconFileName);
      await generateFavicon(faviconPath, config);
      generated.push(faviconFileName.replace('.ico', '.png'));
    }

    return NextResponse.json({ 
      success: true, 
      message: "Iconos generados exitosamente",
      generated: generated.length
    });
  } catch (error) {
    console.error("Error generating icons:", error);
    const message = (error as Error).message;
    if (message === "Unauthorized" || message.includes("Forbidden")) {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    return NextResponse.json({ 
      error: message || "Failed to generate icons",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

