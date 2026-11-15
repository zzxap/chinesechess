// SPDX-License-Identifier: GPL-3.0-or-later
#pragma once
#include "../include/ai_engine.h"
#include <mutex>
#include <sstream>
#include <stdexcept>
#include <string>

namespace chessai {
inline std::string quote(const std::string& value) {
  std::string out = "\"";
  for (unsigned char c : value) {
    if (c == '\\' || c == '"') { out += '\\'; out += static_cast<char>(c); }
    else if (c < 32) { throw std::invalid_argument("Invalid control character in AI result"); }
    else { out += static_cast<char>(c); }
  }
  return out + "\"";
}
class Session {
  std::mutex mutex;
  pf_engine* engine = nullptr;
 public:
  ~Session() { pf_destroy(engine); }
  std::string analyze(const std::string& fen, const std::string& model) {
    std::lock_guard<std::mutex> lock(mutex);
    char error[1024]{};
    if (!engine) engine = pf_create(model.c_str(), 2, 32, error, sizeof(error));
    if (!engine) throw std::runtime_error(error);
    pf_result result{};
    if (pf_analyze(engine, fen.c_str(), 1000, &result, error, sizeof(error)))
      throw std::runtime_error(error);
    std::ostringstream json;
    json << "{\"fen\":" << quote(fen) << ",\"move\":" << quote(result.bestmove)
         << ",\"depth\":" << result.depth << ",\"nodes\":" << result.nodes
         << ",\"score\":" << result.score_cp;
    if (result.score_kind == 1) json << ",\"mate\":" << result.mate_plies;
    json << ",\"pv\":[";
    std::istringstream pv(result.pv);
    std::string move;
    bool first = true;
    while (pv >> move) {
      if (!first) json << ',';
      first = false;
      json << quote(move);
    }
    json << "]}";
    return json.str();
  }
};
inline Session& session() { static Session instance; return instance; }
}
