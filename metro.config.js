const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

// Exclude the .local directory (Replit agent skills/temp files) from Metro's
// file watcher. Without this, Metro crashes when skill temp folders are created
// or deleted while the bundler is running.
config.watchFolders = (config.watchFolders || []).filter(
  (folder) => !folder.includes("/.local/")
);

config.resolver.blockList = [
  ...(Array.isArray(config.resolver.blockList)
    ? config.resolver.blockList
    : config.resolver.blockList
    ? [config.resolver.blockList]
    : []),
  new RegExp(
    path.resolve(__dirname, ".local").replace(/[.*+?^${}()|[\]\\]/g, "\\$&") +
      ".*"
  ),
];

module.exports = config;
