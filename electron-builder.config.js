module.exports = {
  appId: "com.tdp.ticketing.pos",
  productName: "TDP POS Terminal",
  directories: {
    output: "dist-electron",
  },
  files: [
    "out/**/*",
    "electron/**/*",
    "package.json",
  ],
  win: {
    target: [
      {
        target: "nsis",
        arch: ["x64"],
      },
    ],
    icon: "electron/icons/icon.ico",
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: "TDP POS Terminal",
  },
  mac: {
    target: ["dmg"],
    icon: "electron/icons/icon.icns",
  },
  linux: {
    target: ["AppImage"],
    icon: "electron/icons/icon.png",
  },
};
