# Twilio to Telnyx Product Mapping

## Table of Contents

- [Direct Replacements](#direct-replacements)
- [Telnyx-Only Products](#telnyx-only-products)
- [Twilio Products with No Telnyx Equivalent](#twilio-products-with-no-telnyx-equivalent)
- [Deprecated Twilio Products Telnyx Still Supports](#deprecated-twilio-products-telnyx-still-supports)
- [Structural Differences](#structural-differences)

## Direct Replacements

| Twilio Product | Telnyx Equivalent | Migration Complexity | Notes |
|---|---|---|---|
| **Programmable Voice (TwiML)** | **TeXML** | Low | XML verb-compatible. Swap endpoints + auth. Most TwiML works as-is. |
| **Programmable Voice (REST)** | **Call Control API** | Medium | Different paradigm: Telnyx uses event-driven WebSocket/webhook commands vs Twilio's REST calls. More granular control. |
| **Programmable Messaging** (SMS/MMS) | **Messaging API** | Medium | New SDK integration. Different payload structure. Same capabilities: SMS, MMS, long codes, toll-free, short codes. |
| **Elastic SIP Trunking** | **SIP Trunking** | Low | Direct replacement. Telnyx owns its network (not resold). Configure in Mission Control Portal. |
| **Voice SDK** (Client WebRTC) | **WebRTC SDKs** | Medium | SDKs for JS, iOS, Android, Flutter, React Native. Key difference: no mandatory backend server for tokens. |
| **Phone Numbers** | **Number Management** | Low | Licensed carrier with direct inventory in 140+ countries. Numbers managed via API or portal. |
| **Twilio Verify** | **Verify API** | Medium | 5 methods: SMS, vSMS (templated), Call, Flash Call, PSD2. Different API surface but same functionality. |
| **Twilio Lookup** | **Number Lookup** | Low | Carrier lookup, line type detection, caller name. Direct API replacement. |
| **Twilio Conversations** | No direct equivalent | N/A | Telnyx provides messaging primitives; no multi-channel conversation orchestration product. |
| **Twilio Notify** | No direct equivalent | N/A | Use Telnyx Messaging API directly for push/SMS notifications. |
| **10DLC Registration** | **10DLC Campaign Registry** | Low | Same underlying TCR system. Register brands and campaigns via Telnyx portal or API. |
| **Short Codes** | **Short Codes** | Low | Telnyx supports shared and dedicated short codes. |

## Product-to-Reference File Mapping

Use this table to find the detailed migration guide for each product:

| Product Area | Reference File | Scanner Identifiers |
|---|---|---|
| Voice (TwiML/TeXML) | `voice-migration.md`, `texml-verbs.md` | `voice`, `texml` |
| Voice (Call Control) | `voice-migration.md` | `voice` |
| Messaging (SMS/MMS) | `messaging-migration.md` | `messaging` |
| WebRTC | `webrtc-migration.md` | `webrtc` |
| Verify (2FA/OTP) | `verify-migration.md` | `verify` |
| SIP Trunking | `sip-trunking-migration.md` | `sip`, `sip-integrations` |
| Fax | `fax-migration.md` | `fax` |
| Video | `video-migration.md` | `video` |
| IoT SIM | `iot-migration.md` | `iot` |
| Number Lookup | `lookup-migration.md` | `lookup` |
| Number Porting | `number-porting.md` | `porting-in`, `porting-out` |
| 10DLC | `messaging-migration.md` (section) | `10dlc` |
| Numbers | `numbers-migration.md` | `numbers`, `numbers-config`, `numbers-services`, `numbers-compliance` |

## Telnyx-Only Products

These have no Twilio equivalent and represent capabilities you gain by migrating:

| Telnyx Product | Description |
|---|---|
| **Inference API** | OpenAI-compatible LLM hosting on Telnyx-owned GPUs. Chat completions, function calling, streaming. |
| **AI Assistants** | Voice-capable AI assistants with built-in RAG (retrieval from storage buckets). Custom LLM providers (Azure, Bedrock). |
| **Embeddings API** | Text-to-vector embeddings as part of the Inference product. |
| **Cloud Storage** | S3-compatible object storage. Regional endpoints, bucket policies, migration tools from AWS S3. |
| **IoT SIM Cards** | Global IoT connectivity: eSIM, 650+ networks, 180+ countries, 2G through 4G LTE and CAT-M. |
| **Private Wireless Gateways** | VRF/MPLS-backed IoT networking off the public internet. |
| **Networking** | Cloud VPN, global edge routing on Telnyx's private backbone. |
| **Real-Time Transcription** | Native `<Transcription>` verb in TeXML for live STT during calls. Multiple engines: Google, Telnyx, Deepgram, Azure. |

## Twilio Products with No Telnyx Equivalent

If you depend on these, you will need a third-party alternative or custom solution:

| Twilio Product | Alternatives |
|---|---|
| **Flex** (Contact Center) | Build custom with Telnyx Call Control + WebRTC, or use third-party CCaaS |
| **Studio** (Visual Workflow Builder) | No equivalent. Use TeXML or Call Control API directly. |
| **Segment** (Customer Data Platform) | No equivalent. Consider Segment independently or alternatives (Rudderstack, mParticle). |
| **SendGrid** (Email) | No equivalent. Telnyx does not offer email. Use SendGrid independently or alternatives (Postmark, Resend, SES). |
| **TaskRouter** (Task Distribution) | No equivalent. Build custom routing with Call Control API queue management. |
| **Frontline** (deprecated by Twilio) | N/A |
| **Twilio Pay** | No equivalent. No `<Pay>` verb in TeXML. |
| **Twilio Conversations** | No direct equivalent. Telnyx provides messaging primitives (SMS/MMS API) but no multi-channel conversation orchestration layer. Build custom or use a third-party conversation platform. |

## Deprecated Twilio Products Telnyx Still Supports

| Product | Twilio Status | Telnyx Status |
|---|---|---|
| **Video** | Retired December 2024 | Active. Video Rooms API with JS, iOS, Android SDKs. $0.002/participant/minute. |
| **Fax** | Deprecated | Active. Full programmable fax API. Send, receive, manage via API. Email-to-fax support. |

## Structural Differences

| Aspect | Twilio | Telnyx |
|---|---|---|
| **Network** | CPaaS layer on third-party carrier networks | Licensed carrier, owns private global IP backbone (MPLS) |
| **Coverage** | 180+ countries (via aggregators) | 140+ countries (direct inventory), 30+ countries as licensed carrier |
| **Voice Quality** | Standard codecs | HD Voice with G.722 natively to PSTN |
| **AI/ML** | Partners with third parties | First-party: Inference, STT, TTS, Embeddings, AI Assistants |
| **IoT** | Super SIM (limited networks) | IoT SIM on 650+ networks in 180+ countries |
| **Portal** | Twilio Console | Mission Control Portal (portal.telnyx.com) |
| **Pricing Model** | Per-message / per-minute | Per-message / per-minute (generally 30-50% lower) |
