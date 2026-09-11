package main

import (
    "archive/zip"
    "fmt"
    "io"
    "os"
    "path/filepath"
    "sort"
    "strings"
    "time"
)

func main() {
    if len(os.Args) != 3 { fmt.Fprintln(os.Stderr, "usage: pack-runtime <repo> <output.zip>"); os.Exit(2) }
    repo, err := filepath.Abs(os.Args[1]); if err != nil { panic(err) }
    target, err := filepath.Abs(os.Args[2]); if err != nil { panic(err) }
    roots := []string{"app", "corpus"}
    var files []string
    for _, root := range roots {
        base := filepath.Join(repo, root)
        err := filepath.WalkDir(base, func(name string, entry os.DirEntry, err error) error {
            if err != nil { return err }
            if entry.IsDir() { return nil }
            rel, err := filepath.Rel(repo, name); if err != nil { return err }
            files = append(files, rel); return nil
        })
        if err != nil { panic(err) }
    }
    sort.Strings(files)
    out, err := os.Create(target); if err != nil { panic(err) }
    writer := zip.NewWriter(out)
    fixed := time.Date(1980, 1, 1, 0, 0, 0, 0, time.UTC)
    for _, rel := range files {
        input, err := os.Open(filepath.Join(repo, rel)); if err != nil { panic(err) }
        header := &zip.FileHeader{Name: filepath.ToSlash(rel), Method: zip.Deflate, Modified: fixed}
        header.SetMode(0o644)
        dest, err := writer.CreateHeader(header); if err != nil { input.Close(); panic(err) }
        if _, err := io.Copy(dest, input); err != nil { input.Close(); panic(err) }
        input.Close()
    }
    if err := writer.Close(); err != nil { panic(err) }
    if err := out.Close(); err != nil { panic(err) }
    fmt.Printf("packed %d files into %s\n", len(files), strings.TrimSpace(target))
}
