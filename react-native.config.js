const isMacOS = process.env.RN_PLATFORM === 'macos';

module.exports = {
  ...(isMacOS
    ? {reactNativePath: './node_modules/react-native-macos'}
    : {}),
  // CocoaPods/codegen use the CLI's ios project path on both Apple platforms.
  project: {
    ios: {sourceDir: isMacOS ? './macos' : './ios'},
    macos: {sourceDir: './macos'},
  },
  // Exclude the other core package from each platform's code generation.
  dependencies: isMacOS
    ? {'react-native': {platforms: {ios: null}}}
    : {'react-native-macos': {platforms: {ios: null, android: null}}},
};
