import fs from 'node:fs';
const candidate = process.env.RELEASE_VERSION || process.env.GITHUB_REF_NAME || '';
const match = /^v?(\d+)\.(\d+)\.(\d+)(?:-[0-9A-Za-z.-]+)?$/.exec(candidate);
if (!match) throw new Error('Use a version tag such as v0.0.1 or enter a semantic version');
const version = match.slice(1, 4).join('.');
const build = Number(process.env.GITHUB_RUN_NUMBER || 1);
if (!Number.isSafeInteger(build) || build < 1 || build > 65535) throw new Error('Build number out of range');
fs.appendFileSync(process.env.GITHUB_ENV, `APP_VERSION=${version}\nAPP_BUILD_NUMBER=${build}\nRELEASE_TAG=${candidate}\n`);
console.log(`Version ${version}, build ${build}`);
