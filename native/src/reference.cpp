#include "reference.hpp"

// Static constructor reference
Napi::FunctionReference Reference::constructor;

/**
 * Initialize Reference class for NAPI
 */
void Reference::Init(Napi::Env env, Napi::Object exports) {
    Napi::Function func = DefineClass(env, "Reference", {
        InstanceMethod("getAddress", &Reference::GetAddress),
        InstanceMethod("isValid", &Reference::IsValid),
        InstanceMethod("release", &Reference::Release),
    });
    
    // Store constructor for later use in Create()
    constructor = Napi::Persistent(func);
    
    exports.Set("Reference", func);
}

/**
 * Constructor - Can be called from JS with address
 */
Reference::Reference(const Napi::CallbackInfo& info) 
    : Napi::ObjectWrap<Reference>(info), ptr_(nullptr), valid_(false), deleter_(nullptr) {
    
    if (info.Length() > 0) {
        // Construct from Number
        if (info[0].IsNumber()) {
            uintptr_t addr = static_cast<uintptr_t>(info[0].As<Napi::Number>().DoubleValue());
            ptr_ = reinterpret_cast<void*>(addr);
            valid_ = true;
        } 
        // Construct from BigInt
        else if (info[0].IsBigInt()) {
            bool lossless;
            uint64_t addr = info[0].As<Napi::BigInt>().Uint64Value(&lossless);
            ptr_ = reinterpret_cast<void*>(static_cast<uintptr_t>(addr));
            valid_ = true;
        }
        // Construct from String (hex)
        else if (info[0].IsString()) {
            std::string addrStr = info[0].As<Napi::String>().Utf8Value();
            unsigned long long addr = 0;
            // Handle 0x prefix if present
            if (addrStr.find("0x") == 0 || addrStr.find("0X") == 0) {
                addr = std::stoull(addrStr, nullptr, 16);
            } else {
                addr = std::stoull(addrStr, nullptr, 10);
            }
            ptr_ = reinterpret_cast<void*>(static_cast<uintptr_t>(addr));
            valid_ = true;
        }
    }
}

/**
 * Destructor
 */
Reference::~Reference() {
    if (valid_ && deleter_) {
        deleter_(ptr_);
    }
    ptr_ = nullptr;
    valid_ = false;
    deleter_ = nullptr;
}

/**
 * Create - Static factory to create Reference from void pointer
 */
Napi::Object Reference::Create(Napi::Env env, void* ptr, std::function<void(void*)> deleter) {
    if (!ptr) {
        Napi::Error::New(env, "Cannot create Reference from null pointer").ThrowAsJavaScriptException();
        return Napi::Object::New(env);
    }
    
    // Create new instance via stored constructor
    Napi::Object obj = constructor.New({});
    
    Reference* ref = Napi::ObjectWrap<Reference>::Unwrap(obj);
    ref->ptr_ = ptr;
    ref->valid_ = true;
    ref->deleter_ = deleter;
    
    return obj;
}

/**
 * CreateWrapper - JS Static factory method
 */
Napi::Value Reference::CreateWrapper(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    if (info.Length() < 1) {
        Napi::TypeError::New(env, "Expected address argument").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    // Use the constructor logic via New()
    return constructor.New({ info[0] });
}

/**
 * getAddress() - Get memory address as string (hex)
 */
Napi::Value Reference::GetAddress(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    if (!valid_) {
        Napi::Error::New(env, "Reference is invalid or released").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    // Convert pointer to hex string
    char buffer[32];
    snprintf(buffer, sizeof(buffer), "0x%llx", (unsigned long long)ptr_);
    
    return Napi::String::New(env, buffer);
}

/**
 * isValid() - Check if reference is still valid
 */
Napi::Value Reference::IsValid(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    return Napi::Boolean::New(env, valid_);
}

/**
 * release() - Mark reference as invalid
 */
void Reference::Release(const Napi::CallbackInfo& info) {
    if (valid_ && deleter_) {
        deleter_(ptr_);
    }
    valid_ = false;
    ptr_ = nullptr;
    deleter_ = nullptr;
}
