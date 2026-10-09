"""Fail-closed, metadata-only lock-state reference model.

No keys, authentication, unlock ceremony, persistence, or secret data.
This model MUST NOT be used to authorize access to real vault contents.
"""
from dataclasses import dataclass
from enum import Enum


class LockState(str, Enum):
    LOCKED = "locked"
    UNLOCK_REQUESTED = "unlock_requested"


class Event(str, Enum):
    REQUEST_UNLOCK = "request_unlock"
    CANCEL_UNLOCK = "cancel_unlock"
    BACKGROUND = "background"
    SESSION_EXPIRED = "session_expired"
    PROFILE_SWITCHED = "profile_switched"
    DEVICE_LOCKED = "device_locked"
    LOGOUT = "logout"
    UNKNOWN = "unknown"


@dataclass(frozen=True)
class LockSnapshot:
    state: LockState = LockState.LOCKED
    pending_attempt: bool = False


def transition(snapshot: LockSnapshot, event: Event) -> LockSnapshot:
    """Return an immutable, fail-closed snapshot.

    Events are strictly typed, unrecognized inputs or invalid snapshots fail
    closed. No transition can produce an authenticated/unlocked state.
    """
    if not isinstance(snapshot, LockSnapshot) or not isinstance(event, Event):
        return LockSnapshot()
    if not isinstance(snapshot.state, LockState) or not isinstance(snapshot.pending_attempt, bool):
        return LockSnapshot()
    if snapshot.state == LockState.LOCKED and snapshot.pending_attempt:
        return LockSnapshot()
    if snapshot.state == LockState.UNLOCK_REQUESTED and not snapshot.pending_attempt:
        return LockSnapshot()
    if event == Event.REQUEST_UNLOCK and snapshot.state == LockState.LOCKED:
        return LockSnapshot(LockState.UNLOCK_REQUESTED, True)
    if event == Event.REQUEST_UNLOCK and snapshot.state == LockState.UNLOCK_REQUESTED:
        return snapshot
    return LockSnapshot()
