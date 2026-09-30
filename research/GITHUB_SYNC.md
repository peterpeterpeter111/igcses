# Source sync procedure

The repository is peterpeterpeter111/igcses; branch main. Use the connected GitHub app for authenticated writes. Public Git reads work, but ordinary HTTPS Git currently has no saved write login. Do not expose, extract or invent credentials.

## Verified repair
On 28 September 2026, remote d4b62689b09a94f3b8329b77b899d027b2509d22 exactly matched local ec211b692315f8fd612d449adeb6575bcec266b8: tree abbd5e4d3a24dc95298294966f8596914885d042. The remote commit is a non-force descendant of bfd2ed317aeebc81629ddf6bec670c5b1e146745. Local history was not rewritten. The documentation after that verification requires its own mirror; compare actual HEAD and the fetched remote tree rather than treating this older pair as permanently current.

## Prepare
1. Ensure intended changes are committed. Review tracked source for accidental credentials, raw PDFs, generated output or other private artifacts. Keep work/, dependencies, secrets and build output ignored.
2. Fetch `refs/heads/main` from `https://github.com/peterpeterpeter111/igcses.git` into `refs/remotes/github/main`. Compare against the last saved mirror. Reconcile any unexpected remote work rather than replacing it.
3. Run `python3 scripts/prepare-github-sync.py --base github/main --output-dir work/github-sync/NEW-UNIQUE-DIRECTORY`. It only reads committed source and writes ignored request files; it makes no network calls.
4. Inspect plan.json: base commit/tree, target local commit/tree, changed paths, exact request byte sizes. The maximum serialized request is 195000 UTF-8 bytes, below the former 200000-byte review limit. The script refuses an oversized individual file, non-text content or unsupported modes. It does not split a file, encode it to hide content, transform source data or update branches.

## Submit and verify
Submit each batch through the normal reviewed GitHub create_tree tool. For the first, replace base_tree_sha with plan.baseTree; for each later batch use the preceding returned tree SHA. Keep returned SHAs for resumption. Stop on any rejection or error; do not bypass approval review. These intermediate trees do not modify main.

After the final tree is returned, require exact equality with plan.targetTree. Check main still points to plan.baseCommit. Create a mirror commit with that remote parent and the verified tree, mentioning plan.localCommit in the message. Update main with force=false. Fetch again, compare complete trees with the saved local snapshot, and verify the prior remote commit remains an ancestor. A successful API write alone is not sufficient verification.

Remote mirror commits and local development commits have different IDs but identical trees. This preserves the established separate local and GitHub histories. Do not reset, rebase, force-push or pretend the local commit IDs were uploaded as the remote history. If preserving every local commit on GitHub becomes required, arrange an authenticated normal Git transfer and reconcile histories explicitly.

## Oversized source
The Physics extraction JSON was 237889 bytes. Removing formatting whitespace reduced it to 155370 bytes; parsed JSON equality and all 85 application tests, typecheck and 13 research checks passed. No keys, strings, numbers, ordering within arrays or evidence were removed. Its earlier formatting remains in local history. Any future oversized file requires a separately reviewed lossless change or another approved route; do not silently truncate evidence.

No website deployment, AI configuration or reset credit is part of source sync.

## Coverage table storage — 30 September 2026
The growing coverage table is now stored in six explicitly declared subject CSVs. The root coverage.csv is the schema header; coverage-partitions.json lists every file. The shared reader and exporter validate all partitions. Migration preserved every row and field string with matching canonical hashes; see LEDGER_COLUMNS.md and the migration report. These are ordinary full-text source files in each reviewed request. The sync planner itself still cannot split or transform any file, and its 195000-byte cap is unchanged.
