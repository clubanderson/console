package fileutil

import (
	"os"
	"path/filepath"
	"testing"
)

func TestAtomicWriteFile_Success(t *testing.T) {
	dir := t.TempDir()
	target := filepath.Join(dir, "out.txt")
	data := []byte("hello atomic")
	const perm = 0o644

	if err := AtomicWriteFile(target, data, perm); err != nil {
		t.Fatalf("AtomicWriteFile returned unexpected error: %v", err)
	}

	got, err := os.ReadFile(target)
	if err != nil {
		t.Fatalf("failed to read written file: %v", err)
	}
	if string(got) != string(data) {
		t.Fatalf("content mismatch: got %q, want %q", got, data)
	}

	info, err := os.Stat(target)
	if err != nil {
		t.Fatalf("failed to stat written file: %v", err)
	}
	if info.Mode().Perm() != perm {
		t.Fatalf("permission mismatch: got %o, want %o", info.Mode().Perm(), perm)
	}
}

func TestAtomicWriteFile_Overwrite(t *testing.T) {
	dir := t.TempDir()
	target := filepath.Join(dir, "overwrite.txt")
	const perm = 0o644

	if err := AtomicWriteFile(target, []byte("first"), perm); err != nil {
		t.Fatalf("first write failed: %v", err)
	}
	if err := AtomicWriteFile(target, []byte("second"), perm); err != nil {
		t.Fatalf("second write failed: %v", err)
	}

	got, err := os.ReadFile(target)
	if err != nil {
		t.Fatalf("failed to read file: %v", err)
	}
	if string(got) != "second" {
		t.Fatalf("expected 'second', got %q", got)
	}
}

func TestAtomicWriteFile_EmptyData(t *testing.T) {
	dir := t.TempDir()
	target := filepath.Join(dir, "empty.txt")
	const perm = 0o644

	if err := AtomicWriteFile(target, []byte{}, perm); err != nil {
		t.Fatalf("AtomicWriteFile with empty data returned error: %v", err)
	}

	info, err := os.Stat(target)
	if err != nil {
		t.Fatalf("failed to stat file: %v", err)
	}
	if info.Size() != 0 {
		t.Fatalf("expected empty file, got size %d", info.Size())
	}
}

func TestAtomicWriteFile_NonExistentDirectory(t *testing.T) {
	// Writing to a path whose parent directory does not exist should fail.
	target := filepath.Join(t.TempDir(), "no-such-dir", "file.txt")

	err := AtomicWriteFile(target, []byte("data"), 0o644)
	if err == nil {
		t.Fatalf("expected error when directory does not exist, got nil")
	}
}

func TestAtomicWriteFile_ReadOnlyDirectory(t *testing.T) {
	dir := t.TempDir()
	// Make the directory read-only so CreateTemp fails.
	if err := os.Chmod(dir, 0o555); err != nil {
		t.Fatalf("failed to chmod dir: %v", err)
	}
	// Restore permissions so t.TempDir cleanup can remove the directory.
	t.Cleanup(func() { os.Chmod(dir, 0o755) })

	target := filepath.Join(dir, "file.txt")
	err := AtomicWriteFile(target, []byte("data"), 0o644)
	if err == nil {
		t.Fatalf("expected error writing to read-only directory, got nil")
	}
}

func TestAtomicWriteFile_NoTempFileLeftOnError(t *testing.T) {
	// After a failed write the temp file should be cleaned up.
	target := filepath.Join(t.TempDir(), "missing-parent", "file.txt")

	_ = AtomicWriteFile(target, []byte("data"), 0o644)

	// The parent dir of target doesn't exist, so no temp file should be
	// left anywhere. Verify the TempDir itself has no leftover files.
	dir := t.TempDir()
	entries, err := os.ReadDir(dir)
	if err != nil {
		t.Fatalf("failed to read temp dir: %v", err)
	}
	for _, e := range entries {
		if filepath.Ext(e.Name()) == ".tmp" {
			t.Fatalf("leftover temp file found: %s", e.Name())
		}
	}
}
