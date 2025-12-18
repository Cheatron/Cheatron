cmake_minimum_required(VERSION 3.15)
project(cheatron-native LANGUAGES C CXX ASM_NASM RC)

# Module version - read from package.json
file(READ "${CMAKE_CURRENT_SOURCE_DIR}/package.json" PKG_JSON)
string(JSON VERSION GET "${PKG_JSON}" version)

# Host configuration - read from environment if provided (prioritize ENV for these dynamic settings)
if(DEFINED ENV{TARGET_EXECUTABLE})
  set(TARGET_EXECUTABLE $ENV{TARGET_EXECUTABLE} CACHE STRING "Target executable (node, electron, bun)" FORCE)
endif()

if(NOT DEFINED TARGET_EXECUTABLE)
  set(TARGET_EXECUTABLE "node" CACHE STRING "Target executable (node, electron, bun)")
endif()

if(DEFINED ENV{ELECTRON_NODE_VERSION})
  set(ELECTRON_NODE_VERSION $ENV{ELECTRON_NODE_VERSION} CACHE STRING "Electron node version" FORCE)
endif()

if(NOT DEFINED ELECTRON_NODE_VERSION)
  set(ELECTRON_NODE_VERSION "22.21.1" CACHE STRING "Electron node version")
endif()

message(STATUS "TARGET_EXECUTABLE: ${TARGET_EXECUTABLE}")
message(STATUS "ELECTRON_NODE_VERSION: ${ELECTRON_NODE_VERSION}")

# Bun/Runtime headers and libraries setup
if(ELECTRON_NODE_VERSION)
  set(NODE_HEADERS_DIR "${CMAKE_CURRENT_SOURCE_DIR}/include/node")
  set(NODE_LIB_DIR "${CMAKE_CURRENT_SOURCE_DIR}/build")
  set(CONFIG_GYPI "${NODE_HEADERS_DIR}/config.gypi")
  
  # Download and extract Node.js headers if not present
  if(NOT EXISTS "${CONFIG_GYPI}")
    set(HEADERS_URL "https://nodejs.org/download/release/v${ELECTRON_NODE_VERSION}/node-v${ELECTRON_NODE_VERSION}-headers.tar.gz")
    set(HEADERS_ARCHIVE "${CMAKE_CURRENT_BINARY_DIR}/node-v${ELECTRON_NODE_VERSION}-headers.tar.gz")
    set(EXTRACT_DIR "${CMAKE_CURRENT_BINARY_DIR}/node-extract")
    
    # Download if not already cached
    if(NOT EXISTS "${HEADERS_ARCHIVE}")
      message(STATUS "Downloading runtime v${ELECTRON_NODE_VERSION} headers...")
      file(DOWNLOAD "${HEADERS_URL}" "${HEADERS_ARCHIVE}" SHOW_PROGRESS)
    else()
      message(STATUS "Using cached runtime v${ELECTRON_NODE_VERSION} headers from ${HEADERS_ARCHIVE}")
    endif()
    
    # Create extraction directory
    file(MAKE_DIRECTORY "${EXTRACT_DIR}")
    
    # Extract tar.gz to build directory
    execute_process(
      COMMAND ${CMAKE_COMMAND} -E tar xzf "${HEADERS_ARCHIVE}"
      WORKING_DIRECTORY "${EXTRACT_DIR}"
      RESULT_VARIABLE EXTRACT_RESULT
    )
    
    if(NOT EXTRACT_RESULT EQUAL 0)
      message(FATAL_ERROR "Failed to extract Node.js headers")
    endif()
    
    # Move extracted include/node directory to final location
    file(MAKE_DIRECTORY "${CMAKE_CURRENT_SOURCE_DIR}/include")
    execute_process(
      COMMAND ${CMAKE_COMMAND} -E rename "${EXTRACT_DIR}/node-v${ELECTRON_NODE_VERSION}/include/node" "${NODE_HEADERS_DIR}"
      RESULT_VARIABLE MOVE_RESULT
    )
    
    if(NOT MOVE_RESULT EQUAL 0)
      message(FATAL_ERROR "Failed to move Node.js headers to final location")
    endif()
    
    # Cleanup extraction directory (keep tar.gz in build/ for future use)
    file(REMOVE_RECURSE "${EXTRACT_DIR}")
    message(STATUS "Node.js headers extracted to ${NODE_HEADERS_DIR}")
  endif()
  
  # Download node.lib on Windows if not present
  if(WIN32 AND NOT EXISTS "${NODE_LIB_DIR}/node.lib")
    message(STATUS "Downloading runtime v${ELECTRON_NODE_VERSION} libraries...")
    file(MAKE_DIRECTORY "${NODE_LIB_DIR}")
    set(LIB_URL "https://nodejs.org/download/release/v${ELECTRON_NODE_VERSION}/win-x64/node.lib")
    file(DOWNLOAD "${LIB_URL}" "${NODE_LIB_DIR}/node.lib" SHOW_PROGRESS)
    message(STATUS "Runtime libraries downloaded to ${NODE_LIB_DIR}")
  endif()
endif()

message(STATUS "NODE_HEADERS_DIR: ${NODE_HEADERS_DIR}")
message(STATUS "NODE_LIB_DIR: ${NODE_LIB_DIR}")

if(WIN32 OR NOT CMAKE_SYSTEM_NAME STREQUAL "Linux")
  # Define the build-time import library path based on target executable
  set(NODE_IMPORT_LIB "${CMAKE_CURRENT_BINARY_DIR}/${TARGET_EXECUTABLE}.lib")
  set(BUILD_NODE_DEF "${CMAKE_CURRENT_BINARY_DIR}/node.def")
  set(BUILD_NODE_LIB "${NODE_LIB_DIR}/node.lib")

  # 1. Ensure node.def exists. If not, generate from node.lib (Configure time)
  if(NOT EXISTS "${BUILD_NODE_DEF}")
    if(EXISTS "${BUILD_NODE_LIB}")
      message(STATUS "node.def missing. Attempting to generate from node.lib...")
      
      find_program(NM_TOOL NAMES llvm-nm nm)
      if(NOT NM_TOOL)
        message(FATAL_ERROR "Could not find nm or llvm-nm to generate node.def. Please install LLVM or MinGW.")
      endif()

      execute_process(
        COMMAND "${NM_TOOL}" "--extern-only" "--defined-only" "${BUILD_NODE_LIB}"
        OUTPUT_VARIABLE NM_SYMBOLS
        RESULT_VARIABLE NM_RESULT
        OUTPUT_STRIP_TRAILING_WHITESPACE
      )
      
      if(NOT NM_RESULT EQUAL 0)
        message(FATAL_ERROR "llvm-nm failed to extract symbols from node.lib")
      endif()

      # Process symbols to create DEF content
      string(REGEX MATCHALL "[0-9a-fA-F]+ T [^\r\n]+" MATCHES "${NM_SYMBOLS}")
      set(DEF_EXPORTS "")
      foreach(MATCH ${MATCHES})
        string(REGEX REPLACE "[0-9a-fA-F]+ T " "" SYMBOL "${MATCH}")
        # Filters: skip internal/import symbols
        set(SKIP_SYMBOL FALSE)
        if(SYMBOL MATCHES "^__imp_" OR SYMBOL MATCHES "^__IMPORT_" OR SYMBOL MATCHES "NULL_THUNK")
          set(SKIP_SYMBOL TRUE)
        endif()
        
        if(NOT SKIP_SYMBOL)
          string(APPEND DEF_EXPORTS "    ${SYMBOL}\n")
        endif()
      endforeach()

      file(WRITE "${BUILD_NODE_DEF}" "LIBRARY node.exe\nEXPORTS\n${DEF_EXPORTS}")
      message(STATUS "Generated ${BUILD_NODE_DEF}")
    else()
      message(FATAL_ERROR "node.lib not found in ${NODE_LIB_DIR}. Download failed?")
    endif()
  endif()

  # 2. Resolve tools for build-time scripting
  if(CMAKE_LIB)
      set(LIB_TOOL "${CMAKE_LIB}")
  else()
      find_program(LLVM_LIB_TOOL NAMES llvm-lib lib)
      set(LIB_TOOL "${LLVM_LIB_TOOL}")
  endif()

  # 3. Generate specialized .def and .lib files for TARGET_EXECUTABLE at configure time
  set(TARGET_DEF "${CMAKE_CURRENT_BINARY_DIR}/${TARGET_EXECUTABLE}.def")
  set(TARGET_LIB "${CMAKE_CURRENT_BINARY_DIR}/${TARGET_EXECUTABLE}.lib")

  if(NOT EXISTS "${TARGET_LIB}")
    # Generate specialized DEF from template if it doesn't exist
    if(NOT EXISTS "${TARGET_DEF}")
      file(READ "${BUILD_NODE_DEF}" DEF_CONTENT)
      string(REGEX REPLACE "LIBRARY[ \t]+[^\n\r]+" "LIBRARY ${TARGET_EXECUTABLE}.exe" UPDATED_DEF_CONTENT "${DEF_CONTENT}")
      file(WRITE "${TARGET_DEF}" "${UPDATED_DEF_CONTENT}")
      message(STATUS "Generated ${TARGET_DEF}")
    endif()

    # Generate specialized LIB from DEF
    message(STATUS "Generating ${TARGET_LIB} using ${LIB_TOOL}...")
    execute_process(
      COMMAND "${LIB_TOOL}" "/def:${TARGET_DEF}" "/out:${TARGET_LIB}" "/machine:x64"
      RESULT_VARIABLE LIB_RESULT
    )

    if(NOT LIB_RESULT EQUAL 0)
      message(FATAL_ERROR "Failed to generate specialized import library for ${TARGET_EXECUTABLE}")
    endif()

    message(STATUS "Generated ${TARGET_LIB}")
  else()
    message(STATUS "Import library already exists: ${TARGET_LIB}")
  endif()
endif()

# Define the import library path (used throughout the build)
if(NOT DEFINED NODE_IMPORT_LIB)
  set(NODE_IMPORT_LIB "${CMAKE_CURRENT_BINARY_DIR}/node.lib")
endif()

# Build type
if(NOT CMAKE_BUILD_TYPE)
  set(CMAKE_BUILD_TYPE Release CACHE STRING "Build type" FORCE)
endif()

# Export compile commands for all configurations
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

# NASM configuration
set(CMAKE_ASM_NASM_OBJECT_FORMAT win64)
set(CMAKE_ASM_NASM_FLAGS "-f win64")

# Standard configuration
set(CMAKE_C_STANDARD 99)
set(CMAKE_C_STANDARD_REQUIRED ON)
set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Find node-addon-api include directory
execute_process(
  COMMAND node -p "require('node-addon-api').include"
  WORKING_DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR}
  OUTPUT_VARIABLE NAPI_INCLUDE_DIR
  OUTPUT_STRIP_TRAILING_WHITESPACE
  RESULT_VARIABLE NAPI_RESULT
)

if(NOT NAPI_RESULT EQUAL 0 OR NOT NAPI_INCLUDE_DIR)
  # Fallback: try to find in node_modules
  if(EXISTS "${CMAKE_CURRENT_SOURCE_DIR}/node_modules/node-addon-api")
    set(NAPI_INCLUDE_DIR "${CMAKE_CURRENT_SOURCE_DIR}/node_modules/node-addon-api")
  else()
    message(FATAL_ERROR "Could not find node-addon-api. Run 'npm install' first.")
  endif()
endif()

# Remove quotes if present
string(REPLACE "\"" "" NAPI_INCLUDE_DIR "${NAPI_INCLUDE_DIR}")
message(STATUS "node-addon-api include: ${NAPI_INCLUDE_DIR}")

# =============================================================================
# Sources  
# =============================================================================

set(CHEATRON_SOURCES
  src/cheatron-native.cpp
  src/constants.cpp
  src/capstone.cpp
  src/reference.cpp
  src/process.cpp
  src/log.cpp
)

# Capstone sources (minimal x86/ARM/ARM64)
set(CAPSTONE_SOURCES
  submodules/capstone/cs.c
  submodules/capstone/MCInst.c
  submodules/capstone/MCRegisterInfo.c
  submodules/capstone/MCInstrDesc.c
  submodules/capstone/utils.c
  submodules/capstone/SStream.c
  submodules/capstone/arch/X86/X86ATTInstPrinter.c
  submodules/capstone/arch/X86/X86Disassembler.c
  submodules/capstone/arch/X86/X86DisassemblerDecoder.c
  submodules/capstone/arch/X86/X86IntelInstPrinter.c
  submodules/capstone/arch/X86/X86Mapping.c
  submodules/capstone/arch/X86/X86Module.c
  submodules/capstone/arch/ARM/ARMDisassembler.c
  submodules/capstone/arch/ARM/ARMInstPrinter.c
  submodules/capstone/arch/ARM/ARMMapping.c
  submodules/capstone/arch/ARM/ARMModule.c
  submodules/capstone/arch/AArch64/AArch64BaseInfo.c
  submodules/capstone/arch/AArch64/AArch64Disassembler.c
  submodules/capstone/arch/AArch64/AArch64InstPrinter.c
  submodules/capstone/arch/AArch64/AArch64Mapping.c
  submodules/capstone/arch/AArch64/AArch64Module.c
)

# Neptune sources
set(NEPTUNE_SOURCES
  submodules/neptune/src/neptune.c
  submodules/neptune/src/nerror.c
  submodules/neptune/src/nfile.c
  submodules/neptune/src/nmem.c
  submodules/neptune/src/nmutex.c
)

# NThread sources
set(NTHREAD_SOURCES
  submodules/nthread/src/nthread.c
  submodules/nthread/src/ntmem.c
  submodules/nthread/src/nttunnel.c
  submodules/nthread/src/ntutils.c
)

# NThreadOSUtils sources
set(NTHREADOSUTILS_SOURCES
  submodules/nthreadosutils/src/ntosutils.c
  submodules/nthreadosutils/src/ntosutilswin.c
)

# NHook sources
set(NHOOK_SOURCES
  submodules/nhook/src/core.c
  submodules/nhook/src/hook.c
  submodules/nhook/src/manager.c
  submodules/nhook/src/thread.c
  submodules/nhook/src/trampoline.c
  submodules/nhook/src/utils.c
)

# NHook ASM sources (NASM) - separate from C/C++
set(NHOOK_ASM_SOURCES
  submodules/nhook/asm/call_dynamic_func.asm
  submodules/nhook/asm/insn_simulation.asm
)

# C/C++ sources only (no ASM)
set(C_CXX_SOURCES
  ${CHEATRON_SOURCES}
  ${CAPSTONE_SOURCES}
  ${NEPTUNE_SOURCES}
  ${NTHREAD_SOURCES}
  ${NTHREADOSUTILS_SOURCES}
  ${NHOOK_SOURCES}
)

# All sources combined
set(ALL_SOURCES
  ${C_CXX_SOURCES}
  ${NHOOK_ASM_SOURCES}
  src/version.rc
)

# =============================================================================
# Target
# =============================================================================

add_library(${PROJECT_NAME} SHARED ${ALL_SOURCES})
if(TARGET generate_import_lib)
  add_dependencies(${PROJECT_NAME} generate_import_lib)
endif()

# Output settings - Force flat output directory for the native module
set_target_properties(${PROJECT_NAME} PROPERTIES
  OUTPUT_NAME "cheatron-native"
  SUFFIX ".node"
  PREFIX ""
  LIBRARY_OUTPUT_DIRECTORY "${CMAKE_CURRENT_SOURCE_DIR}/build"
  RUNTIME_OUTPUT_DIRECTORY "${CMAKE_CURRENT_SOURCE_DIR}/build"
  ARCHIVE_OUTPUT_DIRECTORY "${CMAKE_CURRENT_SOURCE_DIR}/build"
)

# Force for all configurations in multi-config generators
foreach(CONFIG ${CMAKE_CONFIGURATION_TYPES})
  string(TOUPPER ${CONFIG} CONFIG_UPPER)
  set_target_properties(${PROJECT_NAME} PROPERTIES
    LIBRARY_OUTPUT_DIRECTORY_${CONFIG_UPPER} "${CMAKE_CURRENT_SOURCE_DIR}/build"
    RUNTIME_OUTPUT_DIRECTORY_${CONFIG_UPPER} "${CMAKE_CURRENT_SOURCE_DIR}/build"
    ARCHIVE_OUTPUT_DIRECTORY_${CONFIG_UPPER} "${CMAKE_CURRENT_SOURCE_DIR}/build"
  )
endforeach()

# =============================================================================
# Include directories
# =============================================================================

target_include_directories(${PROJECT_NAME} PRIVATE
  ${NAPI_INCLUDE_DIR}
  ${NODE_HEADERS_DIR}
  include
  modulerules
  submodules/capstone/include
  submodules/capstone
  submodules/neptune/include
  submodules/neptune/modulerules
  submodules/nthread/include
  submodules/nthread/modulerules
  submodules/nthreadosutils/include
  submodules/nthreadosutils/modulerules
  submodules/nhook/include
  submodules/nhook/modulerules
)

# =============================================================================
# Compile definitions (C/C++ only)
# =============================================================================

# Parse version into components
string(REPLACE "." ";" VERSION_LIST ${VERSION})
list(GET VERSION_LIST 0 VERSION_MAJOR)
list(GET VERSION_LIST 1 VERSION_MINOR)
list(GET VERSION_LIST 2 VERSION_PATCH)
set(VERSION_BUILD 0) # Default build number

set_source_files_properties(${C_CXX_SOURCES} src/version.rc PROPERTIES COMPILE_DEFINITIONS
  "VERSION=${VERSION};VERSION_MAJOR=${VERSION_MAJOR};VERSION_MINOR=${VERSION_MINOR};VERSION_PATCH=${VERSION_PATCH};VERSION_BUILD=${VERSION_BUILD};NAPI_DISABLE_CPP_EXCEPTIONS;LOG_LEVEL_3;NTUTILS_DISABLE_GLOBAL_CC;NEPTUNE_ENABLE_MEMMEM;NEPTUNE_MODULERULES_HEADER=\"cheatron_rules.h\";CAPSTONE_USE_SYS_DYN_MEM;CAPSTONE_X86;CAPSTONE_HAS_X86;CAPSTONE_ARM;CAPSTONE_HAS_ARM;CAPSTONE_ARM64;CAPSTONE_HAS_ARM64;_CRT_SECURE_NO_WARNINGS;_CRT_NONSTDC_NO_DEPRECATE"
)

# LOG_FILE_PATH needs special handling for wide string
set_source_files_properties(${C_CXX_SOURCES} PROPERTIES COMPILE_FLAGS
  "-DLOG_FILE_PATH=L\\\"cheatron-native.log\\\""
)

# =============================================================================
# Link libraries
# =============================================================================

# Link the Node import library
if(NODE_IMPORT_LIB)
  target_link_libraries(${PROJECT_NAME} PRIVATE ${NODE_IMPORT_LIB})
endif()

# Windows system libraries (for cross-compile target)
target_link_libraries(${PROJECT_NAME} PRIVATE
  kernel32
  user32
  gdi32
  winspool
  comdlg32
  advapi32
  shell32
  ole32
  oleaut32
  uuid
  odbc32
)

# =============================================================================
# Compiler/Linker flags (C/C++ only)
# =============================================================================

if(MSVC)
  # MSVC-specific settings
  target_compile_options(${PROJECT_NAME} PRIVATE
    $<$<COMPILE_LANGUAGE:C,CXX>:/EHsc>
    $<$<COMPILE_LANGUAGE:C,CXX>:/W3>
    # Remove symbols for unreferenced inline functions to avoid duplicate symbol errors (e.g. in intrin.h)
    $<$<COMPILE_LANGUAGE:C,CXX>:/Zc:inline>
    $<$<COMPILE_LANGUAGE:C,CXX>:$<$<CONFIG:Release>:/O2>>
    $<$<COMPILE_LANGUAGE:C,CXX>:$<$<CONFIG:Debug>:/Od /Zi>>
  )
  
  # Use static runtime
  set_property(TARGET ${PROJECT_NAME} PROPERTY
    MSVC_RUNTIME_LIBRARY "MultiThreaded$<$<CONFIG:Debug>:Debug>"
  )
  
  # Linker flags for MSVC
  target_link_options(${PROJECT_NAME} PRIVATE 
    /DEBUG
    # Force link despite duplicate intrinsic symbols (known conflict between Capstone and certain LLVM/MSVC headers)
    /force:multiple
  )
  
else()
  # MinGW/GCC/LLVM settings
  target_compile_options(${PROJECT_NAME} PRIVATE
    $<$<COMPILE_LANGUAGE:C,CXX>:-ffunction-sections>
    $<$<COMPILE_LANGUAGE:C,CXX>:-fdata-sections>
    $<$<COMPILE_LANGUAGE:C,CXX>:$<$<CONFIG:Release>:-Os>>
    $<$<COMPILE_LANGUAGE:C,CXX>:$<$<CONFIG:Debug>:-Og -g>>
  )
  
  # C sources with C99 standard for libraries
  set_source_files_properties(
    ${CAPSTONE_SOURCES}
    ${NEPTUNE_SOURCES}
    ${NTHREAD_SOURCES}
    ${NTHREADOSUTILS_SOURCES}
    ${NHOOK_SOURCES}
    PROPERTIES COMPILE_OPTIONS "-std=c99"
  )
  
  target_link_options(${PROJECT_NAME} PRIVATE
    -static-libgcc
    -static-libstdc++
    -Wl,--gc-sections
    $<$<CONFIG:Release>:-Wl,-s>
  )
endif()

