// SPDX-License-Identifier: GPL-3.0-or-later
#include "ai_engine.h"
#include "attacks.h"
#include "engine.h"
#include "misc.h"
#include "position.h"
#include "score.h"
#include "ucioption.h"
#include <algorithm>
#include <cstring>
#include <filesystem>
#include <memory>
#include <mutex>
#include <sstream>
#include <stdexcept>

namespace {
std::once_flag initialize;
void copy(char* to, size_t capacity, std::string_view from) {
    if (!to || !capacity) return;
    const auto n = std::min(capacity - 1, from.size());
    std::memcpy(to, from.data(), n);
    to[n] = 0;
}
void option(Stockfish::Engine& engine, const std::string& name, const std::string& value) {
    std::istringstream input("name " + name + " value " + value);
    engine.get_options().setoption(input);
}
}
struct pf_engine {
    std::mutex mutex;
    std::unique_ptr<Stockfish::Engine> engine;
    pf_result result{};
};

pf_engine* pf_create(const char* path, int threads, int hash, char* error, size_t size) {
    copy(error, size, "");
    try {
        if (!path || !*path || std::strchr(path, '\n') || std::strchr(path, '\r'))
            throw std::invalid_argument("Invalid NNUE path");
        auto file = Stockfish::path_from_utf8(path);
        if (!file.is_absolute() || !std::filesystem::is_regular_file(file))
            throw std::invalid_argument("NNUE file must exist at an absolute path");
        std::call_once(initialize, [] { Stockfish::Attacks::init(); Stockfish::Position::init(); });
        auto h = std::make_unique<pf_engine>();
        h->engine = std::make_unique<Stockfish::Engine>();
        auto& e = *h->engine;
        e.set_on_start([] {});
        e.set_on_iter([](const auto&) {});
        e.set_on_verify_network([](auto) {});
        auto update = [p = h.get()](const Stockfish::Engine::InfoShort& info) {
            p->result.depth = info.depth;
            p->result.score_cp = 0;
            p->result.mate_plies = 0;
            p->result.score_kind = info.score.is<Stockfish::Score::Mate>() ? 1 : 0;
            if (info.score.is<Stockfish::Score::Mate>())
                p->result.mate_plies = info.score.get<Stockfish::Score::Mate>().plies;
            else p->result.score_cp = info.score.get<Stockfish::Score::InternalUnits>().value;
        };
        e.set_on_update_no_moves([update](const auto& info) { update(info); });
        e.set_on_update_full([p = h.get(), update](const auto& info) {
            update(info);
            p->result.nodes = info.nodes;
            copy(p->result.pv, sizeof(p->result.pv), info.pv);
        });
        e.set_on_bestmove([p = h.get()](auto best, auto ponder) {
            copy(p->result.bestmove, sizeof(p->result.bestmove), best);
            copy(p->result.ponder, sizeof(p->result.ponder), ponder);
        });
        option(e, "NumaPolicy", "none");
        option(e, "Threads", std::to_string(std::clamp(threads, 1, 8)));
        option(e, "Hash", std::to_string(std::clamp(hash, 16, 512)));
        option(e, "MultiPV", "1");
        option(e, "EvalFile", path);
        e.verify_network();
        return h.release();
    } catch (const std::exception& ex) { copy(error, size, ex.what()); }
      catch (...) { copy(error, size, "AI library initialization failed"); }
    return nullptr;
}
int pf_analyze(pf_engine* h, const char* fen, int time, pf_result* result, char* error, size_t size) {
    copy(error, size, "");
    if (result) *result = {};
    if (!h || !fen || !result || std::strlen(fen) > 1024 || std::strchr(fen, '\n') || std::strchr(fen, '\r')) {
        copy(error, size, "Invalid analysis arguments"); return -1;
    }
    std::unique_lock<std::mutex> lock(h->mutex, std::try_to_lock);
    if (!lock.owns_lock()) { copy(error, size, "Engine busy"); return -2; }
    try {
        h->engine->search_clear();
        if (h->engine->set_position(fen, {})) throw std::invalid_argument("Invalid Xiangqi FEN");
        h->result = {};
        h->result.abi_version = 1;
        Stockfish::Search::LimitsType limits;
        limits.startTime = Stockfish::now();
        limits.movetime = std::clamp(time, 1, 60000);
        h->engine->go(limits);
        h->engine->wait_for_search_finished();
        *result = h->result;
        return 0;
    } catch (const std::exception& ex) { copy(error, size, ex.what()); }
      catch (...) { copy(error, size, "AI library analysis failed"); }
    return -1;
}
void pf_stop(pf_engine* h) { if (h) h->engine->stop(); }
void pf_destroy(pf_engine* h) { delete h; }
