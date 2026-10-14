# 0006: Contact channels and "Contacts Initiated"

- **Status:** Proposed (DEC-03) · **Date:** 2026-10-14 · **Requirements:** F10, F11, S5, S6

## Decision

- **Channels.** Each alumnus chooses which channels appear on their published profile: email, phone, LinkedIn, Facebook, Instagram, website. Stored in `profile_contact_channels` (type, value, `is_public`). **At least one public channel is required to publish.**
- **Who can read what.**
  - Link-type channels (LinkedIn, Facebook, Instagram, website) are readable by members of the same institution when the profile is published.
  - **Email and phone are never readable through table access.** They are revealed one profile at a time by `initiate_contact(profile_id, channel)`.
- **Checks in `initiate_contact`.** The caller is an active member of the same institution. The target is published and has that channel public. The caller is under the limit of **20 reveals per 24 h**.
- **Logging.** Each reveal writes a `contact_events` row: institution, initiating user, recipient profile, channel, time. Repeat clicks on the same recipient and channel within 24 h return the value without a new event.
- **The metric.** "Contacts initiated" counts these events. It is **not** evidence that a message was sent, delivered, read or answered, and the admin UI labels it that way.
- **What we never do.** We do not read or store email content. There is no bulk export of contact values for members.

## Alternatives

A relay form ("message via the network") hides addresses entirely, but adds email volume and abuse handling. It is deferred to a future module (FUT-11).
