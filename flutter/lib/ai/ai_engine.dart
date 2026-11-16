import 'dart:async';
import 'dart:convert';
import 'dart:ffi';
import 'dart:io';
import 'dart:isolate';
import 'package:crypto/crypto.dart';
import 'package:ffi/ffi.dart';
import 'package:flutter/services.dart';
import 'package:path_provider/path_provider.dart';
import 'bindings.dart';

class AiAnswer {
  const AiAnswer({required this.fen,required this.move,required this.depth,required this.score,required this.nodes,required this.pv,this.mate});
  final String fen,move;
  final int depth,score,nodes;
  final List<String> pv;
  final int? mate;
}
class AiEngine {
  Isolate? _isolate;
  SendPort? _commands;
  final ReceivePort _responses=ReceivePort();
  final Map<int,Completer<AiAnswer>> _pending={};
  final Completer<void> _ready=Completer<void>();
  final Completer<void> _closed=Completer<void>();
  bool _disposing=false;
  int _sequence=0;
  Future<void>? _opening;
  static const _modelHash='7d13d73569a9b571ba0eb20cf1596247bc2a42738967e61afef6482b231e900e';
  Future<void> open() => _opening ??= _open();
  Future<void> _open() async {
    // Read Flutter assets and platform paths on the main isolate, before FFI.
    final directory=await getApplicationSupportDirectory();
    await directory.create(recursive:true);
    final model=File('${directory.path}/ai-$_modelHash.nnue');
    if (!await model.exists()) {
      final data=await rootBundle.load('assets/ai/model.nnue');
      final bytes=data.buffer.asUint8List(data.offsetInBytes,data.lengthInBytes);
      if (sha256.convert(bytes).toString()!=_modelHash) { throw StateError('AI 模型校验失败'); }
      final temporary=File('${model.path}.tmp');
      await temporary.writeAsBytes(bytes,flush:true);
      await temporary.rename(model.path);
    }
    _responses.listen((dynamic message) {
      final map=message as Map;
      if (map['type']=='ready') {
        _commands=map['port'] as SendPort;
        if (!_ready.isCompleted) { _ready.complete(); }
      } else if (map['type']=='closed') {
        if (!_closed.isCompleted) { _closed.complete(); }
      } else if (map['id']==null) {
        if (!_ready.isCompleted) { _ready.completeError(StateError(map['error'] as String)); }
      } else {
        final completer=_pending.remove(map['id']);
        if (completer==null) { return; }
        if (map['error']!=null) { completer.completeError(StateError(map['error'] as String)); return; }
        completer.complete(AiAnswer(fen:map['fen'] as String,move:map['move'] as String,
          depth:map['depth'] as int,score:map['score'] as int,nodes:map['nodes'] as int,
          mate:map['mate'] as int?,pv:(map['pv'] as List).cast<String>()));
      }
    });
    _isolate=await Isolate.spawn(_worker,[_responses.sendPort,model.path]);
    await _ready.future.timeout(const Duration(seconds:30));
    if (_disposing) { _commands?.send({'type':'close'}); }
  }
  Future<AiAnswer> analyze(String fen,{int milliseconds=1000}) async {
    if (_disposing) { throw StateError('AI 已关闭'); }
    await open();
    if (_disposing) { throw StateError('AI 已关闭'); }
    final id=++_sequence, completer=Completer<AiAnswer>();
    _pending[id]=completer;
    _commands!.send({'id':id,'fen':fen,'time':milliseconds.clamp(100,5000)});
    return completer.future;
  }
  Future<void> dispose() async {
    if (_disposing) { return; }
    _disposing=true;
    if (_opening!=null) {
      try { await _opening; } catch (_) { /* Initialization failed before an engine was created. */ }
    }
    if (_commands!=null) {
      _commands!.send({'type':'close'});
      try { await _closed.future.timeout(const Duration(seconds:10)); }
      on TimeoutException { _isolate?.kill(priority:Isolate.immediate); }
    } else { _isolate?.kill(priority:Isolate.immediate); }
    for (final pending in _pending.values) { pending.completeError(StateError('AI 已关闭')); }
    _pending.clear(); _responses.close();
  }
}

DynamicLibrary _library() {
  if (Platform.isIOS || Platform.isMacOS) { return DynamicLibrary.process(); }
  if (Platform.isAndroid) { return DynamicLibrary.open('libai_engine.so'); }
  if (Platform.isWindows) { return DynamicLibrary.open('${File(Platform.resolvedExecutable).parent.path}/ai_engine.dll'); }
  throw UnsupportedError('当前仅接入 Android、iOS、macOS 和 Windows');
}
String _arrayText(Array<Char> value,int maximum) {
  final bytes=<int>[];
  for (var i=0;i<maximum;i++) { final byte=value[i]&255; if (byte==0) { break; } bytes.add(byte); }
  return utf8.decode(bytes,allowMalformed:true);
}
void _worker(List<Object> startup) {
  final replies=startup[0] as SendPort;
  final modelPath=startup[1] as String;
  final port=ReceivePort();
  final error=calloc<Char>(1024);
  late final AiBindings api;
  Pointer<pf_engine> handle=nullptr;
  try {
    api=AiBindings(_library());
    final path=modelPath.toNativeUtf8(allocator:calloc).cast<Char>();
    try { handle=api.pf_create(path,2,32,error,1024); } finally { calloc.free(path); }
    if (handle==nullptr) { throw StateError(error.cast<Utf8>().toDartString()); }
  } catch (failure) {
    replies.send({'error':'AI库初始化失败：$failure'});
    calloc.free(error); port.close(); return;
  }
  final engine=api;
  replies.send({'type':'ready','port':port.sendPort});
  // FFI blocks only this dedicated isolate. Engine and pointers never cross ports.
  port.listen((dynamic input) {
    final message=input as Map;
    if (message['type']=='close') {
      engine.pf_destroy(handle); calloc.free(error); port.close();
      replies.send({'type':'closed'}); Isolate.exit();
    }
    final fen=message['fen'] as String;
    final nativeFen=fen.toNativeUtf8(allocator:calloc).cast<Char>();
    final output=calloc<pf_result>();
    try {
      final code=engine.pf_analyze(handle,nativeFen,message['time'] as int,output,error,1024);
      if (code!=0) { throw StateError(error.cast<Utf8>().toDartString()); }
      final result=output.ref;
      if (result.abi_version!=1) { throw StateError('AI库 ABI 版本不匹配'); }
      replies.send({'id':message['id'],'fen':fen,'move':_arrayText(result.bestmove,16),
        'depth':result.depth,'score':result.score_cp,'nodes':result.nodes,
        'mate':result.score_kind==1 ? result.mate_plies : null,
        'pv':_arrayText(result.pv,1024).split(' ').where((s)=>s.isNotEmpty).toList()});
    } catch (failure) { replies.send({'id':message['id'],'error':'AI 分析失败：$failure'}); }
    finally { calloc.free(nativeFen); calloc.free(output); }
  });
}
