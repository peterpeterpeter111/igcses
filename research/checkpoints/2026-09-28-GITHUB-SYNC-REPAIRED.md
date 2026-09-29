# GitHub sync repaired — 28 September 2026

User explicitly asked to prioritize fixing the GitHub sync issue. Read this before earlier pending-sync or approval-blocker entries, which are now historical.

## Root cause and repair
The old all-at-once connector tree request exceeded the 200000-byte approval-review limit. The Physics extraction JSON alone was 237889 bytes. Ordinary Git can fetch the public repository but a dry-run write check failed because no HTTPS username/credential is configured. The connected GitHub app has write permission.

Verified remote main remained bfd2ed317aeebc81629ddf6bec670c5b1e146745, whose tree exactly equals local 7746684. Compacted only the Physics JSON formatting to 155370 bytes, verifying parsed equality. Added scripts/prepare-github-sync.py, an offline committed-source planner with a 190000-byte serialized-request ceiling, explicit source/target hashes and no automatic network mutation. Its initial 180000-byte conservative ceiling refused the intact coverage CSV, so the ceiling was raised to 190000 (still below the actual review limit). No CSV content changed. Local commits 226edee and ec211b6 preserve ef37814 and every earlier commit.

All 14 separately reviewed tree requests succeeded, covering 153 changed/new files. Largest request: 188425 serialized UTF-8 bytes. No rejected request was hidden, compressed, truncated or resubmitted oversized. Intermediate trees were not published to main. Final returned tree exactly matched local abbd5e4d3a24dc95298294966f8596914885d042 before the branch moved.

Created GitHub mirror d4b62689b09a94f3b8329b77b899d027b2509d22 with parent bfd2ed317aeebc81629ddf6bec670c5b1e146745 and updated main with force=false. Fetched it back and verified zero tree differences from local ec211b692315f8fd612d449adeb6575bcec266b8, and confirmed the old remote tip remains an ancestor. Local history remains separate and unchanged; this is the established mirror workflow, not a claim that all local commit IDs were pushed.

## Validation and handoff
85 tests, typecheck and 13 research checks pass after compaction. Earlier product build/public scan remain applicable because only insignificant JSON formatting and the offline sync helper changed. No curriculum, marking, template status, site UI, D1 data or AI setup changed. No reset used; no Sites version or deployment.

The six specification rows, Mathematics B candidate, 50-page text-preparation report and all other previously unsynced source are now on GitHub. Seven obtained pairs include one unreviewed Mathematics B candidate; zero processed papers/active templates, 13 partial notes/197 sections and 248 parent identities/612 partial requirements remain unchanged.

The new headers and this checkpoint are a separate documentation delta being synced after the verified repair. Verify the latest local/remote trees for final current status. Follow research/GITHUB_SYNC.md for later non-force syncs; do not revive the old pending-approval blocker. Continue authorized curriculum/evidence/template work from latest source, preserving history and keeping AI last.
