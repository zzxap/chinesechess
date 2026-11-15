// RN 0.81's legacy codegen libraries use schema names instead of package names.
// Match the owning package too, so platform exclusions survive Xcode's rescan.
const fs = require('node:fs');
const path = require('node:path');

const marker = '// chinesechess: honor package exclusions for legacy codegen configs';
const original = `const libraries = codegenEnabledLibraries.filter(
        ({name}) => !disabledLibraries.includes(name),
      );`;
const replacement = `${marker}
      const libraries = codegenEnabledLibraries.filter(({name, libraryPath}) => {
        const packageName = readPkgJsonInDirectory(libraryPath).name;
        return !disabledLibraries.includes(name) && !disabledLibraries.includes(packageName);
      });`;

for (const name of ['react-native', 'react-native-macos']) {
  const manifest = require.resolve(`${name}/package.json`, {paths: [path.resolve(__dirname, '..')]});
  const version = JSON.parse(fs.readFileSync(manifest, 'utf8')).version;
  if (!/^0\.81\./.test(version)) {
    throw new Error(`Review the Codegen compatibility patch before upgrading ${name} ${version}`);
  }
  const file = path.join(path.dirname(manifest), 'scripts/codegen/generate-artifacts-executor/index.js');
  const source = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  if (source.includes(marker)) {
    continue;
  }
  if (source.split(original).length !== 2) {
    throw new Error(`Codegen source layout changed in ${name}; platform exclusions need review`);
  }
  fs.writeFileSync(file, source.replace(original, replacement));
  console.log(`Applied Codegen package exclusion compatibility patch: ${name} ${version}`);
}
