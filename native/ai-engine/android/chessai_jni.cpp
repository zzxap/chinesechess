// SPDX-License-Identifier: GPL-3.0-or-later
#include <jni.h>
#include "../bridge/session.hpp"
namespace {
struct Utf8 {
  JNIEnv* env;
  jstring input;
  const char* value;
  Utf8(JNIEnv* e, jstring s) : env(e), input(s), value(s ? e->GetStringUTFChars(s, nullptr) : nullptr) {}
  ~Utf8() { if (value) env->ReleaseStringUTFChars(input, value); }
};
}
extern "C" JNIEXPORT jstring JNICALL
Java_com_zzxap_chinesechess_ChessAIModule_analyzeNative(JNIEnv* env, jobject, jstring fen, jstring model) {
  try {
    Utf8 f(env, fen), m(env, model);
    if (!f.value || !m.value) return nullptr;
    // FEN/model filenames are ASCII. Android provides a UTF-8 private data path.
    auto result = chessai::session().analyze(f.value, m.value);
    return env->NewStringUTF(result.c_str());
  } catch (const std::exception& error) {
    env->ThrowNew(env->FindClass("java/lang/IllegalStateException"), error.what());
    return nullptr;
  }
}
