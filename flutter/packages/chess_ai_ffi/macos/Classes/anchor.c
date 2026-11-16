/* SPDX-License-Identifier: GPL-3.0-or-later */
#include "ai_engine.h"
/* Undefined-symbol flags in the Pod force these public C entry points into
 * the final executable so DynamicLibrary.process() can find them. */
void chess_ai_ffi_anchor(void) {}
