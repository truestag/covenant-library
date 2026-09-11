//go:build windows

package main

import (
	"bytes"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"syscall"
	"time"
	"unsafe"
)

const (
	mbOK                  = 0x00000000
	mbYesNo               = 0x00000004
	mbIconInformation     = 0x00000040
	mbIconQuestion        = 0x00000020
	idYes                 = 6
	csidlPrograms         = 0x0002
	csidlDesktopDirectory = 0x0010
)

var (
	user32               = syscall.NewLazyDLL("user32.dll")
	procMessageBoxW      = user32.NewProc("MessageBoxW")
	shell32              = syscall.NewLazyDLL("shell32.dll")
	procSHGetFolderPathW = shell32.NewProc("SHGetFolderPathW")
)

func ptr(s string) *uint16 {
	p, _ := syscall.UTF16PtrFromString(s)
	return p
}

func messageBox(text, caption string, flags uintptr) int {
	r, _, _ := procMessageBoxW.Call(0, uintptr(unsafe.Pointer(ptr(text))), uintptr(unsafe.Pointer(ptr(caption))), flags)
	return int(r)
}

func shellFolder(csidl int32) string {
	buf := make([]uint16, 32768)
	hr, _, _ := procSHGetFolderPathW.Call(0, uintptr(csidl), 0, 0, uintptr(unsafe.Pointer(&buf[0])))
	if int32(hr) < 0 {
		return ""
	}
	return syscall.UTF16ToString(buf)
}

func quitRunningCopy() {
	client := &http.Client{Timeout: 750 * time.Millisecond}
	req, _ := http.NewRequest(http.MethodPost, "http://127.0.0.1:17401/__covenant/quit", bytes.NewReader(nil))
	if req != nil {
		if resp, err := client.Do(req); err == nil {
			io.Copy(io.Discard, resp.Body)
			resp.Body.Close()
			time.Sleep(500 * time.Millisecond)
		}
	}
}

func hiddenCommand(name string, args ...string) {
	cmd := exec.Command(name, args...)
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
	_ = cmd.Run()
}

func main() {
	if messageBox(
		"Remove Covenant Library from this Windows account?\n\nYour bookmarks, notes, reading position, imported books, and other Covenant Library user data will be kept in %LOCALAPPDATA%\\Covenant Library Data so that they survive a reinstall.",
		"Uninstall Covenant Library",
		mbYesNo|mbIconQuestion,
	) != idYes {
		return
	}

	quitRunningCopy()

	desktop := shellFolder(csidlDesktopDirectory)
	programs := shellFolder(csidlPrograms)
	if desktop != "" {
		_ = os.Remove(filepath.Join(desktop, "Covenant Library.lnk"))
	}
	if programs != "" {
		_ = os.RemoveAll(filepath.Join(programs, "Covenant Library"))
	}

	hiddenCommand("reg.exe", "DELETE", `HKCU\Software\Microsoft\Windows\CurrentVersion\Uninstall\CovenantLibrary`, "/f")

	exe, _ := os.Executable()
	installDir := filepath.Dir(exe)
	// The uninstaller cannot delete itself while executing. Spawn cmd.exe to remove
	// the install directory after this process exits. User data is intentionally elsewhere.
	command := `timeout /t 1 /nobreak >nul & rmdir /s /q "` + strings.ReplaceAll(installDir, `"`, ``) + `"`
	cmd := exec.Command("cmd.exe", "/C", command)
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
	_ = cmd.Start()

	messageBox(
		"Covenant Library has been removed.\n\nYour Covenant Library user data was kept. Reinstalling Covenant Library will continue to use it.",
		"Uninstall Covenant Library",
		mbOK|mbIconInformation,
	)
}
