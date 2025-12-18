#include "log.hpp"
#include <vector>
#include <mutex>
#include <cstdio>
#include <memory>
#include <cstdarg>
#include <string>

// Include Neptune log headers to implement the C API
extern "C" {
    #include <log.h>
}

namespace NativeLog {

// Thread-safe function to call back into JS
static Napi::ThreadSafeFunction g_tsfn;
static std::mutex g_mutex;

struct LogMessage {
    Level level;
    std::string message;
};

// Helper to convert Level to string
static std::string LevelToString(Level level) {
    switch (level) {
        case Level::Debug: return "debug";
        case Level::Info:  return "info";
        case Level::Warn:  return "warn";
        case Level::Error: return "error";
        default:           return "info";
    }
}

// Helper to format string dynamically
std::string FormatV(const char* fmt, va_list args) {
    if (!fmt) return "";
    
    va_list args_copy;
    va_copy(args_copy, args);
    int len = vsnprintf(nullptr, 0, fmt, args_copy);
    va_end(args_copy);
    
    if (len < 0) return "";
    
    std::string result(len, '\0');
    // accessible via &result[0], standard guarantees contiguous storage since C++11
    vsnprintf(&result[0], len + 1, fmt, args); 
    
    return result;
}

// Internal helper to queue message
void QueueLogMessage(Level level, const std::string& message) {
    if (!g_tsfn) return;

    auto callbackData = new LogMessage{level, message};

    napi_status status = g_tsfn.NonBlockingCall(callbackData, [](Napi::Env env, Napi::Function jsCallback, LogMessage* data) {
        Napi::String logLevel = Napi::String::New(env, LevelToString(data->level));
        Napi::String logMsg = Napi::String::New(env, data->message);
        jsCallback.Call({ logLevel, logMsg });
        delete data;
    });

    if (status != napi_ok) {
        delete callbackData;
    }
}

void SetCallback(Napi::Env env, Napi::Function callback) {
    std::lock_guard<std::mutex> lock(g_mutex);
    if (g_tsfn) {
        g_tsfn.Release();
    }
    g_tsfn = Napi::ThreadSafeFunction::New(
        env,
        callback,
        "NativeLogCallback",
        0,
        1
    );
    g_tsfn.Unref(env);
}

void Log(Level level, const char* fmt, ...) {
    va_list args;
    va_start(args, fmt);
    std::string msg = FormatV(fmt, args);
    va_end(args);
    QueueLogMessage(level, msg);
}

} // namespace NativeLog


// ==========================================
// C API Implementation (Overrides neptune/src/log.c)
// ==========================================

extern "C" {

LOG_API nerror_t log_init() {
    return N_OK;
}

LOG_API void log_destroy() {
}

LOG_API void log_set_color(color_t color) {
}

LOG_API nerror_t log_reg_file_ex(nfile_t file, log_file_flags_t file_flags) {
    return N_OK;
}

LOG_API nerror_t log_reg_file(nfile_path_t path) {
    return N_OK;
}

LOG_API bool log_can_out() {
    return true;
}

LOG_API nerror_t log_log_v(color_t color, const char *type, const char *format, va_list list) {
    // Determine level from type string
    NativeLog::Level level = NativeLog::Level::Info;
    if (type) {
        std::string typeStr(type);
        if (typeStr.find("ERROR") != std::string::npos) level = NativeLog::Level::Error;
        else if (typeStr.find("WARN") != std::string::npos) level = NativeLog::Level::Warn;
        else if (typeStr.find("DEBUG") != std::string::npos) level = NativeLog::Level::Debug;
    }

    std::string msg = NativeLog::FormatV(format, list);
    NativeLog::QueueLogMessage(level, msg);
    return N_OK;
}

LOG_API nerror_t log_log(color_t color, const char *type, const char *format, ...) {
    va_list list;
    va_start(list, format);
    nerror_t res = log_log_v(color, type, format, list);
    va_end(list);
    return res;
}

LOG_API nerror_t log_info(const char *format, ...) {
    va_list list;
    va_start(list, format);
    std::string msg = NativeLog::FormatV(format, list);
    va_end(list);
    
    NativeLog::QueueLogMessage(NativeLog::Level::Info, msg);
    return N_OK;
}

LOG_API nerror_t log_warn(const char *format, ...) {
    va_list list;
    va_start(list, format);
    std::string msg = NativeLog::FormatV(format, list);
    va_end(list);
    
    NativeLog::QueueLogMessage(NativeLog::Level::Warn, msg);
    return N_OK;
}

LOG_API nerror_t log_error(const char *format, ...) {
    va_list list;
    va_start(list, format);
    std::string msg = NativeLog::FormatV(format, list);
    va_end(list);
    
    NativeLog::QueueLogMessage(NativeLog::Level::Error, msg);
    return N_OK;
}

} // extern "C"
