package syntheticlab

import (
	"bytes"
	"errors"
	"fmt"
	"sync"
	"sync/atomic"
	"testing"
)

func encryptedFixture(t *testing.T, scope, id string) Envelope {
	t.Helper()
	env, err := Encrypt(key(9), scope, id, []byte("SYNTHETIC_TEST_ITEM"))
	if err != nil {
		t.Fatal(err)
	}
	return env
}

func TestTwoSyntheticClientsObserveOpaqueChangeAndDeletion(t *testing.T) {
	ledger := NewSyncLedger()
	env := encryptedFixture(t, "alice", "item")
	revision, err := ledger.Put("alice", "item", 0, env)
	if err != nil || revision != 1 {
		t.Fatalf("put rev %d err %v", revision, err)
	}
	changes, cursor, err := ledger.Pull("alice", 0)
	if err != nil || cursor != 1 || len(changes) != 1 || changes[0].Deleted {
		t.Fatalf("initial pull cursor=%d changes=%+v err=%v", cursor, changes, err)
	}
	pt, err := Decrypt(key(9), "alice", "item", changes[0].Envelope)
	if err != nil || string(pt) != "SYNTHETIC_TEST_ITEM" {
		t.Fatal("second synthetic client cannot decrypt")
	}
	changes[0].Envelope.Ciphertext[0] ^= 1
	again, _, err := ledger.Pull("alice", 0)
	if err != nil || bytes.Equal(changes[0].Envelope.Ciphertext, again[0].Envelope.Ciphertext) {
		t.Fatal("journal leaked mutable byte buffer")
	}
	if err := ledger.Delete("alice", "item", revision); err != nil {
		t.Fatal(err)
	}
	changes, next, err := ledger.Pull("alice", cursor)
	if err != nil || next != 2 || len(changes) != 1 || !changes[0].Deleted ||
		changes[0].ID != "item" || len(changes[0].Envelope.Ciphertext) != 0 {
		t.Fatalf("missing tombstone: %+v cursor %d err %v", changes, next, err)
	}
	changes, next, err = ledger.Pull("alice", next)
	if err != nil || len(changes) != 0 || next != 2 {
		t.Fatal("empty sync page incorrect")
	}
}

func TestSyntheticTenantIsolationAndBadCursors(t *testing.T) {
	ledger := NewSyncLedger()
	_, err := ledger.Put("alice", "item", 0, encryptedFixture(t, "alice", "item"))
	if err != nil {
		t.Fatal(err)
	}
	_, cursor, err := ledger.Pull("bob", 0)
	if err != nil || cursor != 0 {
		t.Fatal("cross-scope cursor leak")
	}
	if _, _, err := ledger.Pull("bob", 1); !errors.Is(err, ErrInvalid) {
		t.Fatal("accepted future cursor")
	}
	if _, _, err := ledger.Pull("alice", 2); !errors.Is(err, ErrInvalid) {
		t.Fatal("accepted future cursor")
	}
	if _, _, err := ledger.Pull("bad/scope", 0); !errors.Is(err, ErrInvalid) {
		t.Fatal("accepted invalid scope")
	}
	if _, err := ledger.Put("bob", "item", 0, encryptedFixture(t, "bob", "item")); err != nil {
		t.Fatal(err)
	}
	alice, _, _ := ledger.Pull("alice", 0)
	bob, _, _ := ledger.Pull("bob", 0)
	if bytes.Equal(alice[0].Envelope.Ciphertext, bob[0].Envelope.Ciphertext) {
		t.Fatal("different scopes unexpectedly generated identical ciphertext")
	}
	if alice[0].ID != bob[0].ID {
		t.Fatal("fixture incorrect")
	}
}

func TestIncrementalPaginationAndHistoryExpiration(t *testing.T) {
	ledger := NewSyncLedger()
	for i := 0; i < MaxJournalEvents+7; i++ {
		env := encryptedFixture(t, "scope", "same")
		expected := uint64(i)
		if _, err := ledger.Put("scope", "same", expected, env); err != nil {
			t.Fatalf("put %d %v", i, err)
		}
	}
	if _, _, err := ledger.Pull("scope", 0); !errors.Is(err, ErrHistoryExpired) {
		t.Fatalf("history truncation ignored: %v", err)
	}
	firstCursor := uint64(7)
	events, cursor, err := ledger.Pull("scope", firstCursor)
	if err != nil || len(events) != MaxPullEvents || cursor != firstCursor+MaxPullEvents {
		t.Fatalf("page error: cursor %d, events %d, err %v", cursor, len(events), err)
	}
	received := len(events)
	for received < MaxJournalEvents {
		events, next, err := ledger.Pull("scope", cursor)
		if err != nil || next <= cursor || len(events) == 0 {
			t.Fatalf("pagination stuck: %d %v", next, err)
		}
		cursor = next
		received += len(events)
	}
	if received != MaxJournalEvents || cursor != uint64(MaxJournalEvents+7) {
		t.Fatalf("incomplete journal pagination: %d records at %d", received, cursor)
	}
}

func TestFailedWritesDoNotAdvanceCursor(t *testing.T) {
	ledger := NewSyncLedger()
	env := encryptedFixture(t, "scope", "id")
	if _, err := ledger.Put("scope", "id", 0, env); err != nil {
		t.Fatal(err)
	}
	if _, err := ledger.Put("scope", "id", 0, env); !errors.Is(err, ErrConflict) {
		t.Fatal("accepted stale write")
	}
	if err := ledger.Delete("scope", "id", 0); !errors.Is(err, ErrConflict) {
		t.Fatal("accepted stale deletion")
	}
	_, cursor, err := ledger.Pull("scope", 0)
	if err != nil || cursor != 1 {
		t.Fatalf("failed mutation advanced cursor to %d", cursor)
	}
}

func TestConcurrentMutationsHaveSingleSequenceWinner(t *testing.T) {
	ledger := NewSyncLedger()
	_, err := ledger.Put("scope", "id", 0, encryptedFixture(t, "scope", "id"))
	if err != nil {
		t.Fatal(err)
	}
	var success atomic.Int32
	var wg sync.WaitGroup
	for i := 0; i < 24; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			if _, err := ledger.Put("scope", "id", 1, encryptedFixture(t, "scope", "id")); err == nil {
				success.Add(1)
			}
		}()
	}
	wg.Wait()
	if success.Load() != 1 {
		t.Fatalf("expected one writer; got %d", success.Load())
	}
	changes, cursor, err := ledger.Pull("scope", 0)
	if err != nil || cursor != 2 || len(changes) != 2 || changes[0].Cursor != 1 || changes[1].Cursor != 2 {
		t.Fatalf("non-atomic journal sequence: %+v %d %v", changes, cursor, err)
	}
}

func TestJournalScopeLimitFailsBeforeWriting(t *testing.T) {
	ledger := NewSyncLedger()
	for i := 0; i < MaxJournalScopes; i++ {
		scope := fmt.Sprintf("synthetic_%d", i)
		if _, err := ledger.Put(scope, "id", 0, encryptedFixture(t, scope, "id")); err != nil {
			t.Fatal(err)
		}
	}
	if _, err := ledger.Put("overflow", "id", 0, encryptedFixture(t, "overflow", "id")); !errors.Is(err, ErrCapacity) {
		t.Fatal("new scope overflow not denied")
	}
	changes, cursor, err := ledger.Pull("overflow", 0)
	if err != nil || len(changes) != 0 || cursor != 0 {
		t.Fatal("failed overflow mutated journal")
	}
}
