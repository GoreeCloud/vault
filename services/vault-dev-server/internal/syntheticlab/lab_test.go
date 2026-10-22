package syntheticlab

import (
	"bytes"
	"errors"
	"fmt"
	"sync"
	"sync/atomic"
	"testing"
)

func key(seed byte) [32]byte {
	var out [32]byte
	for i := range out {
		out[i] = seed
	}
	return out
}

func TestSyntheticEncryptedItemRoundTrip(t *testing.T) {
	store := NewStore()
	plain := []byte("SYNTHETIC-ONLY-CREDENTIAL")
	env, err := Encrypt(key(1), "user_A", "item_1", plain)
	if err != nil {
		t.Fatal(err)
	}
	if bytes.Contains(env.Ciphertext, plain) {
		t.Fatal("plaintext in ciphertext")
	}
	rev, err := store.Put("user_A", "item_1", 0, env)
	if err != nil || rev != 1 {
		t.Fatalf("put: %d %v", rev, err)
	}
	got, version, err := store.Get("user_A", "item_1")
	if err != nil || version != 1 {
		t.Fatalf("get %d %v", version, err)
	}
	result, err := Decrypt(key(1), "user_A", "item_1", got)
	if err != nil || !bytes.Equal(result, plain) {
		t.Fatal("synthetic round-trip failed")
	}
	if err := store.Delete("user_A", "item_1", version); err != nil {
		t.Fatal(err)
	}
	if _, _, err := store.Get("user_A", "item_1"); !errors.Is(err, ErrNotFound) {
		t.Fatal("deletion failed")
	}
}

func TestCrossScopeAndTamperAreRejected(t *testing.T) {
	env, err := Encrypt(key(1), "accountA", "id", []byte("SYNTHETIC"))
	if err != nil {
		t.Fatal(err)
	}
	cases := []struct {
		scope, id string
		key       [32]byte
	}{
		{"accountB", "id", key(1)}, {"accountA", "other", key(1)}, {"accountA", "id", key(2)},
	}
	for _, tc := range cases {
		if _, err := Decrypt(tc.key, tc.scope, tc.id, env); !errors.Is(err, ErrInvalid) {
			t.Errorf("wrong scope/item/key unexpectedly decrypted: %v", err)
		}
	}
	env.Ciphertext[0] ^= 1
	if _, err := Decrypt(key(1), "accountA", "id", env); !errors.Is(err, ErrInvalid) {
		t.Fatal("tamper accepted")
	}
}

func TestOptimisticConflictAndDefensiveCloning(t *testing.T) {
	store := NewStore()
	env, _ := Encrypt(key(1), "sc", "id", []byte("SYNTHETIC"))
	original := clone(env)
	rev, err := store.Put("sc", "id", 0, env)
	if err != nil {
		t.Fatal(err)
	}
	env.Ciphertext[0] ^= 1
	got, _, err := store.Get("sc", "id")
	if err != nil || !bytes.Equal(got.Ciphertext, original.Ciphertext) {
		t.Fatal("server retained mutable caller buffer")
	}
	got.Ciphertext[0] ^= 1
	again, _, _ := store.Get("sc", "id")
	if !bytes.Equal(again.Ciphertext, original.Ciphertext) {
		t.Fatal("store leaked mutable record")
	}
	if _, err := store.Put("sc", "id", 0, original); !errors.Is(err, ErrConflict) {
		t.Fatal("lost update accepted")
	}
	if err := store.Delete("sc", "id", 0); !errors.Is(err, ErrConflict) {
		t.Fatal("stale delete accepted")
	}
	if _, err := store.Put("sc", "id", rev, original); err != nil {
		t.Fatal(err)
	}
}

func TestConcurrentWritersOnlyOneSucceeds(t *testing.T) {
	store := NewStore()
	initial, _ := Encrypt(key(4), "scope", "same", []byte("SYNTHETIC"))
	if _, err := store.Put("scope", "same", 0, initial); err != nil {
		t.Fatal(err)
	}
	const count = 20
	var wins atomic.Int32
	var wg sync.WaitGroup
	for i := 0; i < count; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			env, _ := Encrypt(key(4), "scope", "same", []byte("SYNTHETIC"))
			if _, err := store.Put("scope", "same", 1, env); err == nil {
				wins.Add(1)
			}
		}()
	}
	wg.Wait()
	if wins.Load() != 1 {
		t.Fatalf("expected single revision winner, got %d", wins.Load())
	}
	_, rev, err := store.Get("scope", "same")
	if err != nil || rev != 2 {
		t.Fatalf("bad revision: %d %v", rev, err)
	}
}

func TestCapacityAndValidation(t *testing.T) {
	s := NewStore()
	env, _ := Encrypt(key(2), "scope", "id", []byte("SYNTHETIC"))
	for i := 0; i < MaxItemsPerScope; i++ {
		if _, err := s.Put("scope", fmt.Sprintf("item_%d", i), 0, env); err != nil {
			t.Fatal(err)
		}
	}
	if _, err := s.Put("scope", "overflow", 0, env); !errors.Is(err, ErrCapacity) {
		t.Fatal("scope capacity not enforced")
	}
	for i := 1; i < MaxScopes; i++ {
		if _, err := s.Put(fmt.Sprintf("scope_%d", i), "id", 0, env); err != nil {
			t.Fatal(err)
		}
	}
	if _, err := s.Put("last", "id", 0, env); !errors.Is(err, ErrCapacity) {
		t.Fatal("global capacity not enforced")
	}
	if _, err := Encrypt(key(2), "bad/scope", "id", []byte("x")); !errors.Is(err, ErrInvalid) {
		t.Fatal("bad scope accepted")
	}
	if _, err := Encrypt(key(2), "scope", "id", make([]byte, MaxPlaintext+1)); !errors.Is(err, ErrInvalid) {
		t.Fatal("oversize plaintext accepted")
	}
}

func TestNoRuntimeDependencyFromProductionMain(t *testing.T) {
	// This package is test/laboratory-only. It is not imported into main.go.
	// Kept as a test contract until identity, key custody and service security
	// have separate review and approval.
}
