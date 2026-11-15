module.exports = {
  ...(process.env.RN_PLATFORM === 'macos'
    ? {reactNativePath: './node_modules/react-native-macos'}
    : {}),
  project: {macos: {sourceDir: './macos'}},
};
