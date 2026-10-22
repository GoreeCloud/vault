package syntheticlab

import (
	"errors"
	"fmt"
	"testing"
)

func TestDeletedItemCannotBeRecreatedWithStaleRevision(t *testing.T) {
	s := NewStore()
	e := encryptedFixture(t, "synthetic_account", "item")
	rev, err := s.Put("synthetic_account", "item", 0, e)
	if err != nil || rev != 1 {
		t.Fatalf("creation: %d %v", rev, err)
	}
	if err := s.Delete("synthetic_account", "item", 1); err != nil {
		t.Fatal(err)
	}
	if _, _, err := s.Get("synthetic_account", "item"); !errors.Is(err, ErrNotFound) {
		t.Fatalf("deleted content still readable: %v", err)
	}
	if _, err := s.Put("synthetic_account", "item", 0, e); !errors.Is(err, ErrConflict) {
		t.Fatalf("stale revision zero resurrected item: %v", err)
	}
	if _, err := s.Put("synthetic_account", "item", 1, e); !errors.Is(err, ErrConflict) {
		t.Fatalf("stale pre-deletion revision resurrected item: %v", err)
	}
	newRev, err := s.Put("synthetic_account", "item", 2, e)
	if err != nil || newRev != 3 {
		t.Fatalf("explicit recreation: %d %v", newRev, err)
	}
	if _, readRev, err := s.Get("synthetic_account", "item"); err != nil || readRev != 3 {
		t.Fatalf("revision reset unexpectedly: %d %v", readRev, err)
	}
}

func TestLedgerTombstoneMonotonicAndReplayProtection(t *testing.T) {
	l := NewSyncLedger()
	e := encryptedFixture(t, "alice", "same")
	if _, err := l.Put("alice", "same", 0, e); err != nil {
		t.Fatal(err)
	}
	if err := l.Delete("alice", "same", 1); err != nil {
		t.Fatal(err)
	}
	if _, err := l.Put("alice", "same", 0, e); !errors.Is(err, ErrConflict) {
		t.Fatal("stale create accepted")
	}
	if _, err := l.Put("alice", "same", 1, e); !errors.Is(err, ErrConflict) {
		t.Fatal("stale update accepted")
	}
	if _, cursor, err := l.Pull("alice", 0); err != nil || cursor != 2 {
		t.Fatalf("rejected writes advanced cursor %d %v", cursor, err)
	}
	rev, err := l.Put("alice", "same", 2, e)
	if err != nil || rev != 3 {
		t.Fatalf("recreate rev=%d err=%v", rev, err)
	}
	changes, cursor, err := l.Pull("alice", 0)
	if err != nil || len(changes) != 3 || cursor != 3 {
		t.Fatalf("unexpected journal: %+v %d %v", changes, cursor, err)
	}
	if changes[0].Revision != 1 || changes[1].Revision != 2 || !changes[1].Deleted || changes[2].Revision != 3 || changes[2].Deleted {
		t.Fatal("non-monotonic tombstone lifecycle")
	}
}

func TestDeletedCiphertextExcludedFromSyntheticSnapshots(t *testing.T) {
	l := NewSyncLedger()
	e := encryptedFixture(t, "alice", "id")
	if _, err := l.Put("alice", "id", 0, e); err != nil {
		t.Fatal(err)
	}
	if err := l.Delete("alice", "id", 1); err != nil {
		t.Fatal(err)
	}
	items, cursor, err := l.Snapshot("alice")
	if err != nil || cursor != 2 || len(items) != 0 {
		t.Fatalf("deleted ciphertext in snapshot: %+v %d %v", items, cursor, err)
	}
	if _, err := l.Put("alice", "id", 2, e); err != nil {
		t.Fatal(err)
	}
	items, cursor, err = l.Snapshot("alice")
	if err != nil || cursor != 3 || len(items) != 1 || items[0].Revision != 3 {
		t.Fatalf("recreated item missing: %+v %d %v", items, cursor, err)
	}
}

func TestTombstoneCapacityIsBounded(t *testing.T) {
	l := NewSyncLedger()
	for i := 0; i < MaxItemsPerScope; i++ {
		id := fmt.Sprintf("item_%02d", i)
		env := encryptedFixture(t, "synthetic", id)
		if _, err := l.Put("synthetic", id, 0, env); err != nil {
			t.Fatal(err)
		}
		if err := l.Delete("synthetic", id, 1); err != nil {
			t.Fatal(err)
		}
	}
	if _, err := l.Put("synthetic", "new", 0, encryptedFixture(t, "synthetic", "new")); !errors.Is(err, ErrCapacity) {
		t.Fatalf("unbounded deleted item identifiers: %v", err)
	}
}
