//go:build windows

package main

import (
	"bytes"
	"crypto/sha256"
	_ "embed"
	"encoding/hex"
	"fmt"
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
	appName         = "Covenant Library"
	appVersion      = "2.0.0"
	appExeName      = "Covenant-Library-v2.0.0-Windows-x64.exe"
	uninstallerName = "Uninstall Covenant Library.exe"
	iconName        = "Covenant-Library.ico"
	expectedAppSHA  = "7378b5fd691428468e7943522a3e28aab280e862b26cfce2e31c6a4389c78347"

	mbOK              = 0x00000000
	mbOKCancel        = 0x00000001
	mbYesNo           = 0x00000004
	mbIconInformation = 0x00000040
	mbIconError       = 0x00000010
	mbIconQuestion    = 0x00000020
	idOK              = 1
	idYes             = 6

	coinitApartmentThreaded = 0x2
	clsctxInprocServer      = 0x1
	csidlPrograms           = 0x0002
	csidlDesktopDirectory   = 0x0010
)

// build-installer.mjs writes these three payloads beside this source before build.
//
//go:embed payload/Covenant-Library-v2.0.0-Windows-x64.exe
var appPayload []byte

//go:embed payload/Covenant-Library.ico
var iconPayload []byte

//go:embed payload/Uninstall-Covenant-Library.exe
var uninstallerPayload []byte

type GUID struct {
	Data1 uint32
	Data2 uint16
	Data3 uint16
	Data4 [8]byte
}

type iUnknownVtbl struct {
	QueryInterface uintptr
	AddRef         uintptr
	Release        uintptr
}

type iShellLinkW struct {
	Vtbl *[21]uintptr
}

type iPersistFile struct {
	Vtbl *[9]uintptr
}

var (
	user32               = syscall.NewLazyDLL("user32.dll")
	procMessageBoxW      = user32.NewProc("MessageBoxW")
	ole32                = syscall.NewLazyDLL("ole32.dll")
	procCoInitializeEx   = ole32.NewProc("CoInitializeEx")
	procCoUninitialize   = ole32.NewProc("CoUninitialize")
	procCoCreateInstance = ole32.NewProc("CoCreateInstance")
	shell32              = syscall.NewLazyDLL("shell32.dll")
	procSHGetFolderPathW = shell32.NewProc("SHGetFolderPathW")
)

var (
	clsidShellLink  = GUID{0x00021401, 0x0000, 0x0000, [8]byte{0xC0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x46}}
	iidIShellLinkW  = GUID{0x000214F9, 0x0000, 0x0000, [8]byte{0xC0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x46}}
	iidIPersistFile = GUID{0x0000010B, 0x0000, 0x0000, [8]byte{0xC0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x46}}
)

func ptr(s string) *uint16 {
	p, _ := syscall.UTF16PtrFromString(s)
	return p
}

func messageBox(text, caption string, flags uintptr) int {
	r, _, _ := procMessageBoxW.Call(0, uintptr(unsafe.Pointer(ptr(text))), uintptr(unsafe.Pointer(ptr(caption))), flags)
	return int(r)
}

func failed(hr uintptr) bool {
	return int32(hr) < 0
}

func shellFolder(csidl int32) (string, error) {
	buf := make([]uint16, 32768)
	hr, _, _ := procSHGetFolderPathW.Call(0, uintptr(csidl), 0, 0, uintptr(unsafe.Pointer(&buf[0])))
	if failed(hr) {
		return "", fmt.Errorf("SHGetFolderPathW failed: 0x%08x", uint32(hr))
	}
	return syscall.UTF16ToString(buf), nil
}

func callCOM(fn uintptr, args ...uintptr) uintptr {
	r, _, _ := syscall.SyscallN(fn, args...)
	return r
}

func createShortcut(linkPath, target, workingDir, iconPath, description string) error {
	hr, _, _ := procCoInitializeEx.Call(0, coinitApartmentThreaded)
	if failed(hr) && uint32(hr) != 0x80010106 { // RPC_E_CHANGED_MODE is usable for this process.
		return fmt.Errorf("CoInitializeEx failed: 0x%08x", uint32(hr))
	}
	if !failed(hr) {
		defer procCoUninitialize.Call()
	}

	var shellLink *iShellLinkW
	hr, _, _ = procCoCreateInstance.Call(
		uintptr(unsafe.Pointer(&clsidShellLink)),
		0,
		clsctxInprocServer,
		uintptr(unsafe.Pointer(&iidIShellLinkW)),
		uintptr(unsafe.Pointer(&shellLink)),
	)
	if failed(hr) || shellLink == nil {
		return fmt.Errorf("CoCreateInstance(IShellLinkW) failed: 0x%08x", uint32(hr))
	}
	defer callCOM(shellLink.Vtbl[2], uintptr(unsafe.Pointer(shellLink)))

	if hr = callCOM(shellLink.Vtbl[20], uintptr(unsafe.Pointer(shellLink)), uintptr(unsafe.Pointer(ptr(target)))); failed(hr) {
		return fmt.Errorf("IShellLinkW.SetPath failed: 0x%08x", uint32(hr))
	}
	if workingDir != "" {
		if hr = callCOM(shellLink.Vtbl[9], uintptr(unsafe.Pointer(shellLink)), uintptr(unsafe.Pointer(ptr(workingDir)))); failed(hr) {
			return fmt.Errorf("IShellLinkW.SetWorkingDirectory failed: 0x%08x", uint32(hr))
		}
	}
	if description != "" {
		if hr = callCOM(shellLink.Vtbl[7], uintptr(unsafe.Pointer(shellLink)), uintptr(unsafe.Pointer(ptr(description)))); failed(hr) {
			return fmt.Errorf("IShellLinkW.SetDescription failed: 0x%08x", uint32(hr))
		}
	}
	if iconPath != "" {
		if hr = callCOM(shellLink.Vtbl[17], uintptr(unsafe.Pointer(shellLink)), uintptr(unsafe.Pointer(ptr(iconPath))), 0); failed(hr) {
			return fmt.Errorf("IShellLinkW.SetIconLocation failed: 0x%08x", uint32(hr))
		}
	}

	var persist *iPersistFile
	hr = callCOM(shellLink.Vtbl[0], uintptr(unsafe.Pointer(shellLink)), uintptr(unsafe.Pointer(&iidIPersistFile)), uintptr(unsafe.Pointer(&persist)))
	if failed(hr) || persist == nil {
		return fmt.Errorf("QueryInterface(IPersistFile) failed: 0x%08x", uint32(hr))
	}
	defer callCOM(persist.Vtbl[2], uintptr(unsafe.Pointer(persist)))

	if err := os.MkdirAll(filepath.Dir(linkPath), 0o755); err != nil {
		return err
	}
	hr = callCOM(persist.Vtbl[6], uintptr(unsafe.Pointer(persist)), uintptr(unsafe.Pointer(ptr(linkPath))), 1)
	if failed(hr) {
		return fmt.Errorf("IPersistFile.Save failed: 0x%08x", uint32(hr))
	}
	return nil
}

func atomicWrite(path string, data []byte, mode os.FileMode) error {
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return err
	}
	temp := path + ".new"
	if err := os.WriteFile(temp, data, mode); err != nil {
		return err
	}
	_ = os.Remove(path)
	return os.Rename(temp, path)
}

func quitRunningCopy() {
	client := &http.Client{Timeout: 750 * time.Millisecond}
	req, _ := http.NewRequest(http.MethodPost, "http://127.0.0.1:17401/__covenant/quit", bytes.NewReader(nil))
	if req != nil {
		if resp, err := client.Do(req); err == nil {
			io.Copy(io.Discard, resp.Body)
			resp.Body.Close()
			time.Sleep(400 * time.Millisecond)
		}
	}
}

func addUninstallRegistry(installDir, uninstaller, icon string) error {
	key := `HKCU\Software\Microsoft\Windows\CurrentVersion\Uninstall\CovenantLibrary`
	values := [][3]string{
		{"DisplayName", "REG_SZ", appName},
		{"DisplayVersion", "REG_SZ", appVersion},
		{"Publisher", "REG_SZ", "Covenant Library"},
		{"InstallLocation", "REG_SZ", installDir},
		{"DisplayIcon", "REG_SZ", icon},
		{"UninstallString", "REG_SZ", `"` + uninstaller + `"`},
		{"NoModify", "REG_DWORD", "1"},
		{"NoRepair", "REG_DWORD", "1"},
	}
	for _, v := range values {
		cmd := exec.Command("reg.exe", "ADD", key, "/v", v[0], "/t", v[1], "/d", v[2], "/f")
		cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
		if output, err := cmd.CombinedOutput(); err != nil {
			return fmt.Errorf("registry %s failed: %v (%s)", v[0], err, strings.TrimSpace(string(output)))
		}
	}
	return nil
}

func main() {
	if messageBox(
		"Install Covenant Library for this Windows account?\n\nThe installer will create Desktop and Start Menu shortcuts and will keep your Covenant Library user data separate from the application files.",
		"Covenant Library Setup",
		mbOKCancel|mbIconInformation,
	) != idOK {
		return
	}

	actual := sha256.Sum256(appPayload)
	if hex.EncodeToString(actual[:]) != expectedAppSHA {
		messageBox("The embedded Covenant Library application failed its integrity check. Setup will stop without changing your installation.", "Covenant Library Setup", mbOK|mbIconError)
		return
	}

	localAppData := strings.TrimSpace(os.Getenv("LOCALAPPDATA"))
	if localAppData == "" {
		messageBox("Windows did not provide a LOCALAPPDATA folder. Setup cannot continue safely.", "Covenant Library Setup", mbOK|mbIconError)
		return
	}
	installDir := filepath.Join(localAppData, "Programs", "Covenant Library")
	appPath := filepath.Join(installDir, appExeName)
	iconPath := filepath.Join(installDir, iconName)
	uninstallPath := filepath.Join(installDir, uninstallerName)

	quitRunningCopy()

	if err := atomicWrite(appPath, appPayload, 0o755); err != nil {
		messageBox("Could not install Covenant Library:\n\n"+err.Error(), "Covenant Library Setup", mbOK|mbIconError)
		return
	}
	if err := atomicWrite(iconPath, iconPayload, 0o644); err != nil {
		messageBox("Could not install the Covenant Library icon:\n\n"+err.Error(), "Covenant Library Setup", mbOK|mbIconError)
		return
	}
	if err := atomicWrite(uninstallPath, uninstallerPayload, 0o755); err != nil {
		messageBox("Could not install the Covenant Library uninstaller:\n\n"+err.Error(), "Covenant Library Setup", mbOK|mbIconError)
		return
	}

	desktop, err := shellFolder(csidlDesktopDirectory)
	if err != nil {
		messageBox("Covenant Library was installed, but Windows did not return the Desktop folder:\n\n"+err.Error(), "Covenant Library Setup", mbOK|mbIconError)
		return
	}
	programs, err := shellFolder(csidlPrograms)
	if err != nil {
		messageBox("Covenant Library was installed, but Windows did not return the Start Menu Programs folder:\n\n"+err.Error(), "Covenant Library Setup", mbOK|mbIconError)
		return
	}

	desktopLink := filepath.Join(desktop, "Covenant Library.lnk")
	startMenuDir := filepath.Join(programs, "Covenant Library")
	startMenuLink := filepath.Join(startMenuDir, "Covenant Library.lnk")
	uninstallLink := filepath.Join(startMenuDir, "Uninstall Covenant Library.lnk")

	for _, spec := range []struct{ link, target, work, icon, desc string }{
		{desktopLink, appPath, installDir, iconPath, "Open Covenant Library"},
		{startMenuLink, appPath, installDir, iconPath, "Open Covenant Library"},
		{uninstallLink, uninstallPath, installDir, iconPath, "Uninstall Covenant Library"},
	} {
		if err := createShortcut(spec.link, spec.target, spec.work, spec.icon, spec.desc); err != nil {
			messageBox("Covenant Library was installed, but a Windows shortcut could not be created:\n\n"+err.Error(), "Covenant Library Setup", mbOK|mbIconError)
			return
		}
	}

	if err := addUninstallRegistry(installDir, uninstallPath, iconPath); err != nil {
		messageBox("Covenant Library was installed, but its Add or remove programs entry could not be registered:\n\n"+err.Error(), "Covenant Library Setup", mbOK|mbIconError)
		return
	}

	if messageBox(
		"Covenant Library is installed.\n\nA Covenant Library shortcut has been created on the Desktop and in the Start Menu. Your existing library data was not removed or replaced.\n\nOpen Covenant Library now?",
		"Covenant Library Setup",
		mbYesNo|mbIconQuestion,
	) == idYes {
		cmd := exec.Command(appPath)
		cmd.Dir = installDir
		_ = cmd.Start()
	}
}
