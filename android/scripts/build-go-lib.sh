#!/usr/bin/env bash
set -euo pipefail

# Cross-compiles android/golib (the JNI bridge to the Go server) into a
# shared library for each Android ABI, and drops the result into
# app/src/main/jniLibs/<abi>/libgoserver.so.
#
# Requires a Go toolchain, an Android NDK ($ANDROID_NDK_HOME), and a JDK
# ($JAVA_HOME, for jni.h/jni_md.h - the NDK itself doesn't bundle these).
# Intended to run inside the container built from
# docker/Dockerfile.android.build (see `make docker-mount-android`).

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ANDROID_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(cd "$ANDROID_DIR/.." && pwd)"
JNI_LIBS_DIR="$ANDROID_DIR/app/src/main/jniLibs"

: "${ANDROID_NDK_HOME:?ANDROID_NDK_HOME is not set}"
: "${JAVA_HOME:?JAVA_HOME is not set (needed for jni.h)}"

API_LEVEL=26
NDK_BIN="$ANDROID_NDK_HOME/toolchains/llvm/prebuilt/linux-x86_64/bin"

# abi:GOARCH:clang-triple
TARGETS=(
    "arm64-v8a:arm64:aarch64-linux-android${API_LEVEL}-clang"
    "x86_64:amd64:x86_64-linux-android${API_LEVEL}-clang"
)

for target in "${TARGETS[@]}"; do
    IFS=":" read -r ABI GOARCH CLANG <<<"$target"

    echo "==> Building libgoserver.so for $ABI"

    OUT_DIR="$JNI_LIBS_DIR/$ABI"
    mkdir -p "$OUT_DIR"

    # -extldflags=-Wl,-z,max-page-size=16384 aligns ELF LOAD segments to 16KB,
    # required on Android 15+ devices with 16KB page sizes. Our NDK (r27)
    # predates the toolchain default for this, so it's set explicitly.
    # https://developer.android.com/guide/practices/page-sizes
    CC="$NDK_BIN/$CLANG" \
        CGO_ENABLED=1 \
        CGO_CFLAGS="-I$JAVA_HOME/include -I$JAVA_HOME/include/linux" \
        GOOS=android \
        GOARCH="$GOARCH" \
        go build -buildmode=c-shared \
        -trimpath \
        -ldflags "-s -w -extldflags=-Wl,-z,max-page-size=16384" \
        -o "$OUT_DIR/libgoserver.so" \
        "$REPO_ROOT/android/golib"

    # go build also emits a C header for the exported symbols; we don't need
    # it since our JNI methods are resolved by name, not via that header.
    rm -f "$OUT_DIR"/*.h
done

echo "==> Done. Libraries written to $JNI_LIBS_DIR"
