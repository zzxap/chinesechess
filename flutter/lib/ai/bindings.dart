// Bootstrap C ABI declarations for ai_engine.h.
// Replace this file with the ffigen output using: dart run ffigen --config ffigen.yaml
// The generator could not be executed inside the current restricted Dart VM.
// ignore_for_file: camel_case_types, non_constant_identifier_names
import 'dart:ffi' as ffi;

final class pf_engine extends ffi.Opaque {}
final class pf_result extends ffi.Struct {
  @ffi.Uint32()
  external int abi_version;
  @ffi.Int32()
  external int depth;
  @ffi.Int32()
  external int score_cp;
  @ffi.Int32()
  external int mate_plies;
  @ffi.Int32()
  external int score_kind;
  @ffi.Uint64()
  external int nodes;
  @ffi.Array(16)
  external ffi.Array<ffi.Char> bestmove;
  @ffi.Array(16)
  external ffi.Array<ffi.Char> ponder;
  @ffi.Array(1024)
  external ffi.Array<ffi.Char> pv;
}
class AiBindings {
  AiBindings(ffi.DynamicLibrary library)
    : pf_create=library.lookupFunction<ffi.Pointer<pf_engine> Function(ffi.Pointer<ffi.Char>,ffi.Int,ffi.Int,ffi.Pointer<ffi.Char>,ffi.Size),ffi.Pointer<pf_engine> Function(ffi.Pointer<ffi.Char>,int,int,ffi.Pointer<ffi.Char>,int)>('pf_create'),
      pf_analyze=library.lookupFunction<ffi.Int Function(ffi.Pointer<pf_engine>,ffi.Pointer<ffi.Char>,ffi.Int,ffi.Pointer<pf_result>,ffi.Pointer<ffi.Char>,ffi.Size),int Function(ffi.Pointer<pf_engine>,ffi.Pointer<ffi.Char>,int,ffi.Pointer<pf_result>,ffi.Pointer<ffi.Char>,int)>('pf_analyze'),
      pf_stop=library.lookupFunction<ffi.Void Function(ffi.Pointer<pf_engine>),void Function(ffi.Pointer<pf_engine>)>('pf_stop'),
      pf_destroy=library.lookupFunction<ffi.Void Function(ffi.Pointer<pf_engine>),void Function(ffi.Pointer<pf_engine>)>('pf_destroy');
  final ffi.Pointer<pf_engine> Function(ffi.Pointer<ffi.Char>,int,int,ffi.Pointer<ffi.Char>,int) pf_create;
  final int Function(ffi.Pointer<pf_engine>,ffi.Pointer<ffi.Char>,int,ffi.Pointer<pf_result>,ffi.Pointer<ffi.Char>,int) pf_analyze;
  final void Function(ffi.Pointer<pf_engine>) pf_stop;
  final void Function(ffi.Pointer<pf_engine>) pf_destroy;
}
