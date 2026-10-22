package syntheticlab

import "sync"

// This journal is a synthetic in-memory interoperability contract. It is not
// imported by the native Vault server and carries no authenticated identities.
const (
	MaxJournalScopes = 16
	MaxJournalEvents = 64
	MaxPullEvents    = 16
)

type Change struct {
	Cursor   uint64
	ID       string
	Revision uint64
	Deleted  bool
	Envelope Envelope
}

// SyncLedger sequences opaque item mutations and bounded per-scope change
// histories. An expiring cursor must cause a full synthetic re-sync instead
// of returning a silently incomplete incremental result.
type SyncLedger struct {
	mu      sync.Mutex
	store   *Store
	streams map[string][]Change
	cursors map[string]uint64
}

func NewSyncLedger() *SyncLedger {
	return &SyncLedger{store: NewStore(), streams: make(map[string][]Change), cursors: make(map[string]uint64)}
}

func (s *SyncLedger) ensureScope(scope string) error {
	if !identifier.MatchString(scope) {
		return ErrInvalid
	}
	if _, exists := s.cursors[scope]; !exists && len(s.cursors) >= MaxJournalScopes {
		return ErrCapacity
	}
	return nil
}

func (s *SyncLedger) appendChange(scope, id string, revision uint64, deleted bool, env Envelope) {
	s.cursors[scope]++
	c := Change{Cursor: s.cursors[scope], ID: id, Revision: revision, Deleted: deleted, Envelope: clone(env)}
	if deleted {
		c.Envelope = Envelope{}
	}
	next := append(s.streams[scope], c)
	if len(next) > MaxJournalEvents {
		next = next[len(next)-MaxJournalEvents:]
	}
	s.streams[scope] = next
}

func (s *SyncLedger) Put(scope, id string, expected uint64, env Envelope) (uint64, error) {
	if s == nil || !validIDs(scope, id) {
		return 0, ErrInvalid
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	if err := s.ensureScope(scope); err != nil {
		return 0, err
	}
	rev, err := s.store.Put(scope, id, expected, env)
	if err != nil {
		return 0, err
	}
	s.appendChange(scope, id, rev, false, env)
	return rev, nil
}

func (s *SyncLedger) Delete(scope, id string, expected uint64) error {
	if s == nil || !validIDs(scope, id) {
		return ErrInvalid
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	if err := s.ensureScope(scope); err != nil {
		return err
	}
	if err := s.store.Delete(scope, id, expected); err != nil {
		return err
	}
	s.appendChange(scope, id, expected+1, true, Envelope{})
	return nil
}

func (s *SyncLedger) Pull(scope string, since uint64) ([]Change, uint64, error) {
	if s == nil || !identifier.MatchString(scope) {
		return nil, 0, ErrInvalid
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	current := s.cursors[scope]
	if since > current {
		return nil, 0, ErrInvalid
	}
	log := s.streams[scope]
	if len(log) == 0 {
		return []Change{}, current, nil
	}
	// Never imply that an incomplete truncated journal is a full history.
	if since < log[0].Cursor-1 {
		return nil, 0, ErrHistoryExpired
	}
	result := make([]Change, 0, MaxPullEvents)
	next := since
	for _, event := range log {
		if event.Cursor <= since {
			continue
		}
		c := event
		c.Envelope = clone(event.Envelope)
		result = append(result, c)
		next = c.Cursor
		if len(result) == MaxPullEvents {
			break
		}
	}
	if len(result) == 0 {
		return []Change{}, current, nil
	}
	return result, next, nil
}
