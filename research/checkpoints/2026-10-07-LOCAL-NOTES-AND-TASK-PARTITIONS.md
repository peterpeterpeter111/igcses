# Local notes access and safe task partitions — 7 October 2026

Continued local fbe757ca159b7d200bb3ebcea277f329b791c607 and preserved the unfinished task-partition migration. Both allowances now return; latest observed 35% five-hour /90% weekly remaining. Resume gate is satisfied. No reset used.

## Completed

- Created executable /Users/peterstudymac/Desktop/IGCSE Notes.command. It invokes scripts/open-local-notes.command, starts the existing local library if needed, reuses a running IGCSE server and opens the notes. Keep its Terminal window open while using notes. Port conflicts fail explicitly without replacing another server. Tested startup, reuse and the Biology reader in the browser; screenshot work/desktop-local-notes-proof-2026-10-07.png.
- Completed the six-subject task partition migration. All 171 logical rows and every field match the preceding committed monolithic CSV. Root tasks.csv is header-only; declared subject files contain 42 Human Biology,29 Biology,0 Chemistry,51 Physics,11 English and38 Maths rows. Canonical identity/schema/path/duplicate guards apply to readers and writers.
- All five exporters read the logical table, prepare their own output, reject foreign changes and leave other partitions untouched. Tests cover eleven invalid read cases, seven invalid output cases and repeatable owner-only writes across all five exporters.
- Six encoded partition requests range from708 to57,942 bytes, below the unchanged195,000-byte bound. The old single request was187,014 bytes. See research/reviews/2026-10-07-task-partition-migration.json for exact field-preservation proof.

## Verified

182 application tests pass; types, lint,16 research checks, evidence reconciliation, production build and public scan124 files/zero findings pass. No notes, application data or D1 changes; the prior isolated D1 proof remains current. git diff --check passes. Local notes are available at http://localhost:3000 while the launcher server runs.

## Honest coverage and next step

36 partial note documents /1,056 original sections /36 routes.796 reviewed numbered identities,796 partial audit parents,2,824 local requirements,1,354 partial numbered teaching links; English separately6 official objectives/41 partial links. Seven obtained paper/scheme pairs. Detailed Physics51 parts/110 marks,Maths38/100,Human Biology42/90,Biology29 Q1–Q6 parts/65 marks; English one detailed2-mark pilot. Biology visual structural inventory45 parts/110 marks is separate from detailed processing. Sixteen Biology parts Q7–Q10 remain.

Zero fully processed papers, complete chapters/points/objectives or active exam templates. Seven provisional offline families; separate lesson self-assessment works across all six subjects. Live AI remains unconfigured and last.

Existing owner-private publication https://igcses-study.peterwu2311.chatgpt.site is the earlier verified application release9e1621b/GitHuba89b5a1, not this storage/launcher checkpoint. No new Sites version/deployment was made in this phase. Preserve the existing interface and both histories; non-force sync the new committed tree, then continue Q7 detailed extraction, current/historical/AO/experimental audits and calibrated templates. Check both allowances after major phases and checkpoint/pause at5% in either.
