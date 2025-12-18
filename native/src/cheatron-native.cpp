#include <ctime>
#include <napi.h>
#include <stdexcept>
#include <string>

#include <capstone/capstone.h>
#include <neptune.h>
#include <nhook.h>
#include <ntosutils.h>
#include <process.hpp>
#include <reference.hpp>

#include "capstone.hpp"
#include "constants.hpp"
#include "log.hpp"
#include "ntime.h"

#include <windows.h>

// Helper macros to stringify preprocessor definitions
#define STRINGIFY(x) #x
#define TOSTRING(x) STRINGIFY(x)

// Forward declarations
Napi::Value GetNativeVersion(const Napi::CallbackInfo &info);
Napi::Value InitializeWrapper(const Napi::CallbackInfo &info);

// ==========================================
// Initialization Status Tracking
// ==========================================

struct InitStatus {
  bool capstoneDone = false;
  bool neptuneDone = false;
  std::string lastError;
};

static InitStatus g_initStatus;
static bool g_neptuneInitialized = false;

extern "C" ntime_t ntime_get_unix(void) { return std::time(nullptr); }

/**
 * Initialize Neptune library
 * Throws: Error if Neptune initialization fails
 */
void InitNeptune() {
  try {
    // Prevent double initialization
    if (g_neptuneInitialized) {
      return;
    }

    nerror_t ret = neptune_init();
    if (HAS_ERR(ret)) {
      std::string error_msg = "[Neptune] Initialization failed with code: ";
      error_msg += std::to_string(ret);
      g_initStatus.lastError = error_msg;
      throw std::runtime_error(error_msg);
    }
    g_initStatus.neptuneDone = true;
    g_neptuneInitialized = true;
  } catch (const std::exception &e) {
    g_initStatus.lastError = std::string("[Neptune] Exception: ") + e.what();
    throw;
  }
}

/**
 * Cleanup Neptune library on module unload
 */
void CleanupNeptune() {
  if (g_neptuneInitialized) {
    try {
      neptune_destroy();
      g_neptuneInitialized = false;
    } catch (...) {
      // Silently ignore cleanup errors
    }
  }
}

/**
 * Get native module version from compile-time define
 */
Napi::Value GetNativeVersion(const Napi::CallbackInfo &info) {
  Napi::Env env = info.Env();
#ifdef VERSION
  return Napi::String::New(env, TOSTRING(VERSION));
#else
  return Napi::String::New(env, "1.0.0");
#endif
}

// ==========================================
// Module Initialization
// ==========================================

// Addon finalizer callback for cleanup - matches napi_finalize signature
void AddonUnloadCallback(napi_env env, void *data, void *hint) {
  CleanupNeptune();
}

/**
 * Trigger delayed initialization
 */
Napi::Value InitializeWrapper(const Napi::CallbackInfo &info) {
  Napi::Env env = info.Env();
  bool success = true;

  if (info.Length() < 1 || !info[0].IsFunction()) {
    Napi::TypeError::New(env, "Expected callback function")
        .ThrowAsJavaScriptException();
    return env.Null();
  }
  NativeLog::SetCallback(env, info[0].As<Napi::Function>());

  try {
    // Initialize Neptune
    InitNeptune();
  } catch (const std::exception &e) {
    success = false;
    // Check if g_initStatus.lastError is empty, if so set it
    if (g_initStatus.lastError.empty()) {
      g_initStatus.lastError = e.what();
    }
    Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
  }

  // Log status using Neptune's logging system (which now routes to JS)
  if (g_initStatus.neptuneDone) {
    // REQUESTED FEATURE: Allocate, log, and free memory to demonstrate native
    // heap usage
    void *testPtr = malloc(64);
    if (testPtr) {
      LOG_INFO("Allocated test memory at: %p", testPtr);
      free(testPtr);
    } else {
      LOG_ERROR("Failed to allocate test memory");
    }

    LOG_INFO("Cheatron native module initialized successfully");
  } else {
    if (!g_initStatus.neptuneDone) {
      LOG_ERROR("Neptune initialization incomplete");
      success = false;
    }
    if (!g_initStatus.lastError.empty()) {
      LOG_ERROR("Cheatron native module error: %s",
                g_initStatus.lastError.c_str());
    }
  }

  return Napi::Boolean::New(env, success);
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
  // Setup addon unload handler for cleanup - register finalizer on exports
  // object
  napi_ref ref;
  napi_add_finalizer(env, exports, nullptr, AddonUnloadCallback, nullptr, &ref);

  // Process operations
  Process::Init(env, exports);

  // Constants
  Constants::Init(env, exports);

  // Reference
  Reference::Init(env, exports);

  // Capstone
  Capstone::Init(env, exports);

  // Export functions
  exports.Set("getVersion", Napi::Function::New(env, GetNativeVersion));
  exports.Set("initialize", Napi::Function::New(env, InitializeWrapper));

  return exports;
}

NODE_API_MODULE(cheatron_native, Init)
