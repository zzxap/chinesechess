import os
from pathlib import Path
import subprocess

temp = Path(os.environ['RUNNER_TEMP'])
keychain = temp / 'chinesechess-signing.keychain-db'
if keychain.exists():
    subprocess.run(['security', 'delete-keychain', str(keychain)], capture_output=True)
record = temp / 'chinesechess-profile-path.txt'
if record.exists():
    path = Path(record.read_text())
    expected = Path.home() / 'Library/MobileDevice/Provisioning Profiles'
    if path.parent == expected: path.unlink(missing_ok=True)
for name in ['chinesechess-profile-path.txt', 'chinesechess-signing.p12',
             'chinesechess-profile.mobileprovision', 'ExportOptions.plist']:
    (temp / name).unlink(missing_ok=True)
