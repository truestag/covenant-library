# Covenant Library v1.0.0 — Windows Installer Repair

Date: 2026-09-03
Scope: Windows packaging only; corpus and shared reader unchanged.

## Defect corrected

The promoted v1.0.0 Windows artifact was a portable GUI executable. It could launch and reopen the local
Covenant Library runtime, but it did not install itself into a stable application folder or create normal
Windows launch surfaces.

## Corrected behavior

- Per-user installation to `%LOCALAPPDATA%\Programs\Covenant Library`.
- No administrator privilege required.
- Desktop shortcut: `Covenant Library.lnk`.
- Start Menu folder with application and uninstall shortcuts.
- Shortcuts use a Covenant Library emblem `.ico` derived from the existing approved Covenant artwork.
- Add or remove programs entry under `HKCU`.
- Installer closes an already-running fixed-port Covenant Library instance before replacing the program file.
- Installed app remains the exact promoted v1.0.0 Windows binary.
- Existing `%LOCALAPPDATA%\Covenant Library Data` is preserved on install and uninstall.
- Uninstaller removes program files and shortcuts but intentionally retains user data.
- Installer offers to open Covenant Library when setup completes.

## Integrity gate

The setup embeds only the promoted Windows v1.0.0 application binary with SHA-256:

`20b114d39e938657619736977462e9915f18688c18fcf3eee3c6be059fc9db40`

The installer performs the same SHA-256 check before writing the embedded application to disk.

## Validation

- Existing v1 regression suite: PASS (1,487 records; 960 readable books; 413,680 searchable segments).
- Installer source cross-compiles to PE32+ x86-64 Windows GUI.
- Uninstaller source cross-compiles to PE32+ x86-64 Windows GUI.
- On-PC acceptance status: PASS for the setup/install, Desktop shortcut launch, Close Application, and reopen path on Windows. Start Menu/uninstall integration remains part of the installer contract; uninstall/reinstall data-retention was not separately asserted in the final user acceptance message.
