#include "process.hpp"
#include "reference.hpp"
#include <ntosutils.h>
#include <cstring>

/**
 * Initialize Process namespace and export functions to NAPI
 */
void Process::Init(Napi::Env env, Napi::Object exports) {
    Napi::Object processObj = Napi::Object::New(env);
    
    // Process lifecycle
    processObj.Set("getCurrent", Napi::Function::New(env, Process::GetCurrentProcess));
    processObj.Set("open", Napi::Function::New(env, Process::OpenProcess));

    // Memory operations
    Napi::Object memoryObj = Napi::Object::New(env);
    memoryObj.Set("read", Napi::Function::New(env, Process::ReadMemory));
    memoryObj.Set("write", Napi::Function::New(env, Process::WriteMemory));
    memoryObj.Set("query", Napi::Function::New(env, Process::QueryMemory));
    
    processObj.Set("memory", memoryObj);
    
    exports.Set("process", processObj);
}

// Deleter for ProcessHandle
static void ProcessHandleDeleter(void* ptr) {
    if (ptr) {
        delete static_cast<ProcessHandle*>(ptr);
    }
}

/**
 * Process.currentProcess() - Get current process via GetCurrentProcess()
 * Returns: Reference wrapping current ProcessHandle pointer
 */
Napi::Value Process::GetCurrentProcess(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    // GetCurrentProcess() always succeeds and never returns NULL
    HANDLE handle = ::GetCurrentProcess();
    DWORD pid = GetCurrentProcessId();
    
    // Create ProcessHandle and wrap in Reference
    ProcessHandle* processHandle = new ProcessHandle(handle, pid);
    
    // Create Reference object containing the ProcessHandle pointer with deleter
    Napi::Object ref = Reference::Create(env, reinterpret_cast<void*>(processHandle), ProcessHandleDeleter);
    
    return ref;
}

/**
 * Process.open(pid) - Open process and return as Reference
 * Returns: Reference wrapping ProcessHandle pointer
 */
Napi::Value Process::OpenProcess(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    if (info.Length() < 1 || !info[0].IsNumber()) {
        Napi::TypeError::New(env, "Expected pid as number").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    DWORD pid = static_cast<DWORD>(info[0].As<Napi::Number>().DoubleValue());
    
    // Open process with necessary permissions
    HANDLE handle = ::OpenProcess(
        PROCESS_VM_READ | PROCESS_VM_WRITE | PROCESS_QUERY_INFORMATION,
        FALSE,
        pid
    );
    
    if (!handle || handle == INVALID_HANDLE_VALUE) {
        Napi::Error::New(env, "Failed to open process").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    // Create ProcessHandle and wrap in Reference
    ProcessHandle* processHandle = new ProcessHandle(handle, pid);
    
    // Create Reference object containing the ProcessHandle pointer with deleter
    Napi::Object ref = Reference::Create(env, reinterpret_cast<void*>(processHandle), ProcessHandleDeleter);
    
    return ref;
}

/**
 * Process.readMemory(reference, address, length) - Read from process memory
 * Returns: Buffer containing memory data
 */
Napi::Value Process::ReadMemory(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    if (info.Length() < 3) {
        Napi::TypeError::New(env, "Expected (reference, address, length)").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    // Get reference object
    if (!info[0].IsObject()) {
        Napi::TypeError::New(env, "First argument must be a Reference").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    Napi::Object refObj = info[0].As<Napi::Object>();
    Reference* ref = Napi::ObjectWrap<Reference>::Unwrap(refObj);
    
    if (!ref->IsValid()) {
        Napi::Error::New(env, "Reference is invalid").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    // Get ProcessHandle from reference
    ProcessHandle* processHandle = reinterpret_cast<ProcessHandle*>(ref->GetPointer());
    if (!processHandle || !processHandle->handle) {
        Napi::Error::New(env, "Invalid process handle").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    // Get address and length parameters
    if ((!info[1].IsNumber() && !info[1].IsBigInt()) || !info[2].IsNumber()) {
        Napi::TypeError::New(env, "Expected (reference, address: number|bigint, length: number)").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    uintptr_t address = 0;
    if (info[1].IsBigInt()) {
        bool lossless;
        address = static_cast<uintptr_t>(info[1].As<Napi::BigInt>().Uint64Value(&lossless));
    } else {
        address = static_cast<uintptr_t>(info[1].As<Napi::Number>().DoubleValue());
    }
    SIZE_T length = static_cast<SIZE_T>(info[2].As<Napi::Number>().Int32Value());
    
    if (length == 0 || length > 10 * 1024 * 1024) {  // Max 10MB
        Napi::Error::New(env, "Invalid read length (max 10MB)").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    // Allocate buffer
    uint8_t* buffer = new uint8_t[length];
    SIZE_T bytesRead = 0;
    
    BOOL success = ReadProcessMemory(
        processHandle->handle,
        reinterpret_cast<LPCVOID>(address),
        buffer,
        length,
        &bytesRead
    );
    
    if (!success) {
        delete[] buffer;
        Napi::Error::New(env, "Failed to read process memory").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    // Create NAPI Buffer from C++ buffer
    Napi::Buffer<uint8_t> result = Napi::Buffer<uint8_t>::Copy(env, buffer, bytesRead);
    delete[] buffer;
    
    return result;
}

/**
 * Process.writeMemory(reference, address, data) - Write to process memory
 * Returns: Number of bytes written
 */
Napi::Value Process::WriteMemory(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    if (info.Length() < 3) {
        Napi::TypeError::New(env, "Expected (reference, address, data)").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    // Get reference object
    if (!info[0].IsObject()) {
        Napi::TypeError::New(env, "First argument must be a Reference").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    Napi::Object refObj = info[0].As<Napi::Object>();
    Reference* ref = Napi::ObjectWrap<Reference>::Unwrap(refObj);
    
    if (!ref->IsValid()) {
        Napi::Error::New(env, "Reference is invalid").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    // Get ProcessHandle from reference
    ProcessHandle* processHandle = reinterpret_cast<ProcessHandle*>(ref->GetPointer());
    if (!processHandle || !processHandle->handle) {
        Napi::Error::New(env, "Invalid process handle").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    // Get address and data parameters
    if ((!info[1].IsNumber() && !info[1].IsBigInt()) || !info[2].IsBuffer()) {
        Napi::TypeError::New(env, "Expected (reference, address: number|bigint, data: Buffer)").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    uintptr_t address = 0;
    if (info[1].IsBigInt()) {
        bool lossless;
        address = static_cast<uintptr_t>(info[1].As<Napi::BigInt>().Uint64Value(&lossless));
    } else {
        address = static_cast<uintptr_t>(info[1].As<Napi::Number>().DoubleValue());
    }
    Napi::Buffer<uint8_t> data = info[2].As<Napi::Buffer<uint8_t>>();
    
    SIZE_T bytesWritten = 0;
    
    BOOL success = WriteProcessMemory(
        processHandle->handle,
        reinterpret_cast<LPVOID>(address),
        data.Data(),
        data.Length(),
        &bytesWritten
    );
    
    if (!success) {
        Napi::Error::New(env, "Failed to write process memory").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    return Napi::Number::New(env, static_cast<double>(bytesWritten));
}

// Helper to convert Memory State to string
static std::string StateToString(DWORD state) {
    if (state == MEM_COMMIT) return "committed";
    if (state == MEM_RESERVE) return "reserved";
    if (state == MEM_FREE) return "free";
    return "unknown";
}

// Helper to convert Memory Type to string
static std::string TypeToString(DWORD type) {
    if (type == MEM_PRIVATE) return "private";
    if (type == MEM_MAPPED) return "mapped";
    if (type == MEM_IMAGE) return "image";
    return "unknown";
}

// Helper to convert Memory Protection to string
static std::string ProtectionToString(DWORD protect) {
    if (protect & PAGE_NOACCESS) return "no_access";
    if (protect & PAGE_READONLY) return "readonly";
    if (protect & PAGE_READWRITE) return "readwrite";
    if (protect & PAGE_WRITECOPY) return "writecopy";
    if (protect & PAGE_EXECUTE) return "execute";
    if (protect & PAGE_EXECUTE_READ) return "execute_read";
    if (protect & PAGE_EXECUTE_READWRITE) return "execute_readwrite";
    if (protect & PAGE_EXECUTE_WRITECOPY) return "execute_writecopy";
    if (protect & PAGE_GUARD) return "guard";
    if (protect & PAGE_NOCACHE) return "nocache";
    if (protect & PAGE_WRITECOMBINE) return "writecombine";
    return "unknown";
}

/**
 * Process.memory.query(reference, address) - Query memory information
 * Returns: Array of objects { base, size, protection, state, type }
 */
Napi::Value Process::QueryMemory(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    if (info.Length() < 2) {
        Napi::TypeError::New(env, "Expected (reference, address)").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    // Get reference object
    if (!info[0].IsObject()) {
        Napi::TypeError::New(env, "First argument must be a Reference").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    Napi::Object refObj = info[0].As<Napi::Object>();
    Reference* ref = Napi::ObjectWrap<Reference>::Unwrap(refObj);
    
    if (!ref->IsValid()) {
        Napi::Error::New(env, "Reference is invalid").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    // Get ProcessHandle from reference
    ProcessHandle* processHandle = reinterpret_cast<ProcessHandle*>(ref->GetPointer());
    if (!processHandle || !processHandle->handle) {
        Napi::Error::New(env, "Invalid process handle").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    // Get address parameter
    if (!info[1].IsNumber() && !info[1].IsBigInt()) {
        Napi::TypeError::New(env, "Expected (reference, address: number|bigint)").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    uintptr_t address = 0;
    if (info[1].IsBigInt()) {
        bool lossless;
        address = static_cast<uintptr_t>(info[1].As<Napi::BigInt>().Uint64Value(&lossless));
    } else {
        address = static_cast<uintptr_t>(info[1].As<Napi::Number>().DoubleValue());
    }
    
    MEMORY_BASIC_INFORMATION mbi = { 0 };
    if (VirtualQueryEx(processHandle->handle, reinterpret_cast<LPCVOID>(address), &mbi, sizeof(mbi)) == 0) {
        // Return empty array if query fails (e.g. invalid address)
        return Napi::Array::New(env, 0);
    }
    
    Napi::Object region = Napi::Object::New(env);
    region.Set("base", Napi::BigInt::New(env, (uint64_t)mbi.BaseAddress));
    region.Set("size", Napi::BigInt::New(env, (uint64_t)mbi.RegionSize));
    region.Set("state", Napi::String::New(env, StateToString(mbi.State)));
    region.Set("protection", Napi::Number::New(env, (double)mbi.Protect));
    region.Set("type", Napi::String::New(env, TypeToString(mbi.Type)));
    
    Napi::Array result = Napi::Array::New(env, 1);
    result.Set(static_cast<uint32_t>(0), region);
    
    return result;
}
