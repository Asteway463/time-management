const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
const emptyModule = path.resolve(__dirname, 'shims/empty.js');

// pdfjs-dist contains Node-only branches guarded by `isNodeJS`. Metro resolves
// every require statically, so point those modules at an empty shim instead of
// failing the bundle. The PDF reader runs the pdf.js worker on the JS thread,
// which avoids needing a WebView or any native PDF dependency.
const nodeOnlyModules = new Set([
  'canvas',
  'fs',
  'http',
  'https',
  'path',
  'url',
  'zlib',
]);

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (nodeOnlyModules.has(moduleName)) {
    return { type: 'sourceFile', filePath: emptyModule };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
