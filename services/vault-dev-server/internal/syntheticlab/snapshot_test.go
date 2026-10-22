package syntheticlab

import (
	"bytes"
	"errors"
	"fmt"
	"sync"
	"testing"
)

func TestSyntheticSnapshotAfterHistoryExpiry(t *testing.T) {
	ledger := NewSyncLedger()
	for i := 0; i < MaxJournalEvents+8; i++ {
		env := encryptedFixture(t, "account", "item")
		if _, err := ledger.Put("account", "item", uint64(i), env); err != nil {
			t.Fatal(err)
		}
	}
	if _, _, err := ledger.Pull("account", 0); !errors.Is(err, ErrHistoryExpired) {
		t.Fatalf("missing expiration: %v", err)
	}
	items, cursor, err := ledger.Snapshot("account")
	if err != nil || cursor != uint64(MaxJournalEvents+8) || len(items) != 1 {
		t.Fatalf("invalid snapshot: %+v %d %v", items, cursor, err)
	}
	plain, err := Decrypt(key(9), "account", "item", items[0].Envelope)
	if err != nil || string(plain) != "SYNTHETIC_TEST_ITEM" {
		t.Fatal("synthetic ciphertext could not be decrypted after recovery")
	}
	changes, next, err := ledger.Pull("account", cursor)
	if err != nil || next != cursor || len(changes) != 0 {
		t.Fatal("snapshot cursor does not support delta resume")
	}
	env := encryptedFixture(t, "account", "item2")
	if _, err := ledger.Put("account", "item2", 0, env); err != nil {
		t.Fatal(err)
	}
	changes, next, err = ledger.Pull("account", cursor)
	if err != nil || next != cursor+1 || len(changes) != 1 || changes[0].ID != "item2" {
		t.Fatalf("new item lost after snapshot: %v %d %v", changes, next, err)
	}
}

func TestSnapshotExcludesDeletedItemsAndOtherScopes(t *testing.T) {
	ledger := NewSyncLedger()
	for _, id := range []string{"z", "a", "m"} {
		if _, err := ledger.Put("alice", id, 0, encryptedFixture(t, "alice", id)); err != nil {
			t.Fatal(err)
		}
	}
	if _, err := ledger.Put("bob", "private", 0, encryptedFixture(t, "bob", "private")); err != nil {
		t.Fatal(err)
	}
	if err := ledger.Delete("alice", "m", 1); err != nil {
		t.Fatal(err)
	}
	items, cursor, err := ledger.Snapshot("alice")
	if err != nil || cursor != 4 || len(items) != 2 || items[0].ID != "a" || items[1].ID != "z" {
		t.Fatalf("scope tombstone leaked or non-deterministic order: %+v %d %v", items, cursor, err)
	}
	bob, bobCursor, err := ledger.Snapshot("bob")
	if err != nil || bobCursor != 1 || len(bob) != 1 || bob[0].ID != "private" {
		t.Fatalf("other synthetic scope invalid: %+v %d %v", bob, bobCursor, err)
	}
	items[0].Envelope.Ciphertext[0] ^= 1
	repeat, _, err := ledger.Snapshot("alice")
	if err != nil || bytes.Equal(items[0].Envelope.Ciphertext, repeat[0].Envelope.Ciphertext) {
		t.Fatal("snapshot data was not deep-copied")
	}
}

func TestSnapshotInvalidInputsAndNoPhantomScope(t *testing.T) {
	ledger := NewSyncLedger()
	for _, scope := range []string{"", "bad/scope", "!"} {
		if _, _, err := ledger.Snapshot(scope); !errors.Is(err, ErrInvalid) {
			t.Errorf("scope %q: %v", scope, err)
		}
	}
	if _, _, err := (*SyncLedger)(nil).Snapshot("valid"); !errors.Is(err, ErrInvalid) {
		t.Fatal("nil ledger accepted")
	}
	if _, err := (*Store)(nil).Snapshot("valid"); !errors.Is(err, ErrInvalid) {
		t.Fatal("nil store accepted")
	}
	items, cursor, err := ledger.Snapshot("unused")
	if err != nil || cursor != 0 || len(items) != 0 || len(ledger.cursors) != 0 {
		t.Fatalf("read created account: %+v %d %v", items, cursor, err)
	}
}

func TestSyntheticSnapshotCursorIsAtomicWithConcurrentWrites(t *testing.T) {
	ledger := NewSyncLedger()
	var wg sync.WaitGroup
	wg.Add(1)
	go func() {
		defer wg.Done()
		for i := 0; i < 32; i++ {
			id := fmt.Sprintf("item_%02d", i)
			if _, err := ledger.Put("scope", id, 0, encryptedFixture(t, "scope", id)); err != nil {
				t.Error(err)
				return
			}
		}
	}()
	for i := 0; i < 32; i++ {
		items, cursor, err := ledger.Snapshot("scope")
		if err != nil {
			t.Fatal(err)
		}
		if cursor != uint64(len(items)) {
			t.Fatalf("snapshot and cursor inconsistent: %d items at cursor %d", len(items), cursor)
		}
	}
	wg.Wait()
	items, cursor, err := ledger.Snapshot("scope")
	if err != nil || len(items) != 32 || cursor != 32 {
		t.Fatalf("final snapshot inconsistent: %d at %d %v", len(items), cursor, err)
	}
}
