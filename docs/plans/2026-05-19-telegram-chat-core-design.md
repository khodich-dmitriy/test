# Telegram Chat Core Design

Goal: rebuild support chat behavior around explicit chat events so messages, reactions, replies, media, notifications, and support assignment stay synchronized for users and staff.

Approach:
- Store chat events alongside messages. SSE streams events for new messages, reaction changes, ticket assignment changes, and inactivity changes.
- Keep the mock storage local. Audio transcription is an MVP placeholder derived from uploaded audio metadata, with no external service.
- Use one shared composer shape for user and support: emoji, message input, attachment, microphone, camera/video circle mode, reply preview, and send.
- Distribute tickets with at most 3 active tickets per support staff member. A ticket becomes inactive for support after 10 minutes without user/support activity.
- Mobile reactions open through pointer/touch long press as well as the visible reaction button.

Verification:
- Unit tests for store behavior: one reaction per message, reaction events, reply metadata, media transcript metadata, assignment limit, inactivity.
- Component tests for live reaction updates, reply payloads, integrated composer controls, touch reaction picker, push-like toast and sound trigger.
- Full lint, unit, build, support-admin build, and e2e after implementation.
