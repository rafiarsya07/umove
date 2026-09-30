-- Face photos for runners (and drivers). A requester sees their runner's photo
-- once the runner has taken the request, so they know who is coming.
--
-- The photo comes from the face photo in the runner application and is copied
-- here when an admin approves it. (A driver's selfie shows their matric card,
-- so it is never used.) Runners approved before this change send one from
-- Settings. A runner can send a new photo later; it waits as
-- "pending" (the approved one stays in use) until an admin reviews it.
-- Photos are only ever served to admins, to the owner, and to the requester of
-- an order the runner has taken.

CREATE TABLE profile_photos (
  user_id       UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  mime          TEXT CHECK (mime IN ('image/jpeg', 'image/png', 'image/webp')),
  data          BYTEA CHECK (length(data) BETWEEN 100 AND 3000000),
  approved_at   TIMESTAMPTZ,
  pending_mime  TEXT CHECK (pending_mime IN ('image/jpeg', 'image/png', 'image/webp')),
  pending_data  BYTEA CHECK (length(pending_data) BETWEEN 100 AND 3000000),
  pending_at    TIMESTAMPTZ,
  reason        TEXT CHECK (length(reason) <= 300),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK ((data IS NULL) = (mime IS NULL) AND (data IS NULL) = (approved_at IS NULL)),
  CHECK ((pending_data IS NULL) = (pending_mime IS NULL) AND (pending_data IS NULL) = (pending_at IS NULL))
);
CREATE INDEX profile_photos_pending ON profile_photos (pending_at) WHERE pending_data IS NOT NULL;
