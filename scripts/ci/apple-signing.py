"""Prepare a temporary signing keychain. Never print certificate/password data."""
import base64
from datetime import datetime, timezone
import hashlib
import json
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
identity = os.environ.get('MACOS_SIGN_IDENTITY', '') if platform == 'macos' else ''

def fail(message):
    annotation = message.replace('%', '%25').replace('\r', '%0D').replace('\n', '%0A')
    print('::error::' + annotation, flush=True)
    raise SystemExit(message)

def run(*args):
    # Suppress tool output; diagnostics contain command names, never arguments.
    r = subprocess.run(args, capture_output=True)
    if r.returncode:
        operation = f'security {args[1]}' if args[0] == 'security' else Path(args[0]).name
        fail(f'{operation} failed (exit {r.returncode}); check signing Secrets and certificate password')
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
    if platform == 'ios':
        # The P12 need not include its WWDR intermediate. Import Apple's public
        # G3 CA without changing trust settings, then let Security validate it.
        intermediate = temp / 'chinesechess-wwdr-g3.cer'
        run('curl', '--fail', '--silent', '--show-error', '--location', '--retry', '3',
            '--max-time', '60', '--output', str(intermediate),
            'https://www.apple.com/certificateauthority/AppleWWDRCAG3.cer')
        run('security', 'import', str(intermediate), '-k', str(keychain), '-t', 'cert')
    run('security', 'import', str(p12), '-P', password, '-t', 'cert', '-f', 'pkcs12', '-k', str(keychain), '-A')
    run('security', 'set-key-partition-list', '-S', 'apple-tool:,apple:', '-s', '-k', key_password, str(keychain))
    current = run('security', 'list-keychains', '-d', 'user').decode()
    keychains = re.findall(r'"([^"]+)"', current)
    run('security', 'list-keychains', '-d', 'user', '-s', str(keychain), *keychains)
finally:
    p12.unlink(missing_ok=True)

# A successful P12 import does not prove that it contains a usable private key.
# find-identity checks the certificate/private-key pair and certificate validity.
output = run('security', 'find-identity', '-v', '-p', 'codesigning', str(keychain)).decode()
identities = {fingerprint.upper(): name for fingerprint, name in
              re.findall(r'\b([0-9A-Fa-f]{40})\s+"([^"]+)"', output)}
if not identities:
    # Only public certificate metadata is reported; never export or print keys.
    diagnostic = run('security', 'find-identity', '-p', 'codesigning', str(keychain)).decode()
    reasons = sorted(set(re.findall(r'CSSMERR_[A-Z_]+', diagnostic)))
    certificates = run('security', 'find-certificate', '-a', '-p', str(keychain)).decode()
    for pem in re.findall(r'-----BEGIN CERTIFICATE-----.*?-----END CERTIFICATE-----', certificates, re.S):
        public = subprocess.run(['openssl', 'x509', '-noout', '-subject', '-issuer', '-dates'],
                                input=pem.encode(), capture_output=True)
        metadata = public.stdout.decode(errors='replace')
        if public.returncode == 0 and any(kind in metadata.split('\n', 1)[0] for kind in
                                          ('Distribution:', 'Development:', 'Developer ID Application:')):
            annotation = metadata.strip().replace('%', '%25').replace('\r', '%0D').replace('\n', '%0A')
            print('::notice::Imported public certificate: ' + annotation, flush=True)
    if reasons:
        fail('Imported signing identity failed validation: ' + ', '.join(reasons)
             + '. Check certificate validity and trust; export the current certificate/private key pair as P12.')
    fail(f'{prefix}_CERTIFICATE_BASE64 contains no valid code-signing identity with a private key. '
         'Export the certificate together with its private key as P12 from Keychain Access > My Certificates; '
         'also check certificate expiration and trust. A CER file alone is insufficient.')

if platform == 'ios':
    raw = temp / 'chinesechess-profile.mobileprovision'
    raw.write_bytes(base64.b64decode(''.join(profile.split()), validate=True))
    raw.chmod(0o600)
    data = plistlib.loads(run('security', 'cms', '-D', '-i', str(raw)))
    uuid = data['UUID']
    if not re.fullmatch(r'[0-9A-Fa-f-]{36}', uuid): fail('Invalid provisioning UUID')
    if not re.fullmatch(r'[A-Z0-9]{10}', team): fail('Invalid APPLE_TEAM_ID')
    if team not in data.get('TeamIdentifier', []): fail('Provisioning profile belongs to a different APPLE_TEAM_ID')
    entitlements = data.get('Entitlements', {})
    identifiers = {prefix + '.com.zzxap.chinesechess' for prefix in data.get('ApplicationIdentifierPrefix', [])}
    if entitlements.get('application-identifier') not in identifiers:
        fail('Provisioning profile must match com.zzxap.chinesechess')
    expires = data.get('ExpirationDate')
    if not expires or expires.replace(tzinfo=timezone.utc) <= datetime.now(timezone.utc):
        fail('Provisioning profile has expired; replace the app-specific profile Secret')
    if entitlements.get('get-task-allow') or data.get('ProvisionedDevices') or data.get('ProvisionsAllDevices'):
        fail('Use an App Store distribution provisioning profile, not Development, Ad Hoc or Enterprise')
    allowed = {hashlib.sha1(cert).hexdigest().upper() for cert in data.get('DeveloperCertificates', [])}
    matches = [fingerprint for fingerprint, name in identities.items()
               if fingerprint in allowed and name.startswith(('Apple Distribution:', 'iPhone Distribution:'))]
    if not matches:
        fail('The imported iOS distribution certificate/private key does not match DeveloperCertificates '
             'in the provisioning profile. Export the matching distribution identity as P12, or regenerate '
             'the profile using the imported distribution certificate, then update the corresponding Secrets.')
    fingerprint = sorted(matches)[0]
    destination = Path.home() / 'Library/MobileDevice/Provisioning Profiles' / (uuid + '.mobileprovision')
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_bytes(raw.read_bytes())
    (temp / 'chinesechess-profile-path.txt').write_text(str(destination))
    project = Path('ios/ChineseChess.xcodeproj/project.pbxproj')
    signing_flags = json.dumps('$(inherited) --keychain "' + str(keychain) + '"')
    settings = ('PRODUCT_BUNDLE_IDENTIFIER = com.zzxap.chinesechess;\n'
                f'                DEVELOPMENT_TEAM = {team};\n'
                '                CODE_SIGN_STYLE = Manual;\n'
                f'                CODE_SIGN_IDENTITY = "{fingerprint}";\n'
                f'                "CODE_SIGN_IDENTITY[sdk=iphoneos*]" = "{fingerprint}";\n'
                f'                OTHER_CODE_SIGN_FLAGS = {signing_flags};\n'
                f'                PROVISIONING_PROFILE_SPECIFIER = "{uuid}";')
    original = project.read_text()
    if original.count('PRODUCT_BUNDLE_IDENTIFIER = com.zzxap.chinesechess;') != 2:
        fail('Expected Debug and Release app signing settings; project layout changed')
    project.write_text(original.replace('PRODUCT_BUNDLE_IDENTIFIER = com.zzxap.chinesechess;', settings))
    with (temp / 'ExportOptions.plist').open('wb') as f:
        plistlib.dump({'method': 'app-store-connect', 'teamID': team, 'signingStyle': 'manual',
                      'signingCertificate': fingerprint,
                      'provisioningProfiles': {'com.zzxap.chinesechess': uuid},
                      'manageAppVersionAndBuildNumber': False}, f)
    print('iOS distribution identity has a valid private key and matches the provisioning profile.')
elif not identity.startswith('Developer ID Application:') or identity not in identities.values():
    fail('MACOS_SIGN_IDENTITY does not exactly match a valid Developer ID identity in the imported P12')
Path(os.environ['GITHUB_ENV']).open('a').write('APPLE_SIGNED=true\n')
