const { ipcMain } = require("electron");
const os = require("os");

ipcMain.handle("get-system-info", async () => {
  try {
    // Check for printer availability (simplified - would need actual printer detection)
    const hasPrinter = false; // TODO: Implement actual printer detection
    
    // Check for fiscal system (simplified - would need actual fiscal system detection)
    const hasFiscal = false; // TODO: Implement actual fiscal system detection
    
    return {
      platform: process.platform,
      arch: os.arch(),
      hostname: os.hostname(),
      hasPrinter,
      hasFiscal,
    };
  } catch (error) {
    console.error("Error getting system info:", error);
    return {
      platform: process.platform,
      arch: os.arch(),
      hostname: os.hostname(),
      hasPrinter: false,
      hasFiscal: false,
    };
  }
});

