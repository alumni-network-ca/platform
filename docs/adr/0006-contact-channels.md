# 0006: Contact channels and "Contacts Initiated"

- **Status:** Accepted (DEC-02, DEC-03, 2026-10-26) · **Date:** 2026-10-14 · **Requirements:** F10, F11, S5, S6

## Decision

- **Channels.** Each alumnus chooses which channels appear on their published profile: email, phone, LinkedIn, Facebook, Instagram, website. Stored in `profile_contact_channels` (type, value, `is_public`).
- **Channels are optional.** A profile can be published with none. It then shows "No contact details shared".
- **Who can read what.**
  - Link-type channels (LinkedIn, Facebook, Instagram, website) are readable by members of the same school when the profile is published.
  - **Email and phone are never readable through table access.** They are revealed one profile at a time by `initiate_contact(profile_id, channel)`.
- **Checks in `initiate_contact`.** The caller is an active member of the same school, and the target is published and has that channel public. There is **no daily limit**.
- **Logging.** Each reveal writes a `contact_events` row: school, initiating user, recipient profile, channel, time. Repeat clicks on the same recipient and channel within 24 h return the value without a new event. Admins can see unusual volumes in these events.
- **The metric.** "Contacts initiated" counts these events. It is **not** evidence that a message was sent, delivered, read or answered, and the admin UI labels it that way.
- **What we never do.** We do not read or store email content. There is no bulk export of contact values for members.

## Alternatives

A relay form ("message via the network") hides addresses entirely, but adds email volume and abuse handling. It is deferred to a future module (FUT-11). A daily reveal limit was considered and dropped (DEC-03); it can be added in `initiate_contact` if abuse appears.
