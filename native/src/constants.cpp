#include "constants.hpp"
#include <capstone/capstone.h>
#include <windows.h>
#include <napi.h>
#include <winnt.h>

// Helper macro to add number constants
#define ADD_NUM_CONSTANT(name) constants.Set(#name, Napi::Number::New(env, name))

namespace Constants {
    Napi::Value GetConstants(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        Napi::Object constants = Napi::Object::New(env);

        // ==========================================
        // Windows Process / Memory Constants
        // ==========================================
        #ifdef _WIN32
        // Process Access Rights
        ADD_NUM_CONSTANT(PROCESS_QUERY_INFORMATION);
        ADD_NUM_CONSTANT(PROCESS_VM_OPERATION);
        ADD_NUM_CONSTANT(PROCESS_VM_READ);
        ADD_NUM_CONSTANT(PROCESS_VM_WRITE);
        ADD_NUM_CONSTANT(SYNCHRONIZE);
        ADD_NUM_CONSTANT(PROCESS_ALL_ACCESS);

        // Memory States
        ADD_NUM_CONSTANT(MEM_COMMIT);
        ADD_NUM_CONSTANT(MEM_RESERVE);
        ADD_NUM_CONSTANT(MEM_FREE);

        // Memory Protections
        ADD_NUM_CONSTANT(PAGE_NOACCESS);
        ADD_NUM_CONSTANT(PAGE_READONLY);
        ADD_NUM_CONSTANT(PAGE_READWRITE);
        ADD_NUM_CONSTANT(PAGE_WRITECOPY);
        ADD_NUM_CONSTANT(PAGE_EXECUTE);
        ADD_NUM_CONSTANT(PAGE_EXECUTE_READ);
        ADD_NUM_CONSTANT(PAGE_EXECUTE_READWRITE);
        ADD_NUM_CONSTANT(PAGE_EXECUTE_WRITECOPY);
        ADD_NUM_CONSTANT(PAGE_GUARD);
        ADD_NUM_CONSTANT(PAGE_NOCACHE);
        ADD_NUM_CONSTANT(PAGE_WRITECOMBINE);
        #endif

        // ==========================================
        // Capstone Constants
        // ==========================================
        
        // Architectures
        ADD_NUM_CONSTANT(CS_ARCH_X86);
        ADD_NUM_CONSTANT(CS_ARCH_ARM);
        ADD_NUM_CONSTANT(CS_ARCH_ARM64);

        // Modes
        ADD_NUM_CONSTANT(CS_MODE_32);
        ADD_NUM_CONSTANT(CS_MODE_64);
        ADD_NUM_CONSTANT(CS_MODE_ARM);
        ADD_NUM_CONSTANT(CS_MODE_THUMB);


        // Options
        ADD_NUM_CONSTANT(CS_OPT_DETAIL);
        ADD_NUM_CONSTANT(CS_OPT_ON);
        ADD_NUM_CONSTANT(CS_OPT_OFF);
        ADD_NUM_CONSTANT(CS_OPT_SYNTAX);
        ADD_NUM_CONSTANT(CS_OPT_SYNTAX_DEFAULT);
        ADD_NUM_CONSTANT(CS_OPT_SYNTAX_INTEL);
        ADD_NUM_CONSTANT(CS_OPT_SYNTAX_ATT);

        return constants;
    }

    void Init(Napi::Env env, Napi::Object exports) {
        // Evaluate the GetConstants function and export the result object directly as 'constants' property? 
        // Or export the function to be called?
        // The previous implementation exported a function 'getConstants'. 
        // Let's stick to exporting the function, but maybe better to just export the object if it's static?
        // For now, matching previous behavior: exports.constants.getConstants()
        
        exports.Set("getConstants", Napi::Function::New(env, GetConstants));
    }
}
