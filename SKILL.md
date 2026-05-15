---
name: digital-twin-page
description: Maintain git-backed digital twin page state via assets/chat-config.json — display profile (pageProfile), chat appearance (chatEmbedConfig), and published AI config (publishedConfig).
---

# Digital Twin Page Skill

## Goal
Maintain one digital twin page configuration per repository. The `assets/chat-config.json` file is the source of truth for the page's **display profile** (`pageProfile`: title, description, avatar, banners, tags, taxonomy), **chat appearance** (`chatEmbedConfig`: hero, theme, public about sections, conversion, backgrounds), and **published AI runtime** (`publishedConfig`: assistant name, prompts, voice, connectors, tools, etc.) when a git repository is connected.

This skill scope is **only** `chat-config.json` and its contract. Workflow endpoint bindings and task orchestration for team agents are covered by the **team-agents** skill (`server/skills/team-agents/`), not this repository scaffold.

## Canonical Files
- `/SKILL.md`
- `/README.md` — human overview; **installation** via `npx` / `curl` / `install.sh` (same pattern as `server/skills/team-agents/`)
- `/cli.js`, `/install.sh`, `/package.json` — optional CLI pack to scaffold this tree into another repo (publish `go-digital-twin-page-skills` or copy from monorepo)
- `/scripts/`
- `/references/`
- `/assets/chat-config.json` — unified snapshot for profile + embed + publish (this document)

## Minimal payload example
`/assets/chat-config.json` is a single JSON object. A typical file looks like:

```json
{
  "schemaVersion": 1,
  "pageId": "<page-id>",
  "chatEmbedConfig": {
    "heroTitle": "...",
    "heroSubtitle": "...",
    "theme": "emerald",
    "themeMode": "light",
    "showThemeToggle": true
  },
  "publishedConfig": {
    "name": "...",
    "firstMessage": "...",
    "systemPrompt": "..."
  },
  "pageProfile": {
    "title": "...",
    "description": "...",
    "longDescription": "",
    "profilePicture": null,
    "bannerImage": null,
    "bannerType": null,
    "tags": [],
    "category": "",
    "subcategory": ""
  },
  "commitMessage": "Update chat config",
  "updatedAt": 1700000000000
}
```

Optional keys the backend may add or preserve when syncing:
- `endpointSummaries` — informational array (see root keys below).
- `includedAgents` — **deprecated**; do not rely on it for new work.

---

## Chat configuration reference (`assets/chat-config.json`)

Use this section when editing the file by hand, generating patches, or reviewing diffs. **Ground truth in code:** TypeScript type `ChatConfigPayload` in `server/src/services/digital-twin-page-git/types.ts`; `chatEmbedConfig` shape follows `ChatEmbedAppearanceConfig` in `app/utils/chatEmbedAppearance.ts`; `publishedConfig` follows the page’s stored publish payload (same conceptual shape as `DigitalTwinConfig` in `app/routes/teams/$teamSlug/team-workspaces/$unitSlug/components/configureDigitalTwin.types.ts`).

### Validation rules (backend)
- **`schemaVersion`** must be `1` for current writers/readers.
- **`pageId`** must exactly match the Mongo page id bound to this git repo; otherwise git reads may be rejected as invalid.
- **`chatEmbedConfig`** and **`publishedConfig`** are stored as JSON objects; unknown nested keys are generally preserved on round-trip unless the product strips them on save.
- **`pageProfile`** on **pull** is filtered to an allowlist and typed (see `pageProfile`); unknown keys are **ignored** for safety.

### Root object — every top-level key

| Key | Required | Purpose |
|-----|----------|---------|
| `schemaVersion` | yes | Protocol version; use `1`. |
| `pageId` | yes | Id of the digital twin page this file belongs to. |
| `chatEmbedConfig` | yes | Public chat **chrome**: hero copy, theme, backgrounds, optional structured “about” and conversion marketing blocks inside the embed. |
| `publishedConfig` | yes | **Published assistant** runtime: prompts, model, voice, connectors, output integration, etc. (see dedicated section). |
| `pageProfile` | optional on old files; written on new syncs | **Page document display** fields (title, description, avatar, banners, tags) mirrored for git editing. |
| `endpointSummaries` | optional | Non-authoritative list of `{ "id": string, "name": string, "isPrimary"?: boolean }` for UI/diff context. Live workflow endpoints are **not** defined here. |
| `includedAgents` | optional | **Deprecated.** Legacy included agents list; do not build new features on it. |
| `commitMessage` | optional | Human-readable note for the last logical change (convention, not always enforced). |
| `updatedAt` | yes | Unix time in **milliseconds** when this snapshot was written. |

---

### `pageProfile` — every key (allowlisted)

These keys mirror the **public page record** (not the chat column’s rich “about” JSON—that lives under `chatEmbedConfig.about`). On sync from DB, all keys are always present for stable diffs. On **pull from git**, only these keys are applied; types must match or the key is skipped.

| Key | Type | What to change |
|-----|------|----------------|
| `title` | `string` | Public page / twin headline (SEO, cards, layout). |
| `description` | `string` | Short description (SEO, summaries). |
| `longDescription` | `string` | Longer plain-text description for the **page**; distinct from structured about sections in `chatEmbedConfig.about`. |
| `profilePicture` | `string \| null` | URL (or null) for avatar / brand image on the page shell. |
| `bannerImage` | `string \| null` | Banner image URL, or null. |
| `bannerType` | `"image" \| "gradient" \| null` | How the banner is rendered when present. |
| `tags` | `string[]` | Discovery / filter tags; only string elements are kept on pull. |
| `category` | `string` | Top-level taxonomy label. |
| `subcategory` | `string` | Secondary taxonomy label. |

**Never put in `pageProfile`:** `pageSlug`, `visibility`, `sharedWith`, credits, owner ids, API keys, Twilio secrets—those stay database-only.

---

### `chatEmbedConfig` — every documented key

Type: `ChatEmbedAppearanceConfig` (`app/utils/chatEmbedAppearance.ts`). All keys are **optional** at the type level; the app merges with defaults when rendering.

#### Theme and typography
| Key | Type | What to change |
|-----|------|----------------|
| `theme` | palette name string | Named palette for primary/secondary/accent (e.g. values allowed by `PALETTES` in the app—`purple`, `emerald`, etc.). Persisted from chat publish UI as `theme`, not `selectedPalette`. |
| `fontFamily` | enum string | Built-in font stack key from `FONT_FAMILIES`. |
| `googleFontFamily` | `string` | Optional Google Font family name; overrides `fontFamily` when set. |
| `headingColor` | palette color name or `null` | Solid accent for hero heading instead of tri-color gradient. |
| `headingMonochrome` | `boolean` | When true, hero heading uses monochrome treatment in light/dark mode. |
| `themeMode` | `"light" \| "dark"` | Default embed chrome mode. |
| `showThemeToggle` | `boolean` | Whether users can switch light/dark in the embed. |
| `translationEnabled` | `boolean` | Enables translation affordances where the product supports them. |
| `defaultLanguage` | `string` | Default language code for translated UI strings. |

#### Hero and opening copy
| Key | Type | What to change |
|-----|------|----------------|
| `heroTitle` | `string` | Main headline above the chat. |
| `heroSubtitle` | `string` | Subheadline under the title. |
| `openingStatements` | `string[]` | Optional rotating short lines (product-dependent usage). |

#### Backgrounds
`ChatEmbedBackground` is `{ "type": "gradient" \| "image" \| "video", "value": string }` where `value` is a CSS gradient, image URL, or video URL/data URL as supported by the app.

| Key | Type | What to change |
|-----|------|----------------|
| `chatBackground` | `ChatEmbedBackground \| null` | Background behind the chat card. |
| `pageBackground` | `ChatEmbedBackground \| null` | Full-page backdrop behind the embed. |
| `chatBackgroundBlur` | `number` | Blur percent `0–100` for chat background. |
| `pageBackgroundBlur` | `number` | Blur percent `0–100` for page background. |
| `pageBackgroundOverlayOpacity` | `number` | Overlay darkness/opacity `0–100` on page background. |

#### `about` — structured public “about” (`PublicAboutConfig`)

Nested under `chatEmbedConfig.about`. Controls section order and copy for the marketing column / panels inside the public chat experience.

| Key | Type | What to change |
|-----|------|----------------|
| `navLabel` | `string` | Label for the about navigation. |
| `sectionOrder` | `string[]` | Order of section ids: `introduction`, `ingredients`, `models`, `languages`, `agent-to-agent`, `get-started`. |
| `introduction` | object | `{ enabled, label, title, body }` — hero-style intro block. |
| `ingredients` | object | `{ enabled, label, cards: [{ title, description, imageUrl? }] }`. |
| `models` | object | `{ enabled, label, groups: [{ title, items: string[] }] }`. |
| `languages` | object | `{ enabled, label, heroTitle, heroSubtitle, chips: [{ label, emoji? }] }`. |
| `agentToAgent` | object | `{ enabled, label, headline, sourceAgents, inputs, stages: [{ title, description }], outputs, centerLabel, centerImageUrl? }`. |
| `getStarted` | object | `{ enabled, label, studioTitle, previewImageUrl?, ctaLabel, ctaHref? }`. |

Each section object includes `enabled` and `label` plus the fields above; omit or disable sections you do not want shown.

#### `conversion` — public conversion funnel (`PublicConversionConfig`)

Nested under `chatEmbedConfig.conversion`. Shapes are in `app/utils/publicChatConversion.ts`.

| Key | Type | What to change |
|-----|------|----------------|
| `mode` | `"hybrid_report"` (extensible) | Which conversion experience template to use. |
| `landing` | object | Landing hero: `enabled`, `badge`, `title`, `body`, `inputLabel`, `inputPlaceholder`, `highlights[]`. |
| `report` | object | Long-form report layout: badges, titles, `summaryCards[]`, `timelineSteps[]`, `proofPoints[]`, `outcomes[]`, closing copy. |
| `leadCapture` | object | Lead form: `enabled`, titles, labels, `successTitle`, `successBody`, `privacyNote`. |
| `actions` | object | CTA strings and optional `bookingUrl`; modal copy for briefing / follow-up labels. |

---

### `publishedConfig` — what it is and how it is built

`publishedConfig` in git is the **published** assistant configuration blob stored on the page **plus** a few fields merged from **draft** `vapiAssistantConfig` so they appear in version control.

**Merge rules** (`server/src/services/digital-twin-page-git/chat-config-published-config.util.ts`):
1. Start from the page’s `publishedConfig` document (deep-cloned).
2. If draft `vapiAssistantConfig.outputIntegration.outputTabViewerDefaultsByUserId` exists, copy it onto `publishedConfig.outputTabViewerDefaultsByUserId`.
3. If draft has `webSearchEnabled`, `xSearchEnabled`, or `xSearchAllowedHandles`, copy those keys onto `publishedConfig` so voice/search flags round-trip in git.

When a coding agent **edits git**, treat `publishedConfig` as the same shape the product uses after publish. The authoritative TypeScript interface is **`DigitalTwinConfig`** (`configureDigitalTwin.types.ts`). Below: **every field name** on that interface with a one-line meaning (optional fields marked by “optional” in prose).

#### Core assistant text and model
| Field | Purpose |
|-------|---------|
| `name` | Display name of the published assistant. |
| `voiceId` | Default TTS/voice id for the assistant where applicable. |
| `llmModel` | Chat LLM model id string. |
| `firstMessage` | Opening message users see when a session starts. |
| `systemPrompt` | System / developer instructions for chat behavior. |
| `temperature` | Sampling temperature for the chat model. |
| `language` | Optional locale / language hint for the assistant (e.g. `en`). |

#### Connectors, knowledge, mentors
| Field | Purpose |
|-------|---------|
| `nativeConnectorIds` | Optional list of native (in-product) connector ids enabled for tools. |
| `mcpServerIds` | Optional MCP server ids for tool servers. |
| `knowledgeBaseFileIds` | Attached knowledge base file ids for RAG-style retrieval. |
| `mentorIds` | Mentor ids when mentor routing is used. |
| `mentorSelections` | `{ id, name, icon? }[]` richer mentor picker state. |

#### Task execution blueprint (orchestrated skills)
| Field | Purpose |
|-------|---------|
| `taskExecutionBlueprint` | Blueprint for multi-skill / task execution (source, child skills, output format, etc.). |
| `taskExecutionSourcePageId` | Page id source for blueprint inheritance. |

#### Voice agent stack (LiveKit / telephony / xAI / Anam)
| Field | Purpose |
|-------|---------|
| `voiceAgentEnabled` | Master switch for voice agent sessions. |
| `voiceOnlyAgentEnabled` | Audio-only voice mode. |
| `digitalAvatarAgentEnabled` | Avatar video mode when supported. |
| `phoneAgentEnabled` | Telephony integration enabled. |
| `twilioCredentialId` | Reference id to user’s saved Twilio credential (not the secret itself). |
| `livekitBackend` | `"gateway"` or `"xai-realtime"` backend selection. |
| `livekitKeyId` | Saved LiveKit key reference. |
| `xaiKeyId` | Saved xAI key reference. |
| `xaiVoice` | xAI realtime voice id. |
| `xaiVadThreshold` | Voice activity detection threshold. |
| `xaiVadPrefixPaddingMs` | VAD padding milliseconds. |
| `voiceBrowserToolsEnabled` | Allow browser-control tools in xAI realtime voice. |
| `webSearchEnabled` | xAI web search tool (may be merged from draft). |
| `xSearchEnabled` | xAI X/Twitter search tool (may be merged from draft). |
| `xSearchAllowedHandles` | Allowlist of X handles for search (may be merged from draft). |
| `imageAnalysisPrompt` | Custom prompt for image analysis tool. |
| `livekitUrl` / `livekitApiKey` / `livekitApiSecret` | LiveKit connection parameters when stored (prefer credential refs in production). |
| `anamKeyId` / `anamAvatarId` / `anamPersonaName` / `anamApiUrl` / `anamRenderVideo` / `anamVoiceId` / `anamLlmId` | Anam avatar plugin configuration. |
| `ttsModel` / `ttsVoice` / `ttsVoiceCustom` / `ttsLanguage` | Text-to-speech stack. |
| `sttModel` / `sttLanguage` | Speech-to-text stack. |
| `voiceProvider` | Voice stack provider key. |
| `vapiSquadId` / `vapiAssistantId` | Legacy Vapi ids when used. |
| `voiceLlmModel` | Separate LLM for voice path vs chat. |
| `backgroundAudio` | Ambient loop: `none`, `office`, `cafe`, `nature`. |

#### Providers and browser
| Field | Purpose |
|-------|---------|
| `browserProviderId` | Browser automation provider for goals/workflows. |
| `guardianRequirements` | Guardian policy requirements (browser, sites, credential types). |
| `geminiProviderId` | Gemini File Search provider id. |
| `geminiLiveProviderId` / `geminiLiveModel` / `geminiLiveVoice` / `geminiLiveWebSearchEnabled` | Gemini Live realtime voice configuration. |
| `xaiProviderId` | xAI File Search provider id. |
| `mem0ProviderId` | mem0 memory provider id. |
| `sandboxProviderId` | E2B sandbox provider id. |
| `chatCommandSettings` | Which slash-commands / tools are exposed in chat UI. |

#### Composio / Arcade MCP
| Field | Purpose |
|-------|---------|
| `composioChatToolsEnabled` | Toggle Composio toolkit tools in chat. |
| `composioKeyId` | Saved Composio key reference or sentinel like `default`. |
| `composioApiKey` | Raw key when not yet saved (avoid committing real secrets). |
| `thirdPartyAppToolsProvider` | `"composio"` or `"arcade"`. |
| `arcadeKeyId` | Saved Arcade key reference. |
| `composioToolRouterMcpUrl` | Provisioned Composio MCP URL. |
| `arcadeMcpGatewayUrl` | Arcade MCP gateway URL. |

#### Output integration (Airtable / Notion / native / pipelines)
| Field | Purpose |
|-------|---------|
| `outputIntegration` | Full output integration object: connectors, `resultSets`, `dataLists`, `pipelineListBindings`, Airtable/Notion ids, etc. (see `OutputIntegrationConfig` in the same types file). |
| `outputTabViewerDefaultsByUserId` | Per-user Output tab defaults (`defaultPipelineId`, `defaultListByPipelineId`); **merged from draft** into git `publishedConfig` for visibility in repo. |

#### Agent topology (derived from `formUi`)

The active agent architecture is **implicit** in `publishedConfig` — it is not a separate top-level key. The Configure modal's **Agents** panel visualises it read-only:

| `formUi.style` value | Architecture |
|----------------------|-------------|
| `"shopping_cart"` | Supervisor + Planner + Cart Builder + Reviewer subagents |
| `"default"` or omitted | Single chat agent |

When `formUi.style` is `"shopping_cart"` the backend (`chat-agent.factory.ts`) automatically registers the full cart tool suite (`propose_cart_bundle`, `stage_cart_bundle`, `add_to_cart`, `remove_from_cart`, `clear_cart`, `get_cart_checkout_requirements`, `checkout_cart`). To change the architecture, set `formUi.style` and sync — no additional field is required.

**Secrets:** Do not commit raw API keys, Twilio auth tokens, or private LiveKit secrets when avoidable; the product often uses **reference ids** (`*KeyId`, `*CredentialId`) pointing at user-stored credentials.

---

## Write-Through Behaviour
When a user edits chat appearance, configure/publish settings, or page display fields in the UI, changes are saved to the database and then synced to this file automatically (500 ms debounce where implemented). **Pull from git** overwrites the database for `chatEmbedConfig`, `publishedConfig`, and allowlisted **`pageProfile`** fields to match the file.

## Ways to apply changes
1. **In-app editors** — UI saves to DB; debounced or explicit **Sync to Git** (e.g. from the digital twin Git binding modal) pushes current DB state, including `pageProfile`, to the default branch. That full sync also rewrites the skill tree from the platform template (including this `SKILL.md`) and, for **page-primary** repositories only, deletes legacy `assets/team-agent.json`, `assets/task-orchestration.json`, and `skills/master/SKILL.md` if they are still present from older layouts. Per-endpoint bound repos keep those workflow files.
2. **Edit in repo** — Commit `assets/chat-config.json` on the bound branch, then use the product’s **Pull** action to hydrate the page document from git.
3. **Automation / CI** — Pipeline or agent updates the same JSON shape; pull or webhook-driven sync must respect `pageId` and branch binding rules enforced by the backend.

## Twilio Telephony
- Digital twin pages can be used with outbound Twilio phone flows, including direct agent phone calls and run callbacks.
- Twilio phone number selection is page-aware: if the page has a saved `twilioCredentialId` in `publishedConfig` or `vapiAssistantConfig`, that credential is used first; otherwise the backend falls back to the global Twilio environment configuration when allowed.
- Callback telephony is a special case and must not depend on the page's stored voice runtime settings.
- For `run_callback` calls, the voice runtime now uses the system telephony xAI configuration instead of the digital twin page's stored `voiceProvider`, `xaiKeyId`, `xaiVoice`, or other voice-runtime fields.
- For callbacks, the page/agent ID is still important for tools, knowledge-base context, and conversational context, but not for selecting the voice provider.
- Callback telephony still requires the caller/user to have a usable default xAI key available in their profile.
- Twilio telephony requires a public HTTPS backend URL so Twilio can reach the outbound TwiML/status endpoints and the media-stream websocket endpoint.

## Notes
- `pageId` must match the page ID bound to this repository.
- Passwords and public-access flags are not stored in git; they are managed via the database only (`visibility`, `sharedWith`, `pageSlug`, etc. remain DB-only).
- Default-branch updates sync back into the digital twin page configuration automatically when the product runs a sync to git.
- Older repos may omit `pageProfile` until the next successful sync or pull; the backend treats missing `pageProfile` as valid for reads and fills it on the next write.
