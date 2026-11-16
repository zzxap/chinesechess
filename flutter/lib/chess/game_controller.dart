import 'dart:async';
import 'package:flutter/foundation.dart';
import '../ai/ai_engine.dart';
import 'position.dart';

class GameController extends ChangeNotifier {
  final AiEngine _engine=AiEngine();
  final List<Position> _history=[Position.initial()];
  List<Move> _legal=Position.initial().legalMoves();
  int? selected;
  bool flipped=false,computer=false,thinking=false;
  bool _active=false,_disposed=false;
  int _revision=0;
  String message='';
  AiAnswer? answer;
  Move? hint;
  Position get position=>_history.last;
  int get ply=>_history.length-1;
  bool get ended=>_legal.isEmpty;
  List<int> get targets=>_legal.where((m)=>m.from==selected).map((m)=>m.to).toList();
  bool get checked=>position.inCheck(position.turn);
  Future<void> start() => analyze();
  void select(int index) {
    if (ended || (computer && position.turn==Side.black)) return;
    if (position.board[index]?.side==position.turn) {
      selected=selected==index ? null : index; message=''; notifyListeners();return;
    }
    if (selected==null) return;
    final move=Move(selected!,index);
    if (_legal.contains(move)) { play(move); }
    else { message='此处不可落子，请留意蹩马腿、塞象眼和将帅安全。';notifyListeners(); }
  }
  void play(Move move) {
    if (!_legal.contains(move)) return;
    _history.add(position.play(move)); selected=null; message='';
    _refresh();
  }
  void _refresh() {
    _revision++; answer=null;hint=null;
    _legal=position.legalMoves();
    notifyListeners();unawaited(analyze());
  }
  void undo() {
    if (ply==0) return;
    final count=computer && position.turn==Side.red && ply>=2 ? 2 : 1;
    _history.removeRange(_history.length-count,_history.length);
    selected=null;message='';_refresh();
  }
  void reset() { _history..clear()..add(Position.initial());selected=null;message='';_refresh(); }
  void flip() { flipped=!flipped;notifyListeners(); }
  void toggleComputer() { computer=!computer;selected=null;_revision++;answer=null;hint=null;notifyListeners();unawaited(analyze()); }
  Future<void> analyze() async {
    if (_disposed) return;
    if (ended) { thinking=false;notifyListeners();return; }
    // Only one native search is active; rapid input coalesces to the latest FEN.
    if (_active) return;
    final revision=_revision, fen=position.fen;
    _active=true;thinking=true;answer=null;hint=null;message='';notifyListeners();
    try {
      final result=await _engine.analyze(fen);
      if (_disposed || revision!=_revision) return;
      final move=Move.parse(result.move);
      if (result.fen!=position.fen || move==null || !_legal.contains(move)) {
        throw StateError('AI 未返回当前局面的合法着法');
      }
      answer=result;hint=move;
      if (computer && position.turn==Side.black) { play(move); }
    } catch (error) {
      if (!_disposed && revision==_revision) message=error.toString().replaceFirst('Bad state: ','');
    } finally {
      _active=false;
      if (!_disposed) {
        thinking=false;notifyListeners();
        if (revision!=_revision && !ended) unawaited(analyze());
      }
    }
  }
  @override
  void dispose() { _disposed=true;_revision++;unawaited(_engine.dispose());super.dispose(); }
}
