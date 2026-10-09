"""Synthetic regression coverage: never authorizes real vault access."""
import unittest
from tools.lock_lifecycle_reference import Event, LockSnapshot, LockState, transition


class LockLifecycleReferenceTests(unittest.TestCase):
    def test_default_is_locked(self):
        self.assertEqual(LockSnapshot(), LockSnapshot(LockState.LOCKED, False))

    def test_unlock_request_never_grants_access(self):
        requested = transition(LockSnapshot(), Event.REQUEST_UNLOCK)
        self.assertEqual(requested, LockSnapshot(LockState.UNLOCK_REQUESTED, True))
        self.assertEqual(transition(requested, Event.REQUEST_UNLOCK), requested)

    def test_all_interruptions_lock(self):
        pending = transition(LockSnapshot(), Event.REQUEST_UNLOCK)
        for event in (Event.CANCEL_UNLOCK, Event.BACKGROUND, Event.SESSION_EXPIRED,
                      Event.PROFILE_SWITCHED, Event.DEVICE_LOCKED, Event.LOGOUT,
                      Event.UNKNOWN):
            with self.subTest(event=event):
                self.assertEqual(transition(pending, event), LockSnapshot())

    def test_invalid_input_fails_closed(self):
        invalid = (None, "unlock", 42, LockSnapshot("unlocked", True),
                   LockSnapshot(LockState.UNLOCK_REQUESTED, "yes"))
        for snapshot in invalid:
            with self.subTest(snapshot=snapshot):
                self.assertEqual(transition(snapshot, Event.REQUEST_UNLOCK), LockSnapshot())
        self.assertEqual(transition(LockSnapshot(), "unlock_success"), LockSnapshot())

    def test_state_space_never_has_unlocked_output(self):
        for state in LockState:
            for pending in (False, True):
                for event in Event:
                    with self.subTest(state=state, pending=pending, event=event):
                        outcome = transition(LockSnapshot(state, pending), event)
                        self.assertIsInstance(outcome.state, LockState)
                        self.assertIn(outcome.state, (LockState.LOCKED, LockState.UNLOCK_REQUESTED))
                        self.assertEqual(outcome.pending_attempt,
                                         outcome.state == LockState.UNLOCK_REQUESTED)

    def test_snapshot_is_immutable(self):
        pending = transition(LockSnapshot(), Event.REQUEST_UNLOCK)
        with self.assertRaises(AttributeError):
            pending.pending_attempt = False


if __name__ == "__main__":
    unittest.main()
