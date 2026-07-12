package main

// Redirects this process's stdout/stderr into logcat. Without this, anything
// zerolog (or a panic) writes to os.Stdout/os.Stderr is invisible on Android,
// since apps don't have an attached console.

/*
#cgo LDFLAGS: -llog
#include <android/log.h>
#include <stdlib.h>
#include <unistd.h>

static void karopon_log_write(const char *line, int len) {
	__android_log_write(ANDROID_LOG_INFO, "karopon-go", line);
}
*/
import "C"

import (
	"bufio"
	"os"
	"unsafe"
)

func init() {
	redirectStdoutToLogcat()
}

// dup2 is used instead of the syscall package's Dup2 because it isn't
// implemented for linux/arm64 (only Dup3 is); bionic's libc dup2 works on
// every Android ABI.
func dup2(oldfd, newfd int) error {

	if ret, err := C.dup2(C.int(oldfd), C.int(newfd)); ret < 0 {
		return err
	}

	return nil
}

func redirectStdoutToLogcat() {

	for _, target := range []*os.File{os.Stdout, os.Stderr} {

		r, w, err := os.Pipe()

		if err != nil {
			continue
		}

		if err := dup2(int(w.Fd()), int(target.Fd())); err != nil {
			continue
		}

		go pipeToLogcat(r)
	}
}

func pipeToLogcat(r *os.File) {

	scanner := bufio.NewScanner(r)

	for scanner.Scan() {

		line := scanner.Text()
		cLine := C.CString(line)

		C.karopon_log_write(cLine, C.int(len(line)))

		C.free(unsafe.Pointer(cLine))
	}
}
