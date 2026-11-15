"""Prepare a temporary signing keychain. Never print certificate/password data."""
import base64
import os
from pathlib import Path
import plistlib
import re
import secrets
import subprocess
import sys

platform = sys.argv[1]
prefix = 'IOS' if platform == 'ios' else 'MACOS'
temp = Path(os.environ['RUNNER_TEMP'])
keychain = temp / 'chinesechess-signing.keychain-db'
cert = os.environ.get(prefix + '_CERTIFICATE_BASE64', '')
password = os.environ.get(prefix + '_CERTIFICATE_PASSWORD', '')
profile = os.environ.get('IOS_PROVISION_PROFILE_BASE64_chanesechess', '') if platform == 'ios' else ''
team = os.environ.get('APPLE_TEAM_ID', '')
identity = os.environ.get('MACOS_SIGN_IDENTITY', '') if platform == 'macos' else 'Apple Distribution'

def run(*args):
    # Suppress security's output; exceptions contain only the executable name.
    r = subprocess.run(args, capture_output=True)
    if r.returncode:
        raise RuntimeError(f'{Path(args[0]).name} failed (exit {r.returncode}); check signing Secrets')
    return r.stdout

if not cert:
    if password or profile or (platform == 'macos' and identity):
        raise SystemExit(f'Incomplete {prefix} signing Secrets: certificate missing')
    Path(os.environ['GITHUB_ENV']).open('a').write('APPLE_SIGNED=false\n')
    sys.exit(0)
if not password or (platform == 'ios' and (not profile or not team)) or (platform == 'macos' and not identity):
    raise SystemExit(f'Incomplete {prefix} signing Secrets; see docs/RELEASING.md')

p12 = temp / 'chinesechess-signing.p12'
p12.write_bytes(base64.b64decode(''.join(cert.split()), validate=True))
p12.chmod(0o600)
key_password = secrets.token_urlsafe(32)
try:
    run('security', 'create-keychain', '-p', key_password, str(keychain))
    run('security', 'set-keychain-settings', '-lut', '21600', str(keychain))
    run('security', 'unlock-keychain', '-p', key_password, str(keychain))
    run('security', 'import', str(p12), '-P', password, '-t', 'cert', '-f', 'pkcs12', '-k', str(keychain), '-A')
    run('security', 'set-key-partition-list', '-S', 'apple-tool:,apple:', '-s', '-k', key_password, str(keychain))
    current = run('security', 'list-keychains', '-d', 'user').decode()
    keychains = re.findall(r'"([^"]+)"', current)
    run('security', 'list-keychains', '-d', 'user', '-s', str(keychain), *keychains)
finally:
    p12.unlink(missing_ok=True)

if platform == 'ios':
    raw = temp / 'chinesechess-profile.mobileprovision'
    raw.write_bytes(base64.b64decode(''.join(profile.split()), validate=True))
    raw.chmod(0o600)
    data = plistlib.loads(run('security', 'cms', '-D', '-i', str(raw)))
    uuid = data['UUID']
    if not re.fullmatch(r'[0-9A-Fa-f-]{36}', uuid): raise SystemExit('Invalid provisioning UUID')
    expected = team + '.com.zzxap.chinesechess'
    if not re.fullmatch(r'[A-Z0-9]{10}', team): raise SystemExit('Invalid APPLE_TEAM_ID')
    if data['Entitlements'].get('application-identifier') != expected:
        raise SystemExit('Provisioning profile must match APPLE_TEAM_ID and com.zzxap.chinesechess')
    destination = Path.home() / 'Library/MobileDevice/Provisioning Profiles' / (uuid + '.mobileprovision')
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_bytes(raw.read_bytes())
    (temp / 'chinesechess-profile-path.txt').write_text(str(destination))
    project = Path('ios/ChineseChess.xcodeproj/project.pbxproj')
    settings = ('PRODUCT_BUNDLE_IDENTIFIER = com.zzxap.chinesechess;\n'
                f'                DEVELOPMENT_TEAM = {team};\n'
                '                CODE_SIGN_STYLE = Manual;\n'
                '                CODE_SIGN_IDENTITY = "Apple Distribution";\n'
                f'                PROVISIONING_PROFILE_SPECIFIER = "{uuid}";')
    project.write_text(project.read_text().replace('PRODUCT_BUNDLE_IDENTIFIER = com.zzxap.chinesechess;', settings))
    with (temp / 'ExportOptions.plist').open('wb') as f:
        plistlib.dump({'method': 'app-store-connect', 'teamID': team, 'signingStyle': 'manual',
                      'provisioningProfiles': {'com.zzxap.chinesechess': uuid},
                      'manageAppVersionAndBuildNumber': False}, f)
Path(os.environ['GITHUB_ENV']).open('a').write('APPLE_SIGNED=true\n')
