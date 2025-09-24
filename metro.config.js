const { getDefaultConfig } = require('expo/metro-config');

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

module.exports = config;