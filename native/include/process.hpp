#pragma once

#include <napi.h>
#include <cstdint>
#include <memory>
#include <windows.h>

// Forward declare Reference
class Reference;

/**
 * ProcessHandle - Internal wrapper for opened process
 * Uses RAII pattern with smart pointer for automatic cleanup
 */
struct ProcessHandle {
    HANDLE handle;
    DWORD pid;
    bool valid;
    
    ProcessHandle(HANDLE h, DWORD p) : handle(h), pid(p), valid(true) {}
    
    // Destructor - automatic cleanup
    ~ProcessHandle() {
        if (handle && handle != INVALID_HANDLE_VALUE) {
            CloseHandle(handle);
        }
        valid = false;
    }
};

/**
 * Process - NAPI helper functions for process operations
 * Returns Reference objects that wrap ProcessHandle pointers
 */
namespace Process {
    /**
     * Initialize Process namespace and export to NAPI
     */
    void Init(Napi::Env env, Napi::Object exports);
    
    /**
     * Get current process (GetCurrentProcess) and return as Reference
     */
    Napi::Value GetCurrentProcess(const Napi::CallbackInfo& info);
    
    /**
     * Open process by PID and return as Reference
     */
    Napi::Value OpenProcess(const Napi::CallbackInfo& info);
    
    /**
     * Read memory from process reference
     */
    Napi::Value ReadMemory(const Napi::CallbackInfo& info);
    
    /**
     * Write memory to process reference
     */
    Napi::Value WriteMemory(const Napi::CallbackInfo& info);

    /**
     * Query memory information (VirtualQueryEx)
     */
    Napi::Value QueryMemory(const Napi::CallbackInfo& info);
};
