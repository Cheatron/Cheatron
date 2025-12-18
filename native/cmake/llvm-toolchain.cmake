# LLVM/Clang cross-compilation toolchain file for Linux -> Windows
# Usage: cmake -DCMAKE_TOOLCHAIN_FILE=cmake/llvm-toolchain.cmake ...
#
# This toolchain uses:
# - clang/clang++ as C/C++ compilers (with MinGW target)
# - lld as the linker (faster than ld)
# - llvm-ar, llvm-ranlib for archives
# - nasm for assembly

set(CMAKE_SYSTEM_NAME Windows)
set(CMAKE_SYSTEM_PROCESSOR x86_64)

# LLVM target triple for MinGW
set(LLVM_TARGET "x86_64-w64-mingw32")

# Compilers - use clang with MinGW target
find_program(CMAKE_C_COMPILER NAMES clang)
find_program(CMAKE_CXX_COMPILER NAMES clang++)

# Set target for cross-compilation
set(CMAKE_C_COMPILER_TARGET ${LLVM_TARGET})
set(CMAKE_CXX_COMPILER_TARGET ${LLVM_TARGET})

# Use lld linker (much faster than ld)
set(CMAKE_EXE_LINKER_FLAGS_INIT "-fuse-ld=lld")
set(CMAKE_SHARED_LINKER_FLAGS_INIT "-fuse-ld=lld")
set(CMAKE_MODULE_LINKER_FLAGS_INIT "-fuse-ld=lld")

# LLVM archiver and tools
find_program(CMAKE_AR NAMES llvm-ar)
find_program(CMAKE_RANLIB NAMES llvm-ranlib)
find_program(CMAKE_STRIP NAMES llvm-strip)
find_program(CMAKE_NM NAMES llvm-nm)
find_program(CMAKE_DLLTOOL NAMES llvm-dlltool dlltool)
find_program(CMAKE_LIB NAMES llvm-lib)
find_program(CMAKE_READOBJ NAMES llvm-readobj readobj)
find_program(CMAKE_OBJCOPY NAMES llvm-objcopy objcopy)
find_program(CMAKE_OBJDUMP NAMES llvm-objdump objdump)

# Windres from MinGW (LLVM doesn't have windres equivalent that works well)
find_program(CMAKE_RC_COMPILER NAMES x86_64-w64-mingw32-windres windres)

# NASM for assembly
find_program(CMAKE_ASM_NASM_COMPILER NAMES nasm)
set(CMAKE_ASM_NASM_OBJECT_FORMAT win64)

# MinGW sysroot for headers and libraries
set(MINGW_SYSROOT "/usr/x86_64-w64-mingw32")
if(EXISTS ${MINGW_SYSROOT})
  set(CMAKE_SYSROOT ${MINGW_SYSROOT})
  set(CMAKE_FIND_ROOT_PATH ${MINGW_SYSROOT})
endif()

# Find GCC libraries (libgcc, libstd++, etc.) needed by Clang
# Prefer posix threading model
file(GLOB GCC_LIB_DIRS "/usr/lib/gcc/x86_64-w64-mingw32/*-posix")
if(NOT GCC_LIB_DIRS)
  file(GLOB GCC_LIB_DIRS "/usr/lib/gcc/x86_64-w64-mingw32/*-win32")
endif()

if(GCC_LIB_DIRS)
  list(GET GCC_LIB_DIRS 0 GCC_LIB_DIR)
  
  # Add to linker flags to ensure lld finds libgcc, libstdc++ and winpthread (needed for posix threads)
  set(CMAKE_EXE_LINKER_FLAGS_INIT "${CMAKE_EXE_LINKER_FLAGS_INIT} -L${GCC_LIB_DIR} -lwinpthread")
  set(CMAKE_SHARED_LINKER_FLAGS_INIT "${CMAKE_SHARED_LINKER_FLAGS_INIT} -L${GCC_LIB_DIR} -lwinpthread")
  set(CMAKE_MODULE_LINKER_FLAGS_INIT "${CMAKE_MODULE_LINKER_FLAGS_INIT} -L${GCC_LIB_DIR} -lwinpthread")
  
  # Also add to C/CXX flags
  set(CMAKE_C_FLAGS_INIT "${CMAKE_C_FLAGS_INIT} -L${GCC_LIB_DIR}")
  set(CMAKE_CXX_FLAGS_INIT "${CMAKE_CXX_FLAGS_INIT} -L${GCC_LIB_DIR}")


  # Find C++ headers
  file(GLOB GCC_CXX_INCLUDE_DIRS "${GCC_LIB_DIR}/include/c++")
  if(GCC_CXX_INCLUDE_DIRS)
    list(GET GCC_CXX_INCLUDE_DIRS 0 GCC_CXX_INCLUDE_DIR)
    
    # Add standard C++ include paths
    set(CMAKE_CXX_STANDARD_INCLUDE_DIRECTORIES
      ${GCC_CXX_INCLUDE_DIR}
      ${GCC_CXX_INCLUDE_DIR}/x86_64-w64-mingw32
      ${GCC_CXX_INCLUDE_DIR}/backward
    )
  endif()
endif()

# Search paths
set(CMAKE_FIND_ROOT_PATH_MODE_PROGRAM NEVER)
set(CMAKE_FIND_ROOT_PATH_MODE_LIBRARY ONLY)
set(CMAKE_FIND_ROOT_PATH_MODE_INCLUDE ONLY)

# Compiler flags for Windows target
set(CMAKE_C_FLAGS_INIT "-target ${LLVM_TARGET} --sysroot=${MINGW_SYSROOT} -I${MINGW_SYSROOT}/include")
set(CMAKE_CXX_FLAGS_INIT "-target ${LLVM_TARGET} --sysroot=${MINGW_SYSROOT} -I${MINGW_SYSROOT}/include")
