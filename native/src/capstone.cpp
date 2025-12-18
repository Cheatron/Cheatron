#include "capstone.hpp"
#include <capstone/capstone.h>
#include "reference.hpp"
#include <string>

namespace Capstone {

    void CsCloseDeleter(void* ptr) {
        if (!ptr) return;
        
        csh handle = (csh)ptr;
        cs_close(&handle);
        // LOG_INFO("Capstone handle released via Reference deleter");
    }

    Napi::Value Open(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();

        if (info.Length() < 2 || !info[0].IsNumber() || !info[1].IsNumber()) {
            Napi::TypeError::New(env, "Expected (arch, mode) as numbers").ThrowAsJavaScriptException();
            return env.Null();
        }

        cs_arch arch = static_cast<cs_arch>(info[0].As<Napi::Number>().Int32Value());
        cs_mode mode = static_cast<cs_mode>(info[1].As<Napi::Number>().Int32Value());

        csh handle;
        cs_err err = cs_open(arch, mode, &handle);
        
        if (err != CS_ERR_OK) {
            std::string error_msg = "Capstone failed to open: ";
            error_msg += cs_strerror(err);
            Napi::Error::New(env, error_msg).ThrowAsJavaScriptException();
            return env.Null();
        }

        // Set detailed option on by default as requested in previous iterations
        cs_option(handle, CS_OPT_DETAIL, CS_OPT_ON);

        // Create Reference object wrapping the handle with custom deleter
        return Reference::Create(env, (void*)handle, CsCloseDeleter);
    }

    void Init(Napi::Env env, Napi::Object exports) {
        Napi::Object cs = Napi::Object::New(env);
        cs.Set("open", Napi::Function::New(env, Open));
        // No global close needed anymore, use reference.release()
        
        exports.Set("cs", cs);
    }
}
