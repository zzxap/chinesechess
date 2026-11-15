// SPDX-License-Identifier: GPL-3.0-or-later
#pragma once
#include <NativeModules.h>
#include <filesystem>
#include "../../native/ai-engine/bridge/session.hpp"

REACT_MODULE(ChessAI)
struct ChessAI {
  static winrt::fire_and_forget AnalyzeAsync(std::string fen,
      winrt::Microsoft::ReactNative::ReactPromise<std::string> promise) {
    co_await winrt::resume_background();
    try {
      std::wstring path(32768, L'\0');
      const DWORD count = GetModuleFileNameW(nullptr, path.data(), static_cast<DWORD>(path.size()));
      if (!count || count >= path.size()) throw std::runtime_error("Cannot locate bundled AI model");
      path.resize(count);
      auto model = std::filesystem::path(path).parent_path() / L"model.nnue";
      promise.Resolve(chessai::session().analyze(fen, winrt::to_string(model.wstring())));
    } catch (const std::exception& error) { promise.Reject(error.what()); }
    catch (...) { promise.Reject("AI analysis failed"); }
  }
  REACT_METHOD(analyze)
  void analyze(std::string fen, winrt::Microsoft::ReactNative::ReactPromise<std::string> promise) noexcept {
    if (fen.empty() || fen.size() > 1024) { promise.Reject("Invalid FEN"); return; }
    AnalyzeAsync(std::move(fen), std::move(promise));
  }
};
