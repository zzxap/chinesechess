"""Stage pinned upstream sources; leave executable builds untouched."""
from pathlib import Path
import sys

source, output = map(Path, sys.argv[1:])
for path in source.rglob('*'):
    if not path.is_file() or path.suffix not in ('.h', '.cpp', '.S'):
        continue
    target = output / path.relative_to(source)
    target.parent.mkdir(parents=True, exist_ok=True)
    data = path.read_text(encoding='utf-8')
    if path.relative_to(source).as_posix() == 'nnue/network.cpp':
        assert data.count('exit(EXIT_FAILURE);') == 1
        data = '#include <stdexcept>\n' + data.replace(
            'exit(EXIT_FAILURE);', 'throw std::runtime_error("NNUE network could not be loaded or verified");')
    if path.relative_to(source).as_posix() == 'position.cpp':
        # MSVC's 128-bit integer class has no implicit conversion to bool.
        # Comparing with zero preserves the bitboard's nonempty semantics.
        original = 'bool kingAttacks = attackers & pieces(KING);'
        if data.count(original) != 1:
            raise SystemExit('AI source changed: expected one kingAttacks initialization')
        data = data.replace(original, 'bool kingAttacks = (attackers & pieces(KING)) != Bitboard(0);')
    if path.name == 'shm.h':
        # A library uses process-local fallback memory, suitable for app sandboxes.
        start = data.index('#if (defined(__linux__)')
        end = data.index('    #define USE_UNIX_SHM', start)
        data = data[:start] + '#if 0\n' + data[end:]
        marker = '#if defined(_WIN32)\n\ninline std::string GetLastErrorAsString'
        assert marker in data
        data = data.replace(marker, '#if 0\n\ninline std::string GetLastErrorAsString', 1)
    if not target.exists() or target.read_text(encoding='utf-8') != data:
        target.write_text(data, encoding='utf-8')
