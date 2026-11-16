enum Side {
  red,
  black;

  Side get opposite => this == Side.red ? Side.black : Side.red;
  String get label => this == Side.red ? '红方' : '黑方';
}

enum Kind { king, advisor, elephant, horse, rook, cannon, pawn }

class Piece {
  const Piece(this.side, this.kind);
  final Side side;
  final Kind kind;
  String get label => (side == Side.red
      ? ['帥', '仕', '相', '馬', '車', '炮', '兵']
      : ['將', '士', '象', '馬', '車', '砲', '卒'])[kind.index];
  String get asset => 'assets/chess/pieces/${side.name}-${kind.name}.png';
}

class Move {
  const Move(this.from, this.to);
  final int from, to;
  @override
  bool operator ==(Object other) =>
      other is Move && from == other.from && to == other.to;
  @override
  int get hashCode => Object.hash(from, to);
  String get uci =>
      '${String.fromCharCode(97 + from % 9)}${9 - from ~/ 9}${String.fromCharCode(97 + to % 9)}${9 - to ~/ 9}';
  static Move? parse(String text) {
    if (!RegExp(r'^[a-i][0-9][a-i][0-9]$').hasMatch(text)) {
      return null;
    }
    return Move(
      (9 - int.parse(text[1])) * 9 + text.codeUnitAt(0) - 97,
      (9 - int.parse(text[3])) * 9 + text.codeUnitAt(2) - 97,
    );
  }
}

class Position {
  Position(List<Piece?> board, this.turn, [this.last])
    : board = List.unmodifiable(board);
  final List<Piece?> board;
  final Side turn;
  final Move? last;
  factory Position.initial() {
    final board = List<Piece?>.filled(90, null);
    const back = [
      Kind.rook,
      Kind.horse,
      Kind.elephant,
      Kind.advisor,
      Kind.king,
      Kind.advisor,
      Kind.elephant,
      Kind.horse,
      Kind.rook,
    ];
    for (final side in Side.values) {
      final row = side == Side.red ? 9 : 0;
      for (var x = 0; x < 9; x++) {
        board[row * 9 + x] = Piece(side, back[x]);
      }
      for (final x in [1, 7]) {
        board[(side == Side.red ? 7 : 2) * 9 + x] = Piece(side, Kind.cannon);
      }
      for (final x in [0, 2, 4, 6, 8]) {
        board[(side == Side.red ? 6 : 3) * 9 + x] = Piece(side, Kind.pawn);
      }
    }
    return Position(board, Side.red);
  }
  List<Piece?> _after(Move move) {
    final next = List<Piece?>.of(board);
    next[move.to] = next[move.from];
    next[move.from] = null;
    return next;
  }

  Position play(Move move) => Position(_after(move), turn.opposite, move);
  bool _inside(int x, int y) => x >= 0 && x < 9 && y >= 0 && y < 10;
  Iterable<int> _pseudo(int from) sync* {
    final piece = board[from];
    if (piece == null) {
      return;
    }
    final x = from % 9, y = from ~/ 9;
    bool accepts(int a, int b) =>
        _inside(a, b) && board[b * 9 + a]?.side != piece.side;
    bool palace(int a, int b) =>
        a >= 3 &&
        a <= 5 &&
        (piece.side == Side.red ? b >= 7 && b <= 9 : b >= 0 && b <= 2);
    const directions = [(1, 0), (-1, 0), (0, 1), (0, -1)];
    switch (piece.kind) {
      case Kind.rook:
      case Kind.cannon:
        for (final (dx, dy) in directions) {
          var screen = false;
          for (int a = x + dx, b = y + dy; _inside(a, b); a += dx, b += dy) {
            final target = board[b * 9 + a];
            if (!screen) {
              if (target == null) {
                yield b * 9 + a;
              } else if (piece.kind == Kind.rook) {
                if (target.side != piece.side) {
                  yield b * 9 + a;
                }
                break;
              } else {
                screen = true;
              }
            } else if (target != null) {
              if (target.side != piece.side) {
                yield b * 9 + a;
              }
              break;
            }
          }
        }
      case Kind.horse:
        for (final (dx, dy) in [
          (2, 1),
          (2, -1),
          (-2, 1),
          (-2, -1),
          (1, 2),
          (-1, 2),
          (1, -2),
          (-1, -2),
        ]) {
          if (!accepts(x + dx, y + dy)) {
            continue;
          }
          final leg = dx.abs() == 2
              ? y * 9 + x + dx ~/ 2
              : (y + dy ~/ 2) * 9 + x;
          if (board[leg] == null) {
            yield (y + dy) * 9 + x + dx;
          }
        }
      case Kind.elephant:
        for (final dx in [-2, 2]) {
          for (final dy in [-2, 2]) {
            final a = x + dx, b = y + dy;
            if (accepts(a, b) &&
                (piece.side == Side.red ? b >= 5 : b <= 4) &&
                board[(y + dy ~/ 2) * 9 + x + dx ~/ 2] == null) {
              yield b * 9 + a;
            }
          }
        }
      case Kind.advisor:
        for (final dx in [-1, 1]) {
          for (final dy in [-1, 1]) {
            if (palace(x + dx, y + dy) && accepts(x + dx, y + dy)) {
              yield (y + dy) * 9 + x + dx;
            }
          }
        }
      case Kind.king:
        for (final (dx, dy) in directions) {
          if (palace(x + dx, y + dy) && accepts(x + dx, y + dy)) {
            yield (y + dy) * 9 + x + dx;
          }
        }
        for (final dy in [-1, 1]) {
          for (var b = y + dy; _inside(x, b); b += dy) {
            final target = board[b * 9 + x];
            if (target != null) {
              if (target.kind == Kind.king && target.side != piece.side) {
                yield b * 9 + x;
              }
              break;
            }
          }
        }
      case Kind.pawn:
        final forward = piece.side == Side.red ? -1 : 1;
        if (accepts(x, y + forward)) {
          yield (y + forward) * 9 + x;
        }
        if (piece.side == Side.red ? y <= 4 : y >= 5) {
          for (final dx in [-1, 1]) {
            if (accepts(x + dx, y)) {
              yield y * 9 + x + dx;
            }
          }
        }
    }
  }

  bool inCheck(Side side) {
    final king = board.indexWhere(
      (p) => p?.side == side && p?.kind == Kind.king,
    );
    if (king < 0) {
      return true;
    }
    for (var from = 0; from < 90; from++) {
      if (board[from] != null &&
          board[from]!.side != side &&
          _pseudo(from).contains(king)) {
        return true;
      }
    }
    return false;
  }

  List<Move> legalMoves() {
    final moves = <Move>[];
    for (var from = 0; from < 90; from++) {
      if (board[from]?.side != turn) {
        continue;
      }
      for (final to in _pseudo(from)) {
        final move = Move(from, to);
        if (!Position(_after(move), turn).inCheck(turn)) {
          moves.add(move);
        }
      }
    }
    return moves;
  }

  String get fen {
    final ranks = <String>[];
    const codes = ['k', 'a', 'b', 'n', 'r', 'c', 'p'];
    for (var y = 0; y < 10; y++) {
      var empty = 0;
      final rank = StringBuffer();
      for (var x = 0; x < 9; x++) {
        final p = board[y * 9 + x];
        if (p == null) {
          empty++;
          continue;
        }
        if (empty > 0) {
          rank.write(empty);
          empty = 0;
        }
        final code = codes[p.kind.index];
        rank.write(p.side == Side.red ? code.toUpperCase() : code);
      }
      if (empty > 0) {
        rank.write(empty);
      }
      ranks.add(rank.toString());
    }
    return '${ranks.join('/')} ${turn == Side.red ? 'w' : 'b'} - - 0 1';
  }

  String describe(Move move) =>
      '${board[move.from]?.label ?? ''} ${move.from % 9 + 1}列${move.from ~/ 9 + 1}行 → ${move.to % 9 + 1}列${move.to ~/ 9 + 1}行';
}
