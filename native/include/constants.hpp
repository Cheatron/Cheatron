#pragma once

#include <napi.h>

namespace Constants {
    /**
     * Initialize Constants namespace and export to NAPI
     */
    void Init(Napi::Env env, Napi::Object exports);
}
