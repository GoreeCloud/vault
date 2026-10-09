"""Development-only adversarial checks for concrete, immutable lock snapshots."""
import unittest
from tools.lock_lifecycle_reference import Event, LockSnapshot, LockState, transition


class Impostor(LockSnapshot):
    """Forges a pending unlock request while storing a default locked snapshot."""
    reads = 0

    def __getattribute__(self, key):
        if key in ("state", "pending_attempt"):
            object.__setattr__(self, "reads", object.__getattribute__(self, "reads") + 1)
            return LockState.UNLOCK_REQUESTED if key == "state" else True
        return super().__getattribute__(key)


class LockSnapshotSubtypeSecurityTests(unittest.TestCase):
    def test_adversarial_snapshot_subtype_is_never_accepted_or_returned(self):
        forged = Impostor()
        output = transition(forged, Event.REQUEST_UNLOCK)
        self.assertIs(type(output), LockSnapshot)
        self.assertEqual(output, LockSnapshot())
        self.assertIsNot(output, forged)

    def test_no_attacker_overridden_getter_is_invoked(self):
        forged = Impostor()
        result = transition(forged, Event.REQUEST_UNLOCK)
        self.assertIs(type(result), LockSnapshot)
        self.assertEqual(object.__getattribute__(forged, "reads"), 0)

    def test_normal_exact_snapshots_remain_supported(self):
        pending = transition(LockSnapshot(), Event.REQUEST_UNLOCK)
        self.assertIs(type(pending), LockSnapshot)
        self.assertEqual(pending, LockSnapshot(LockState.UNLOCK_REQUESTED, True))
        self.assertEqual(transition(pending, Event.SESSION_EXPIRED), LockSnapshot())


if __name__ == "__main__":
    unittest.main()
