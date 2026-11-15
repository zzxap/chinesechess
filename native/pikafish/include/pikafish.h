/* SPDX-License-Identifier: GPL-3.0-or-later */
#ifndef CHINESECHESS_PIKAFISH_H
#define CHINESECHESS_PIKAFISH_H
#include <stddef.h>
#include <stdint.h>
#if defined(_WIN32) && defined(PF_SHARED)
# ifdef PF_BUILD
#  define PF_API __declspec(dllexport)
# else
#  define PF_API __declspec(dllimport)
# endif
#elif defined(_WIN32)
# define PF_API
#else
# define PF_API __attribute__((visibility("default")))
#endif
#ifdef __cplusplus
extern "C" {
#endif
typedef struct pf_engine pf_engine;
typedef struct pf_result {
    uint32_t abi_version;
    int32_t depth;
    int32_t score_cp; /* current side's perspective */
    int32_t mate_plies; /* signed distance */
    int32_t score_kind; /* 0: centipawns, 1: mate (including mate in 0) */
    uint64_t nodes;
    char bestmove[16]; /* UCI Xiangqi a0..i9; (none) on terminal positions */
    char ponder[16];
    char pv[1024];
} pf_result;
/* nnue_path must be an absolute UTF-8 filesystem path. Returns NULL on error.
 * One handle per game. Call analyze on a background thread, never the UI thread.
 * All operations are serialized per handle except stop, which may run concurrently.
 * Destroy only after analyze has returned. Error buffers may be NULL with size 0. */
PF_API pf_engine* pf_create(const char* nnue_path, int threads, int hash_mb,
                            char* error, size_t error_size);
/* Returns 0 on success, -1 on failure, -2 if already analyzing.
 * Every call clears search history and analyzes only the supplied FEN. */
PF_API int pf_analyze(pf_engine*, const char* fen, int movetime_ms,
                      pf_result*, char* error, size_t error_size);
PF_API void pf_stop(pf_engine*);
PF_API void pf_destroy(pf_engine*);
#ifdef __cplusplus
}
#endif
#endif
