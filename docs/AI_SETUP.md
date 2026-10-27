# AI examiner integration

## Actual state

The server adapter, five-role review engine, persisted step/lease store, post-exam review controls and Generate summary action are implemented. Automated tests use synthetic responses and mocked HTTP; they are not a live provider test, independent examiner calibration or educational accuracy evidence.

At this implementation checkpoint there is no active OpenRouter connection, no configured Sites runtime AI credential, no approved live model-team calibration and no active exam template. The live examiner remains disabled. The academic ledger and all provisional template statuses are unchanged. Setting an environment flag cannot turn a provisional template or unreviewed model team into an approved one.

## Secure activation steps

1. Finish the owner's OpenRouter connection in the Composio secure form and verify Active status. The chat connector's connection is not a deployable backend credential.
2. Use a dedicated Composio developer project with its own OpenRouter connected account. Store `COMPOSIO_API_KEY` as a Sites runtime secret, plus the exact `COMPOSIO_OPENROUTER_ACCOUNT_ID` and a pinned `COMPOSIO_OPENROUTER_TOOL_VERSION`. The chat connector does not expose a reusable project key. Never copy chat/session credentials, paste secrets in chat, put them in source or use a public-prefixed environment value.
3. Discover exact requested model IDs through the active account. Require five distinct `:free` endpoints matching Gemma 4 31B, Nemotron 3 Ultra, Nemotron 3 Super, Nemotron 3.5 Super VL and Xing4.0 29B. Check identity, explicit zero pricing, endpoint availability, context, and modalities. A missing/ambiguous requested name requires clarification; do not invent an ID or silently replace it. Free-service limits and reliability are not guaranteed.
4. Run permitted, source-linked educational evaluations on the exact endpoints. Add a reviewed `approvedAiCalibrations` record in `server/ai/config.ts` only when there is real evidence. It pins the model map and tool version; a synthetic test fixture is not a release approval.
5. Set server-only `AI_COUNCIL_MODELS` to the five-role JSON mapping, `AI_CALIBRATION_ID` to the approved record, and `AI_ENABLED=true` only after live evaluation and source-bank readiness. Complete each subject's 3/4/6-mark question-family gates separately; the active family registry remains empty until proven.
6. Test the complete real flow, quota exhaustion and recovery. Build, scan public output, push exact source, save a Sites version and deploy. Report actual model calls and failures separately from simulated tests. No paid fallback is authorised.

## Runtime behaviour

Question generation uses approved server-owned generators and immutable source-linked packages. AI reviews those exact packages; it never retrieves a scheme by memory. All answers must be frozen before marking. Primary and second examiners are blind to one another initially. The evidence reviewer cannot hide a discrepancy, and the server retains the primary proposal explicitly as provisional when credit is disputed. Pattern claims require five nonblank answers and two distinct examples; isolated findings remain qualified.

The student clicks Generate summary only after the exam is marked. Gemma proposes teaching and the other four roles critique every evidenced finding. There are at most two critique rounds, with remaining concerns visible. Reports do not claim longitudinal progress without comparable prior attempts. All actual model response IDs are retained; hidden model reasoning is neither stored as a final explanation nor shown to students.

Each POST performs a bounded review step and saves it in D1. A lease prevents duplicate simultaneous calls. A timeout is uncertain, not automatic permission to call again; the UI requires an explicit uncertain retry. Rate-limit cooldowns are persisted. A stale response cannot overwrite a newer lease. Requests verify same origin, browser/account ownership, approved source families and question hashes. Provider failures do not expose raw bodies or credentials.

Completed summaries have an owner-checked read-only path independent of current provider setup, so a later outage does not erase access to saved reports. Exam-start request keys are bound to the browser profile and subject; retrying the same request returns the original attempt. Neither a page load nor a GET initiates an AI call.

Pseudonyms remain labels, not passwords. A random HttpOnly/Secure/SameSite browser capability plus the selected name's digest separates exam ownership across browsers. Profiles remain switchable within one browser, with no cross-device recovery promised. Existing local lesson summaries are preserved. No ChatGPT redirect is added to public library entry.

## References

- [Composio tool execution](https://docs.composio.dev/reference/v3/api-reference/tools/postToolsExecuteByToolSlug)
- [Composio tools and explicit versions](https://docs.composio.dev/reference/api-reference/tools)
- [OpenRouter API reference](https://openrouter.ai/docs/api_reference/overview)
- [OpenRouter rate limits](https://openrouter.ai/docs/api_reference/limits)

The adapter uses only the discovered `OPENROUTER_LIST_AVAILABLE_MODELS` and `OPENROUTER_CREATE_CHAT_COMPLETION` operations with a pinned version. Its credentials and transport live exclusively on the server. The discovered completion schema accepts plain messages, so strict JSON output is prompted and then validated; unsupported structured-output arguments are not invented.
