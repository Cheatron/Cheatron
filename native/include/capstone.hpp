#pragma once

#include <napi.h>

namespace Capstone {
    /**
     * Initialize Capstone module exports
     */
    void Init(Napi::Env env, Napi::Object exports);

    /**
     * Open a new Capstone handle
     * Returns a Reference object wrapping the csh handle
     */
    Napi::Value Open(const Napi::CallbackInfo& info);
}
