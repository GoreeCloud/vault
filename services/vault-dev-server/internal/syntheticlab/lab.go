// Package syntheticlab models client-side ciphertext creation and ephemeral
// opaque storage in isolated Go tests. It is NOT imported by the Vault server,
// exposes no HTTP endpoints and must never hold real credentials or keys.
package syntheticlab

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"errors"
	"regexp"
	"sync"
)

const (
	MaxScopes        = 16
	MaxItemsPerScope = 32
	MaxPlaintext     = 4096
	MaxCiphertext    = MaxPlaintext + 16
	NonceSize        = 12
)

var (
	ErrInvalid  = errors.New("synthetic contract: invalid input")
	ErrNotFound = errors.New("synthetic contract: not found")
	ErrConflict = errors.New("synthetic contract: revision conflict")
	ErrCapacity = errors.New("synthetic contract: capacity exceeded")
)
var identifier = regexp.MustCompile("^[a-zA-Z0-9_-]{1,64}$")

type Envelope struct {
	Nonce      []byte
	Ciphertext []byte
}
type record struct {
	envelope Envelope
	revision uint64
}
type Store struct {
	mu      sync.RWMutex
	records map[string]map[string]record
}

func NewStore() *Store { return &Store{records: make(map[string]map[string]record)} }

func validIDs(scope, id string) bool {
	return identifier.MatchString(scope) && identifier.MatchString(id)
}

func clone(e Envelope) Envelope {
	return Envelope{
		Nonce:      append([]byte(nil), e.Nonce...),
		Ciphertext: append([]byte(nil), e.Ciphertext...),
	}
}
func associatedData(scope, id string) []byte {
	return []byte(scope + "\x00" + id)
}

// Encrypt models the client responsibility for encryption; keys are never
// provided to Store. The caller is responsible for its own synthetic key.
func Encrypt(key [32]byte, scope, id string, plaintext []byte) (Envelope, error) {
	if !validIDs(scope, id) || len(plaintext) == 0 || len(plaintext) > MaxPlaintext {
		return Envelope{}, ErrInvalid
	}
	block, err := aes.NewCipher(key[:])
	if err != nil {
		return Envelope{}, err
	}
	aead, err := cipher.NewGCM(block)
	if err != nil {
		return Envelope{}, err
	}
	nonce := make([]byte, aead.NonceSize())
	if _, err = rand.Read(nonce); err != nil {
		return Envelope{}, err
	}
	ciphertext := aead.Seal(nil, nonce, plaintext, associatedData(scope, id))
	return Envelope{Nonce: nonce, Ciphertext: ciphertext}, nil
}
func Decrypt(key [32]byte, scope, id string, e Envelope) ([]byte, error) {
	if !validIDs(scope, id) || len(e.Nonce) != NonceSize ||
		len(e.Ciphertext) < 16 || len(e.Ciphertext) > MaxCiphertext {
		return nil, ErrInvalid
	}
	block, err := aes.NewCipher(key[:])
	if err != nil {
		return nil, err
	}
	aead, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}
	plaintext, err := aead.Open(nil, e.Nonce, e.Ciphertext, associatedData(scope, id))
	if err != nil {
		return nil, ErrInvalid
	}
	return plaintext, nil
}

// Put applies optimistic concurrency with scoped, in-memory-only revisions.
// The store knows only opaque bytes and synthetic scope identifiers.
func (s *Store) Put(scope, id string, expected uint64, e Envelope) (uint64, error) {
	if s == nil || !validIDs(scope, id) || len(e.Nonce) != NonceSize ||
		len(e.Ciphertext) < 16 || len(e.Ciphertext) > MaxCiphertext {
		return 0, ErrInvalid
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.records == nil {
		s.records = make(map[string]map[string]record)
	}
	group, ok := s.records[scope]
	if !ok {
		if expected != 0 {
			return 0, ErrConflict
		}
		if len(s.records) >= MaxScopes {
			return 0, ErrCapacity
		}
		group = make(map[string]record)
		s.records[scope] = group
	}
	old, found := group[id]
	if !found && expected != 0 {
		return 0, ErrConflict
	}
	if found && old.revision != expected {
		return 0, ErrConflict
	}
	if !found && len(group) >= MaxItemsPerScope {
		return 0, ErrCapacity
	}
	next := expected + 1
	group[id] = record{envelope: clone(e), revision: next}
	return next, nil
}

func (s *Store) Get(scope, id string) (Envelope, uint64, error) {
	if s == nil || !validIDs(scope, id) {
		return Envelope{}, 0, ErrInvalid
	}
	s.mu.RLock()
	defer s.mu.RUnlock()
	entry, ok := s.records[scope][id]
	if !ok {
		return Envelope{}, 0, ErrNotFound
	}
	return clone(entry.envelope), entry.revision, nil
}
func (s *Store) Delete(scope, id string, expected uint64) error {
	if s == nil || !validIDs(scope, id) {
		return ErrInvalid
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	group := s.records[scope]
	entry, ok := group[id]
	if !ok {
		return ErrNotFound
	}
	if entry.revision != expected {
		return ErrConflict
	}
	delete(group, id)
	// Entire scope is removed when empty, so limits remain bounded.
	if len(group) == 0 {
		delete(s.records, scope)
	}
	return nil
}
