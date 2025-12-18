#pragma once

#include <napi.h>
#include <string>
#include <cstdarg>

namespace NativeLog {

enum class Level {
    Debug,
    Info,
    Warn,
    Error
};

void SetCallback(Napi::Env env, Napi::Function callback);
void Log(Level level, const char* fmt, ...);

} // namespace NativeLog

// Macros for convenient logging
#define NATIVE_LOG_DEBUG(fmt, ...) NativeLog::Log(NativeLog::Level::Debug, fmt, ##__VA_ARGS__)
#define NATIVE_LOG_INFO(fmt, ...)  NativeLog::Log(NativeLog::Level::Info, fmt, ##__VA_ARGS__)
#define NATIVE_LOG_WARN(fmt, ...)  NativeLog::Log(NativeLog::Level::Warn, fmt, ##__VA_ARGS__)
#define NATIVE_LOG_ERROR(fmt, ...) NativeLog::Log(NativeLog::Level::Error, fmt, ##__VA_ARGS__)
