const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Add asset extensions
config.resolver.assetExts.push(
  'jpeg',
  'jpg',
  'png',
  'gif',
  'webp',
  'svg'
);

// Add platforms
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Ensure proper asset resolution
config.resolver.alias = {
  '@assets': './src/assets',
  '@images': './src/assets/images',
};

// Fix for pnpm symlink issues
config.resolver.symlinks = false;
config.resolver.unstable_enableSymlinks = false;

// Add node_modules resolution for pnpm
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, 'node_modules'),
  path.resolve(__dirname, '../../node_modules'),
];

module.exports = config;