"""Publish a concise CI build failure annotation, without signing Secret values."""
from pathlib import Path
import os
import re
import sys

log = Path(sys.argv[1]).read_text(encoding='utf-8', errors='replace')
log = re.sub(r'\x1b\[[0-?]*[ -/]*[@-~]', '', log)
values = [value for name, value in os.environ.items()
          if value and name.startswith(('ANDROID_', 'IOS_', 'MACOS_'))
          and ('PASSWORD' in name or 'BASE64' in name or name.endswith('KEY_ALIAS'))]
for value in sorted(values, key=len, reverse=True):
    log = log.replace(value, '***')
lines = log.splitlines()
messages = []
for index, line in enumerate(lines):
    if '* What went wrong:' in line:
        for detail in lines[index + 1:index + 19]:
            if detail.startswith(('* Try:', '* Exception is:', '* Get more help')):
                break
            if detail.strip():
                messages.append(detail.strip())
causes = [line.strip() for line in lines if 'Caused by:' in line]
messages.extend(causes[-4:])
if not messages:
    messages = [line.strip() for line in lines if re.search(r'\berror\b|CMake Error|FAILURE:', line, re.I)][-8:]
messages = list(dict.fromkeys(messages))[:20]
text = '\n'.join(messages)[:8000] or 'Build failed; inspect the build step log for details.'
annotation = text.replace('%', '%25').replace('\r', '%0D').replace('\n', '%0A')
print('::error::' + annotation)
summary = os.environ.get('GITHUB_STEP_SUMMARY')
if summary:
    import html
    with Path(summary).open('a', encoding='utf-8') as output:
        output.write('\nBuild error details:\n<pre>' + html.escape(text) + '</pre>\n')
