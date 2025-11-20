const { contextBridge, ipcRenderer } = require("electron");

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld("electron", {
  // Print functions for thermal printer
  printTicket: (ticketData) => ipcRenderer.invoke("print-ticket", ticketData),
  
  // Fiscal system integration
  sendToFiscal: (saleData) => ipcRenderer.invoke("send-to-fiscal", saleData),
  
  // System info
  getSystemInfo: () => ipcRenderer.invoke("get-system-info"),
});
