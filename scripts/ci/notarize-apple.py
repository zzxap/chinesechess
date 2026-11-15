"""Submit a signed distribution file without printing authentication arguments."""
import json
import os
from pathlib import Path
import subprocess
import sys


def main():
    artifact = Path(sys.argv[1]).resolve()
    if not artifact.is_file():
        raise ValueError('Notarization input file is missing')
    names = ('APPLE_ID', 'APPLE_APP_SPECIFIC_PASSWORD', 'APPLE_TEAM_ID')
    missing = [name for name in names if not os.environ.get(name)]
    if missing:
        raise ValueError('Add GitHub Actions Secrets: ' + ', '.join(missing))
    auth = ['--apple-id', os.environ['APPLE_ID'],
            '--password', os.environ['APPLE_APP_SPECIFIC_PASSWORD'],
            '--team-id', os.environ['APPLE_TEAM_ID']]

    def run(arguments):
        result = subprocess.run(['xcrun', 'notarytool', *arguments, *auth],
                                capture_output=True, text=True, timeout=2100)
        output = result.stdout if result.stdout.strip() else result.stderr
        for name in names:
            output = output.replace(os.environ[name], '[redacted]')
        return result.returncode, output

    code, output = run(['submit', str(artifact), '--wait', '--timeout', '30m',
                        '--output-format', 'json'])
    try:
        report = json.loads(output)
    except json.JSONDecodeError:
        # Only redacted tool output; never print subprocess arguments.
        raise ValueError('Apple notarization did not return JSON: ' + output[:4000]) from None
    submission = report.get('id')
    status = report.get('status', 'Unknown')
    print(f'Apple notarization: {artifact.name}: {status}; submission {submission}')
    if code or status != 'Accepted':
        if submission:
            _, details = run(['log', str(submission)])
            print(details[:12000], file=sys.stderr)
        raise ValueError('Apple notarization was not accepted; distribution stopped')


if __name__ == '__main__':
    try:
        main()
    except (ValueError, OSError, subprocess.SubprocessError) as error:
        # TimeoutExpired contains the command (including credentials).
        message = 'Apple notarization command failed or timed out' if isinstance(
            error, subprocess.SubprocessError) else str(error)
        print(f'::error::{message.replace(chr(10), "%0A")}', file=sys.stderr)
        sys.exit(1)
