// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const config = {
  resolver: {
    sourceExts: ['js', 'jsx', 'json', 'ts', 'tsx'],
    assetExts: [
      'png',
      'jpg',
      'jpeg',
      'gif',
      'mp3',
      'mp4',
      'wav',
      'ttf',
      'otf',
      'woff',
      'woff2',
      'eot'
    ],
  },
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
