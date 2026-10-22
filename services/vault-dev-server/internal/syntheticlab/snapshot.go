package syntheticlab

import "sort"

// SnapshotItem is an opaque *synthetic-only* item revision. It contains no
// server-managed key, plaintext or authenticated account assertion.
type SnapshotItem struct {
	ID       string
	Revision uint64
	Envelope Envelope
}

// Snapshot returns defensive copies of the current in-memory ciphertext
// records for one synthetic scope, ordered for deterministic test fixtures.
func (s *Store) Snapshot(scope string) ([]SnapshotItem, error) {
	if s == nil || !identifier.MatchString(scope) {
		return nil, ErrInvalid
	}
	s.mu.RLock()
	defer s.mu.RUnlock()
	group := s.records[scope]
	items := make([]SnapshotItem, 0, len(group))
	for id, entry := range group {
		items = append(items, SnapshotItem{ID: id, Revision: entry.revision, Envelope: clone(entry.envelope)})
	}
	sort.Slice(items, func(i, j int) bool { return items[i].ID < items[j].ID })
	return items, nil
}

// Snapshot obtains current synthetic ciphertext state and the journal cursor
// under the same lock. A client can resume Pull(scope,cursor) afterwards
// without losing an intervening concurrent mutation. It must still handle
// history expiration and perform another snapshot if necessary.
func (s *SyncLedger) Snapshot(scope string) ([]SnapshotItem, uint64, error) {
	if s == nil || !identifier.MatchString(scope) {
		return nil, 0, ErrInvalid
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	items, err := s.store.Snapshot(scope)
	if err != nil {
		return nil, 0, err
	}
	return items, s.cursors[scope], nil
}
