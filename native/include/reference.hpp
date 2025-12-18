#pragma once

#include <napi.h>
#include <unordered_map>
#include <memory>
#include <cstdint>
#include <functional>

/**
 * Reference - NAPI wrapper for holding native C++ pointers
 * Allows JS to safely hold and pass around void* pointers managed by native code
 */
class Reference : public Napi::ObjectWrap<Reference> {
public:
    static void Init(Napi::Env env, Napi::Object exports);
    Reference(const Napi::CallbackInfo& info);
    ~Reference();

    // Static factory - create reference from void pointer with optional deleter
    static Napi::Object Create(Napi::Env env, void* ptr, std::function<void(void*)> deleter = nullptr);
    
    // Get the underlying pointer
    void* GetPointer() const { return ptr_; }
    
    // Check if reference is valid (internal use)
    bool IsValid() const { return valid_; }
    
    // Instance methods
    Napi::Value GetAddress(const Napi::CallbackInfo& info);
    Napi::Value IsValid(const Napi::CallbackInfo& info);
    void Release(const Napi::CallbackInfo& info);

    // JS Static Factory
    static Napi::Value CreateWrapper(const Napi::CallbackInfo& info);

private:
    void* ptr_;
    bool valid_;
    std::function<void(void*)> deleter_; // Custom deleter
    
    // Static constructor reference
    static Napi::FunctionReference constructor;
};
