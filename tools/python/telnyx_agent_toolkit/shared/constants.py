"""Tool definitions and schemas for all Telnyx agent tools."""

from __future__ import annotations

from typing import Any, TypedDict


class ToolParameter(TypedDict, total=False):
    type: str
    description: str
    enum: list[str]
    items: dict[str, str]
    default: Any


class ToolDefinition(TypedDict):
    name: str
    description: str
    parameters: dict[str, Any]
    method: str  # HTTP method
    path: str  # API path
    category: str


TOOL_DEFINITIONS: dict[str, ToolDefinition] = {
    # ─── Tier 1: Messaging & Numbers ──────────────────────────────
    "send_sms": {
        "name": "send_sms",
        "description": "Send an SMS or MMS message to a phone number.",
        "parameters": {
            "type": "object",
            "properties": {
                "from_": {
                    "type": "string",
                    "description": "The Telnyx phone number or short code to send from (E.164 format, e.g. +18005551234).",
                },
                "to": {
                    "type": "string",
                    "description": "The destination phone number (E.164 format, e.g. +18005551234).",
                },
                "text": {
                    "type": "string",
                    "description": "The message body text.",
                },
                "media_urls": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Optional list of media URLs for MMS.",
                },
                "messaging_profile_id": {
                    "type": "string",
                    "description": "Optional messaging profile ID to use.",
                },
            },
            "required": ["from_", "to", "text"],
        },
        "method": "POST",
        "path": "/messages",
        "category": "messaging",
    },
    "list_messaging_profiles": {
        "name": "list_messaging_profiles",
        "description": "List messaging profiles on the account.",
        "parameters": {
            "type": "object",
            "properties": {
                "page_size": {
                    "type": "integer",
                    "description": "Number of results per page (max 250).",
                    "default": 20,
                },
                "page_number": {
                    "type": "integer",
                    "description": "Page number to retrieve.",
                    "default": 1,
                },
            },
            "required": [],
        },
        "method": "GET",
        "path": "/messaging_profiles",
        "category": "messaging",
    },
    "create_messaging_profile": {
        "name": "create_messaging_profile",
        "description": "Create a new messaging profile.",
        "parameters": {
            "type": "object",
            "properties": {
                "name": {
                    "type": "string",
                    "description": "A user-friendly name for the messaging profile.",
                },
                "whitelisted_destinations": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "List of destination country ISO codes this profile can send to (e.g. ['US', 'CA']). Required.",
                    "default": ["US"],
                },
                "webhook_url": {
                    "type": "string",
                    "description": "URL to receive webhook events for this profile.",
                },
                "webhook_api_version": {
                    "type": "string",
                    "description": "Webhook API version.",
                    "enum": ["1", "2"],
                    "default": "2",
                },
            },
            "required": ["name", "whitelisted_destinations"],
        },
        "method": "POST",
        "path": "/messaging_profiles",
        "category": "messaging",
    },
    "list_phone_numbers": {
        "name": "list_phone_numbers",
        "description": "List phone numbers on the Telnyx account with optional filters.",
        "parameters": {
            "type": "object",
            "properties": {
                "page_size": {
                    "type": "integer",
                    "description": "Number of results per page (max 250).",
                    "default": 20,
                },
                "page_number": {
                    "type": "integer",
                    "description": "Page number to retrieve.",
                    "default": 1,
                },
                "filter_tag": {
                    "type": "string",
                    "description": "Filter by tag.",
                },
                "filter_phone_number": {
                    "type": "string",
                    "description": "Filter by phone number (partial match).",
                },
                "filter_status": {
                    "type": "string",
                    "description": "Filter by status.",
                    "enum": ["active", "purchase_pending", "port_pending", "emergency_only", "deleted"],
                },
                "filter_connection_id": {
                    "type": "string",
                    "description": "Filter by connection ID.",
                },
            },
            "required": [],
        },
        "method": "GET",
        "path": "/phone_numbers",
        "category": "numbers",
    },
    "search_phone_numbers": {
        "name": "search_phone_numbers",
        "description": "Search for available phone numbers to purchase.",
        "parameters": {
            "type": "object",
            "properties": {
                "filter_country_code": {
                    "type": "string",
                    "description": "ISO 3166-1 alpha-2 country code (e.g. 'US', 'GB').",
                    "default": "US",
                },
                "filter_area_code": {
                    "type": "string",
                    "description": "Area code to search within.",
                },
                "filter_locality": {
                    "type": "string",
                    "description": "City or locality name.",
                },
                "filter_national_destination_code": {
                    "type": "string",
                    "description": "National destination code filter.",
                },
                "filter_phone_number_type": {
                    "type": "string",
                    "description": "Type of phone number.",
                    "enum": ["local", "toll_free", "national", "mobile"],
                },
                "filter_features": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Features the number must support (e.g. 'sms', 'voice', 'mms').",
                },
                "limit": {
                    "type": "integer",
                    "description": "Maximum number of results to return (max 100).",
                    "default": 10,
                },
            },
            "required": [],
        },
        "method": "GET",
        "path": "/available_phone_numbers",
        "category": "numbers",
    },
    "buy_phone_number": {
        "name": "buy_phone_number",
        "description": "Purchase a phone number. This will charge your account.",
        "parameters": {
            "type": "object",
            "properties": {
                "phone_numbers": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "phone_number": {"type": "string"},
                        },
                    },
                    "description": "List of phone numbers to purchase (E.164 format).",
                },
                "connection_id": {
                    "type": "string",
                    "description": "ID of the connection to assign the number to.",
                },
                "messaging_profile_id": {
                    "type": "string",
                    "description": "ID of the messaging profile to assign.",
                },
            },
            "required": ["phone_numbers"],
        },
        "method": "POST",
        "path": "/number_orders",
        "category": "numbers",
    },
    "get_balance": {
        "name": "get_balance",
        "description": "Get the current account balance and credit information.",
        "parameters": {
            "type": "object",
            "properties": {},
            "required": [],
        },
        "method": "GET",
        "path": "/balance",
        "category": "account",
    },
    # ─── Tier 2: Voice & AI ───────────────────────────────────────
    "make_call": {
        "name": "make_call",
        "description": "Initiate an outbound voice call.",
        "parameters": {
            "type": "object",
            "properties": {
                "to": {
                    "type": "string",
                    "description": "Destination phone number or SIP URI.",
                },
                "from_": {
                    "type": "string",
                    "description": "Caller ID phone number (E.164 format).",
                },
                "connection_id": {
                    "type": "string",
                    "description": "ID of the connection to use for the call.",
                },
                "webhook_url": {
                    "type": "string",
                    "description": "URL to receive call events.",
                },
                "answering_machine_detection": {
                    "type": "string",
                    "description": "AMD mode.",
                    "enum": ["disabled", "detect", "detect_beep", "detect_words", "greeting_end"],
                },
            },
            "required": ["to", "from_", "connection_id"],
        },
        "method": "POST",
        "path": "/calls",
        "category": "voice",
    },
    "list_connections": {
        "name": "list_connections",
        "description": "List voice connections (credential connections, FQDN connections, and IP connections).",
        "parameters": {
            "type": "object",
            "properties": {
                "page_size": {
                    "type": "integer",
                    "description": "Number of results per page.",
                    "default": 20,
                },
                "page_number": {
                    "type": "integer",
                    "description": "Page number to retrieve.",
                    "default": 1,
                },
                "filter_connection_name": {
                    "type": "string",
                    "description": "Filter by connection name (partial match).",
                },
            },
            "required": [],
        },
        "method": "GET",
        "path": "/credential_connections",
        "category": "voice",
    },
    "ai_chat": {
        "name": "ai_chat",
        "description": "Generate a chat completion using Telnyx AI inference.",
        "parameters": {
            "type": "object",
            "properties": {
                "model": {
                    "type": "string",
                    "description": "Model ID to use (e.g. 'meta-llama/Meta-Llama-3.1-70B-Instruct').",
                },
                "messages": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "role": {"type": "string", "enum": ["system", "user", "assistant"]},
                            "content": {"type": "string"},
                        },
                    },
                    "description": "List of chat messages.",
                },
                "max_tokens": {
                    "type": "integer",
                    "description": "Maximum tokens to generate.",
                    "default": 1024,
                },
                "temperature": {
                    "type": "number",
                    "description": "Sampling temperature (0.0-2.0).",
                    "default": 0.7,
                },
                "stream": {
                    "type": "boolean",
                    "description": "Whether to stream the response.",
                    "default": False,
                },
            },
            "required": ["model", "messages"],
        },
        "method": "POST",
        "path": "/ai/chat/completions",
        "category": "ai",
    },
    "ai_embed": {
        "name": "ai_embed",
        "description": "Generate embeddings using Telnyx AI inference.",
        "parameters": {
            "type": "object",
            "properties": {
                "model": {
                    "type": "string",
                    "description": "Embedding model ID.",
                },
                "input": {
                    "type": ["string", "array"],
                    "description": "Text or list of texts to embed.",
                },
            },
            "required": ["model", "input"],
        },
        "method": "POST",
        "path": "/ai/embeddings",
        "category": "ai",
    },
    "list_ai_assistants": {
        "name": "list_ai_assistants",
        "description": "List AI assistants on the account.",
        "parameters": {
            "type": "object",
            "properties": {
                "page_size": {
                    "type": "integer",
                    "description": "Number of results per page.",
                    "default": 20,
                },
            },
            "required": [],
        },
        "method": "GET",
        "path": "/ai/assistants",
        "category": "ai",
    },
    "create_ai_assistant": {
        "name": "create_ai_assistant",
        "description": "Create a new AI assistant with a custom personality and configuration.",
        "parameters": {
            "type": "object",
            "properties": {
                "name": {
                    "type": "string",
                    "description": "Name of the assistant.",
                },
                "model": {
                    "type": "string",
                    "description": "Model to use for the assistant. Use 'telnyx ai models' or GET /v2/ai/models to list available models. Note: not all inference models work for assistants (e.g. Meta-Llama-3.1-8B-Instruct does not).",
                },
                "instructions": {
                    "type": "string",
                    "description": "System instructions for the assistant.",
                },
                "voice": {
                    "type": "string",
                    "description": "Voice ID for voice-enabled assistants.",
                },
            },
            "required": ["name", "model", "instructions"],
        },
        "method": "POST",
        "path": "/ai/assistants",
        "category": "ai",
    },
    # ─── Tier 3: Extended ─────────────────────────────────────────
    "send_fax": {
        "name": "send_fax",
        "description": "Send a fax to a phone number.",
        "parameters": {
            "type": "object",
            "properties": {
                "to": {
                    "type": "string",
                    "description": "Destination fax number (E.164 format).",
                },
                "from_": {
                    "type": "string",
                    "description": "Sender fax number (E.164 format).",
                },
                "media_url": {
                    "type": "string",
                    "description": "URL of the document to fax (PDF recommended).",
                },
                "connection_id": {
                    "type": "string",
                    "description": "Connection ID to use.",
                },
            },
            "required": ["to", "from_", "media_url", "connection_id"],
        },
        "method": "POST",
        "path": "/faxes",
        "category": "fax",
    },
    "lookup_number": {
        "name": "lookup_number",
        "description": "Look up information about a phone number (carrier, caller ID, type).",
        "parameters": {
            "type": "object",
            "properties": {
                "phone_number": {
                    "type": "string",
                    "description": "Phone number to look up (E.164 format).",
                },
                "type": {
                    "type": "string",
                    "description": "Type of lookup to perform.",
                    "enum": ["carrier", "caller-name"],
                },
            },
            "required": ["phone_number"],
        },
        "method": "GET",
        "path": "/number_lookup/{phone_number}",
        "category": "lookup",
    },
    "list_sim_cards": {
        "name": "list_sim_cards",
        "description": "List IoT SIM cards on the account.",
        "parameters": {
            "type": "object",
            "properties": {
                "page_size": {
                    "type": "integer",
                    "description": "Number of results per page.",
                    "default": 20,
                },
                "page_number": {
                    "type": "integer",
                    "description": "Page number.",
                    "default": 1,
                },
                "filter_status": {
                    "type": "string",
                    "description": "Filter by SIM status.",
                    "enum": ["enabled", "disabled", "standby", "data_limit_reached"],
                },
            },
            "required": [],
        },
        "method": "GET",
        "path": "/sim_cards",
        "category": "iot",
    },
    "verify_phone": {
        "name": "verify_phone",
        "description": "Start a phone number verification (send a verification code via SMS or call).",
        "parameters": {
            "type": "object",
            "properties": {
                "phone_number": {
                    "type": "string",
                    "description": "Phone number to verify (E.164 format).",
                },
                "verify_profile_id": {
                    "type": "string",
                    "description": "Verification profile ID.",
                },
                "type": {
                    "type": "string",
                    "description": "Verification delivery method.",
                    "enum": ["sms", "call", "whatsapp"],
                    "default": "sms",
                },
                "timeout_secs": {
                    "type": "integer",
                    "description": "Seconds before verification code expires.",
                    "default": 300,
                },
            },
            "required": ["phone_number", "verify_profile_id"],
        },
        "method": "POST",
        "path": "/verifications",
        "category": "verify",
    },
    "verify_code": {
        "name": "verify_code",
        "description": "Check a verification code submitted by a user.",
        "parameters": {
            "type": "object",
            "properties": {
                "phone_number": {
                    "type": "string",
                    "description": "Phone number that was verified (E.164 format).",
                },
                "verify_profile_id": {
                    "type": "string",
                    "description": "Verification profile ID.",
                },
                "code": {
                    "type": "string",
                    "description": "The verification code to check.",
                },
            },
            "required": ["phone_number", "verify_profile_id", "code"],
        },
        "method": "POST",
        "path": "/verifications/by_phone_number/{phone_number}/actions/verify",
        "category": "verify",
    },
    # ─── Tier 5: Payments ────────────────────────────────────────
    "get_payment_quote": {
        "name": "get_payment_quote",
        "description": "Get a cryptocurrency payment quote to fund the Telnyx account with USDC on Base blockchain. Returns payment requirements for x402 protocol signing.",
        "parameters": {
            "type": "object",
            "properties": {
                "amount_usd": {
                    "type": "string",
                    "description": "Amount in USD to fund (e.g. '50.00'). Minimum $5.00, maximum $10,000.00.",
                },
            },
            "required": ["amount_usd"],
        },
        "method": "POST",
        "path": "/x402/credit_account/quote",
        "category": "payments",
    },
    "submit_payment": {
        "name": "submit_payment",
        "description": "Submit a signed x402 cryptocurrency payment to fund the Telnyx account. Requires a quote ID and a base64-encoded PaymentPayload containing the EIP-712 signature.",
        "parameters": {
            "type": "object",
            "properties": {
                "id": {
                    "type": "string",
                    "description": "The quote ID from get_payment_quote (format: quote_xxx).",
                },
                "payment_signature": {
                    "type": "string",
                    "description": "Base64-encoded PaymentPayload v2 JSON containing the signed EIP-712 authorization.",
                },
            },
            "required": ["id", "payment_signature"],
        },
        "method": "POST",
        "path": "/x402/credit_account",
        "category": "payments",
    },
    # ─── Connections ─────────────────────────────────────────────
    "create_credential_connection": {
        "name": "create_credential_connection",
        "description": "Create a new credential connection for SIP authentication.",
        "parameters": {
            "type": "object",
            "properties": {
                "connection_name": {
                    "type": "string",
                    "description": "A user-friendly name for the connection.",
                },
                "user_name": {
                    "type": "string",
                    "description": "SIP authentication username (alphanumeric only, no underscores or special characters).",
                },
                "password": {
                    "type": "string",
                    "description": "SIP authentication password.",
                },
                "webhook_event_url": {
                    "type": "string",
                    "description": "Optional URL to receive webhook events.",
                },
            },
            "required": ["connection_name", "user_name", "password"],
        },
        "method": "POST",
        "path": "/credential_connections",
        "category": "connections",
    },
    "get_connection": {
        "name": "get_connection",
        "description": "Get details of a specific credential connection.",
        "parameters": {
            "type": "object",
            "properties": {
                "connection_id": {
                    "type": "string",
                    "description": "The ID of the connection to retrieve.",
                },
            },
            "required": ["connection_id"],
        },
        "method": "GET",
        "path": "/credential_connections/{connection_id}",
        "category": "connections",
    },
    "delete_connection": {
        "name": "delete_connection",
        "description": "Delete a credential connection.",
        "parameters": {
            "type": "object",
            "properties": {
                "connection_id": {
                    "type": "string",
                    "description": "The ID of the connection to delete.",
                },
            },
            "required": ["connection_id"],
        },
        "method": "DELETE",
        "path": "/credential_connections/{connection_id}",
        "category": "connections",
    },
    "update_connection": {
        "name": "update_connection",
        "description": "Update an existing credential connection.",
        "parameters": {
            "type": "object",
            "properties": {
                "connection_id": {
                    "type": "string",
                    "description": "The ID of the connection to update.",
                },
                "connection_name": {
                    "type": "string",
                    "description": "New name for the connection.",
                },
                "webhook_event_url": {
                    "type": "string",
                    "description": "New webhook event URL.",
                },
            },
            "required": ["connection_id"],
        },
        "method": "PATCH",
        "path": "/credential_connections/{connection_id}",
        "category": "connections",
    },
    # ─── Outbound Voice Profiles ─────────────────────────────────
    "list_voice_profiles": {
        "name": "list_voice_profiles",
        "description": "List outbound voice profiles on the account.",
        "parameters": {
            "type": "object",
            "properties": {
                "page_size": {
                    "type": "integer",
                    "description": "Number of results per page.",
                    "default": 20,
                },
                "page_number": {
                    "type": "integer",
                    "description": "Page number to retrieve.",
                    "default": 1,
                },
            },
            "required": [],
        },
        "method": "GET",
        "path": "/outbound_voice_profiles",
        "category": "voice_profiles",
    },
    "create_voice_profile": {
        "name": "create_voice_profile",
        "description": "Create a new outbound voice profile.",
        "parameters": {
            "type": "object",
            "properties": {
                "name": {
                    "type": "string",
                    "description": "Name for the voice profile.",
                },
                "traffic_type": {
                    "type": "string",
                    "description": "Type of traffic for the profile.",
                    "default": "conversational",
                },
                "service_plan": {
                    "type": "string",
                    "description": "Service plan for the profile.",
                    "default": "global",
                },
            },
            "required": ["name"],
        },
        "method": "POST",
        "path": "/outbound_voice_profiles",
        "category": "voice_profiles",
    },
    "get_voice_profile": {
        "name": "get_voice_profile",
        "description": "Get details of a specific outbound voice profile.",
        "parameters": {
            "type": "object",
            "properties": {
                "voice_profile_id": {
                    "type": "string",
                    "description": "The ID of the voice profile to retrieve.",
                },
            },
            "required": ["voice_profile_id"],
        },
        "method": "GET",
        "path": "/outbound_voice_profiles/{voice_profile_id}",
        "category": "voice_profiles",
    },
    "delete_voice_profile": {
        "name": "delete_voice_profile",
        "description": "Delete an outbound voice profile.",
        "parameters": {
            "type": "object",
            "properties": {
                "voice_profile_id": {
                    "type": "string",
                    "description": "The ID of the voice profile to delete.",
                },
            },
            "required": ["voice_profile_id"],
        },
        "method": "DELETE",
        "path": "/outbound_voice_profiles/{voice_profile_id}",
        "category": "voice_profiles",
    },
    # ─── Phone Number Management ─────────────────────────────────
    "update_phone_number": {
        "name": "update_phone_number",
        "description": "Update settings on a phone number (tags, connection, billing group).",
        "parameters": {
            "type": "object",
            "properties": {
                "phone_number_id": {
                    "type": "string",
                    "description": "The ID of the phone number to update.",
                },
                "tags": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Tags to assign to the phone number.",
                },
                "connection_id": {
                    "type": "string",
                    "description": "Connection ID to assign.",
                },
                "billing_group_id": {
                    "type": "string",
                    "description": "Billing group ID to assign.",
                },
            },
            "required": ["phone_number_id"],
        },
        "method": "PATCH",
        "path": "/phone_numbers/{phone_number_id}",
        "category": "numbers",
    },
    "delete_phone_number": {
        "name": "delete_phone_number",
        "description": "Delete (release) a phone number from the account.",
        "parameters": {
            "type": "object",
            "properties": {
                "phone_number_id": {
                    "type": "string",
                    "description": "The ID of the phone number to delete.",
                },
            },
            "required": ["phone_number_id"],
        },
        "method": "DELETE",
        "path": "/phone_numbers/{phone_number_id}",
        "category": "numbers",
    },
    "update_number_voice": {
        "name": "update_number_voice",
        "description": "Update voice settings on a phone number.",
        "parameters": {
            "type": "object",
            "properties": {
                "phone_number_id": {
                    "type": "string",
                    "description": "The ID of the phone number to update.",
                },
                "connection_id": {
                    "type": "string",
                    "description": "Voice connection ID to assign.",
                },
                "tech_prefix": {
                    "type": "string",
                    "description": "Tech prefix for the number.",
                },
            },
            "required": ["phone_number_id"],
        },
        "method": "PATCH",
        "path": "/phone_numbers/{phone_number_id}/voice",
        "category": "numbers",
    },
    "update_number_messaging": {
        "name": "update_number_messaging",
        "description": "Update messaging settings on a phone number.",
        "parameters": {
            "type": "object",
            "properties": {
                "phone_number_id": {
                    "type": "string",
                    "description": "The ID of the phone number to update.",
                },
                "messaging_profile_id": {
                    "type": "string",
                    "description": "Messaging profile ID to assign.",
                },
            },
            "required": ["phone_number_id"],
        },
        "method": "PATCH",
        "path": "/phone_numbers/{phone_number_id}/messaging",
        "category": "numbers",
    },
    # ─── Messaging Profile Management ────────────────────────────
    "get_messaging_profile": {
        "name": "get_messaging_profile",
        "description": "Get details of a specific messaging profile.",
        "parameters": {
            "type": "object",
            "properties": {
                "messaging_profile_id": {
                    "type": "string",
                    "description": "The ID of the messaging profile to retrieve.",
                },
            },
            "required": ["messaging_profile_id"],
        },
        "method": "GET",
        "path": "/messaging_profiles/{messaging_profile_id}",
        "category": "messaging",
    },
    "update_messaging_profile": {
        "name": "update_messaging_profile",
        "description": "Update an existing messaging profile.",
        "parameters": {
            "type": "object",
            "properties": {
                "messaging_profile_id": {
                    "type": "string",
                    "description": "The ID of the messaging profile to update.",
                },
                "name": {
                    "type": "string",
                    "description": "New name for the messaging profile.",
                },
                "whitelisted_destinations": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "List of whitelisted destination country codes.",
                },
            },
            "required": ["messaging_profile_id"],
        },
        "method": "PATCH",
        "path": "/messaging_profiles/{messaging_profile_id}",
        "category": "messaging",
    },
    "delete_messaging_profile": {
        "name": "delete_messaging_profile",
        "description": "Delete a messaging profile.",
        "parameters": {
            "type": "object",
            "properties": {
                "messaging_profile_id": {
                    "type": "string",
                    "description": "The ID of the messaging profile to delete.",
                },
            },
            "required": ["messaging_profile_id"],
        },
        "method": "DELETE",
        "path": "/messaging_profiles/{messaging_profile_id}",
        "category": "messaging",
    },
    # ─── AI Assistants (CRUD completion) ─────────────────────────
    "get_assistant": {
        "name": "get_assistant",
        "description": "Get details of a specific AI assistant.",
        "parameters": {
            "type": "object",
            "properties": {
                "assistant_id": {
                    "type": "string",
                    "description": "The ID of the assistant to retrieve.",
                },
            },
            "required": ["assistant_id"],
        },
        "method": "GET",
        "path": "/ai/assistants/{assistant_id}",
        "category": "ai",
    },
    "update_assistant": {
        "name": "update_assistant",
        "description": "Update an existing AI assistant.",
        "parameters": {
            "type": "object",
            "properties": {
                "assistant_id": {
                    "type": "string",
                    "description": "The ID of the assistant to update.",
                },
                "name": {
                    "type": "string",
                    "description": "New name for the assistant.",
                },
                "instructions": {
                    "type": "string",
                    "description": "New system instructions.",
                },
                "model": {
                    "type": "string",
                    "description": "New model to use.",
                },
            },
            "required": ["assistant_id"],
        },
        "method": "PATCH",
        "path": "/ai/assistants/{assistant_id}",
        "category": "ai",
    },
    "delete_assistant": {
        "name": "delete_assistant",
        "description": "Delete an AI assistant.",
        "parameters": {
            "type": "object",
            "properties": {
                "assistant_id": {
                    "type": "string",
                    "description": "The ID of the assistant to delete.",
                },
            },
            "required": ["assistant_id"],
        },
        "method": "DELETE",
        "path": "/ai/assistants/{assistant_id}",
        "category": "ai",
    },
    # ─── Storage ─────────────────────────────────────────────────
    "list_storage_buckets": {
        "name": "list_storage_buckets",
        "description": "List storage buckets on the account.",
        "parameters": {
            "type": "object",
            "properties": {
                "page_size": {
                    "type": "integer",
                    "description": "Number of results per page.",
                    "default": 20,
                },
            },
            "required": [],
        },
        "method": "GET",
        "path": "/storage/buckets",
        "category": "storage",
    },
    "create_storage_bucket": {
        "name": "create_storage_bucket",
        "description": "Create a new storage bucket.",
        "parameters": {
            "type": "object",
            "properties": {
                "name": {
                    "type": "string",
                    "description": "Name for the storage bucket.",
                },
                "region": {
                    "type": "string",
                    "description": "Region for the bucket (e.g. 'us-central-1').",
                },
            },
            "required": ["name"],
        },
        "method": "POST",
        "path": "/storage/buckets",
        "category": "storage",
    },
    # ─── AI Models ───────────────────────────────────────────────
    "list_ai_models": {
        "name": "list_ai_models",
        "description": "List available AI models for inference.",
        "parameters": {
            "type": "object",
            "properties": {},
            "required": [],
        },
        "method": "GET",
        "path": "/ai/models",
        "category": "ai",
    },
    # ─── Messages ────────────────────────────────────────────────
    "list_messages": {
        "name": "list_messages",
        "description": "List messages sent and received on the account.",
        "parameters": {
            "type": "object",
            "properties": {
                "page_size": {
                    "type": "integer",
                    "description": "Number of results per page.",
                    "default": 20,
                },
                "page_number": {
                    "type": "integer",
                    "description": "Page number to retrieve.",
                    "default": 1,
                },
            },
            "required": [],
        },
        "method": "GET",
        "path": "/messages",
        "category": "messaging",
    },
    # ─── 10DLC Compliance ────────────────────────────────────────
    "list_10dlc_brands": {
        "name": "list_10dlc_brands",
        "description": "List registered 10DLC brands on the account.",
        "parameters": {
            "type": "object",
            "properties": {
                "page_size": {
                    "type": "integer",
                    "description": "Number of results per page.",
                    "default": 20,
                },
                "page_number": {
                    "type": "integer",
                    "description": "Page number to retrieve.",
                    "default": 1,
                },
            },
            "required": [],
        },
        "method": "GET",
        "path": "/10dlc/brands",
        "category": "10dlc",
    },
    "create_10dlc_brand": {
        "name": "create_10dlc_brand",
        "description": "Register a new 10DLC brand for A2P messaging compliance.",
        "parameters": {
            "type": "object",
            "properties": {
                "display_name": {
                    "type": "string",
                    "description": "Display name of the brand.",
                },
                "entity_type": {
                    "type": "string",
                    "description": "Entity type (e.g. 'PRIVATE_PROFIT', 'PUBLIC_PROFIT', 'NON_PROFIT').",
                },
                "ein": {
                    "type": "string",
                    "description": "Employer Identification Number.",
                },
                "phone": {
                    "type": "string",
                    "description": "Brand contact phone number.",
                },
                "street": {
                    "type": "string",
                    "description": "Street address.",
                },
                "city": {
                    "type": "string",
                    "description": "City.",
                },
                "state": {
                    "type": "string",
                    "description": "State code (e.g. 'NY').",
                },
                "zip": {
                    "type": "string",
                    "description": "ZIP code.",
                },
                "country": {
                    "type": "string",
                    "description": "Country code (e.g. 'US').",
                },
                "website": {
                    "type": "string",
                    "description": "Brand website URL.",
                },
                "vertical": {
                    "type": "string",
                    "description": "Business vertical (e.g. 'TECHNOLOGY', 'RETAIL').",
                },
                "alt_business_id_type": {
                    "type": "string",
                    "description": "Alternate business ID type (e.g. 'DUNS', 'LEI').",
                },
            },
            "required": ["display_name", "entity_type", "ein", "phone", "street", "city", "state", "zip", "country", "website", "vertical", "alt_business_id_type"],
        },
        "method": "POST",
        "path": "/10dlc/brands",
        "category": "10dlc",
    },
    "get_10dlc_brand": {
        "name": "get_10dlc_brand",
        "description": "Get details of a specific 10DLC brand.",
        "parameters": {
            "type": "object",
            "properties": {
                "brand_id": {
                    "type": "string",
                    "description": "The ID of the brand to retrieve.",
                },
            },
            "required": ["brand_id"],
        },
        "method": "GET",
        "path": "/10dlc/brands/{brand_id}",
        "category": "10dlc",
    },
    "list_10dlc_campaigns": {
        "name": "list_10dlc_campaigns",
        "description": "List 10DLC campaigns on the account.",
        "parameters": {
            "type": "object",
            "properties": {
                "page_size": {
                    "type": "integer",
                    "description": "Number of results per page.",
                    "default": 20,
                },
                "page_number": {
                    "type": "integer",
                    "description": "Page number to retrieve.",
                    "default": 1,
                },
            },
            "required": [],
        },
        "method": "GET",
        "path": "/10dlc/campaigns",
        "category": "10dlc",
    },
    "create_10dlc_campaign": {
        "name": "create_10dlc_campaign",
        "description": "Create a new 10DLC campaign for A2P messaging.",
        "parameters": {
            "type": "object",
            "properties": {
                "brand_id": {
                    "type": "string",
                    "description": "Brand ID to associate the campaign with.",
                },
                "use_case": {
                    "type": "string",
                    "description": "Campaign use case (e.g. 'MIXED', 'MARKETING', 'CUSTOMER_CARE').",
                },
                "description": {
                    "type": "string",
                    "description": "Description of the campaign.",
                },
                "sample_messages": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Sample messages for the campaign.",
                },
                "subscriber_optin": {
                    "type": "boolean",
                    "description": "Whether subscriber opt-in is supported.",
                },
                "subscriber_optout": {
                    "type": "boolean",
                    "description": "Whether subscriber opt-out is supported.",
                },
                "subscriber_help": {
                    "type": "boolean",
                    "description": "Whether subscriber help is supported.",
                },
                "number_pool": {
                    "type": "boolean",
                    "description": "Whether the campaign uses a number pool.",
                },
            },
            "required": ["brand_id", "use_case", "description", "sample_messages", "subscriber_optin", "subscriber_optout", "subscriber_help", "number_pool"],
        },
        "method": "POST",
        "path": "/10dlc/campaignBuilder",
        "category": "10dlc",
    },
    "get_10dlc_campaign": {
        "name": "get_10dlc_campaign",
        "description": "Get details of a specific 10DLC campaign.",
        "parameters": {
            "type": "object",
            "properties": {
                "campaign_id": {
                    "type": "string",
                    "description": "The ID of the campaign to retrieve.",
                },
            },
            "required": ["campaign_id"],
        },
        "method": "GET",
        "path": "/10dlc/campaigns/{campaign_id}",
        "category": "10dlc",
    },
    "assign_10dlc_campaign": {
        "name": "assign_10dlc_campaign",
        "description": "Assign a phone number to a 10DLC campaign.",
        "parameters": {
            "type": "object",
            "properties": {
                "campaign_id": {
                    "type": "string",
                    "description": "The campaign ID to assign the number to.",
                },
                "phone_number": {
                    "type": "string",
                    "description": "Phone number to assign (E.164 format).",
                },
            },
            "required": ["campaign_id", "phone_number"],
        },
        "method": "POST",
        "path": "/10dlc/campaigns/{campaign_id}/phone_numbers",
        "category": "10dlc",
    },
    # ─── IoT / Wireless ──────────────────────────────────────────
    "get_sim_card": {
        "name": "get_sim_card",
        "description": "Get details of a specific SIM card.",
        "parameters": {
            "type": "object",
            "properties": {
                "sim_card_id": {
                    "type": "string",
                    "description": "The ID of the SIM card to retrieve.",
                },
            },
            "required": ["sim_card_id"],
        },
        "method": "GET",
        "path": "/sim_cards/{sim_card_id}",
        "category": "iot",
    },
    "enable_sim_card": {
        "name": "enable_sim_card",
        "description": "Activate (enable) a SIM card.",
        "parameters": {
            "type": "object",
            "properties": {
                "sim_card_id": {
                    "type": "string",
                    "description": "The ID of the SIM card to enable.",
                },
            },
            "required": ["sim_card_id"],
        },
        "method": "POST",
        "path": "/sim_cards/{sim_card_id}/actions/enable",
        "category": "iot",
    },
    "disable_sim_card": {
        "name": "disable_sim_card",
        "description": "Deactivate (disable) a SIM card.",
        "parameters": {
            "type": "object",
            "properties": {
                "sim_card_id": {
                    "type": "string",
                    "description": "The ID of the SIM card to disable.",
                },
            },
            "required": ["sim_card_id"],
        },
        "method": "POST",
        "path": "/sim_cards/{sim_card_id}/actions/disable",
        "category": "iot",
    },
    "list_sim_card_groups": {
        "name": "list_sim_card_groups",
        "description": "List SIM card groups on the account.",
        "parameters": {
            "type": "object",
            "properties": {
                "page_size": {
                    "type": "integer",
                    "description": "Number of results per page.",
                    "default": 20,
                },
                "page_number": {
                    "type": "integer",
                    "description": "Page number to retrieve.",
                    "default": 1,
                },
            },
            "required": [],
        },
        "method": "GET",
        "path": "/sim_card_groups",
        "category": "iot",
    },
    "create_sim_card_group": {
        "name": "create_sim_card_group",
        "description": "Create a new SIM card group.",
        "parameters": {
            "type": "object",
            "properties": {
                "name": {
                    "type": "string",
                    "description": "Name for the SIM card group.",
                },
                "data_limit": {
                    "type": "object",
                    "description": "Data limit configuration for the group.",
                },
            },
            "required": ["name"],
        },
        "method": "POST",
        "path": "/sim_card_groups",
        "category": "iot",
    },
    # ─── Verify ──────────────────────────────────────────────────
    "list_verify_profiles": {
        "name": "list_verify_profiles",
        "description": "List verification profiles on the account.",
        "parameters": {
            "type": "object",
            "properties": {
                "page_size": {
                    "type": "integer",
                    "description": "Number of results per page.",
                    "default": 20,
                },
                "page_number": {
                    "type": "integer",
                    "description": "Page number to retrieve.",
                    "default": 1,
                },
            },
            "required": [],
        },
        "method": "GET",
        "path": "/verify/profiles",
        "category": "verify",
    },
    "create_verify_profile": {
        "name": "create_verify_profile",
        "description": "Create a new verification profile.",
        "parameters": {
            "type": "object",
            "properties": {
                "name": {
                    "type": "string",
                    "description": "Name for the verify profile.",
                },
                "default_timeout_secs": {
                    "type": "integer",
                    "description": "Default timeout in seconds for verification codes.",
                    "default": 300,
                },
                "messaging_enabled": {
                    "type": "boolean",
                    "description": "Whether SMS verification is enabled.",
                    "default": True,
                },
                "rcs_enabled": {
                    "type": "boolean",
                    "description": "Whether RCS verification is enabled.",
                    "default": False,
                },
            },
            "required": ["name"],
        },
        "method": "POST",
        "path": "/verify/profiles",
        "category": "verify",
    },
    "get_verify_profile": {
        "name": "get_verify_profile",
        "description": "Get details of a specific verification profile.",
        "parameters": {
            "type": "object",
            "properties": {
                "profile_id": {
                    "type": "string",
                    "description": "The ID of the verify profile to retrieve.",
                },
            },
            "required": ["profile_id"],
        },
        "method": "GET",
        "path": "/verify/profiles/{profile_id}",
        "category": "verify",
    },
    # ─── Porting ─────────────────────────────────────────────────
    "check_portability": {
        "name": "check_portability",
        "description": "Check if phone numbers are portable to Telnyx.",
        "parameters": {
            "type": "object",
            "properties": {
                "phone_numbers": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "List of phone numbers to check portability for (E.164 format).",
                },
            },
            "required": ["phone_numbers"],
        },
        "method": "POST",
        "path": "/portability_checks",
        "category": "porting",
    },
    "list_porting_orders": {
        "name": "list_porting_orders",
        "description": "List porting orders on the account.",
        "parameters": {
            "type": "object",
            "properties": {
                "page_size": {
                    "type": "integer",
                    "description": "Number of results per page.",
                    "default": 20,
                },
                "page_number": {
                    "type": "integer",
                    "description": "Page number to retrieve.",
                    "default": 1,
                },
            },
            "required": [],
        },
        "method": "GET",
        "path": "/porting_orders",
        "category": "porting",
    },
    # ─── E911 ────────────────────────────────────────────────────
    "list_e911_addresses": {
        "name": "list_e911_addresses",
        "description": "List emergency (E911) addresses on the account.",
        "parameters": {
            "type": "object",
            "properties": {
                "page_size": {
                    "type": "integer",
                    "description": "Number of results per page.",
                    "default": 20,
                },
                "page_number": {
                    "type": "integer",
                    "description": "Page number to retrieve.",
                    "default": 1,
                },
            },
            "required": [],
        },
        "method": "GET",
        "path": "/e911_addresses",
        "category": "e911",
    },
    "create_e911_address": {
        "name": "create_e911_address",
        "description": "Create a new emergency (E911) address.",
        "parameters": {
            "type": "object",
            "properties": {
                "first_name": {
                    "type": "string",
                    "description": "First name of the address contact.",
                },
                "last_name": {
                    "type": "string",
                    "description": "Last name of the address contact.",
                },
                "street_address": {
                    "type": "string",
                    "description": "Street address.",
                },
                "city": {
                    "type": "string",
                    "description": "City.",
                },
                "state": {
                    "type": "string",
                    "description": "State code (e.g. 'NY').",
                },
                "zip": {
                    "type": "string",
                    "description": "ZIP code.",
                },
                "country_code": {
                    "type": "string",
                    "description": "Country code (e.g. 'US').",
                    "default": "US",
                },
            },
            "required": ["first_name", "last_name", "street_address", "city", "state", "zip", "country_code"],
        },
        "method": "POST",
        "path": "/e911_addresses",
        "category": "e911",
    },
    # ─── Billing ─────────────────────────────────────────────────
    "list_billing_groups": {
        "name": "list_billing_groups",
        "description": "List billing groups on the account.",
        "parameters": {
            "type": "object",
            "properties": {
                "page_size": {
                    "type": "integer",
                    "description": "Number of results per page.",
                    "default": 20,
                },
                "page_number": {
                    "type": "integer",
                    "description": "Page number to retrieve.",
                    "default": 1,
                },
            },
            "required": [],
        },
        "method": "GET",
        "path": "/billing_groups",
        "category": "billing",
    },
    "create_billing_group": {
        "name": "create_billing_group",
        "description": "Create a new billing group.",
        "parameters": {
            "type": "object",
            "properties": {
                "name": {
                    "type": "string",
                    "description": "Name for the billing group.",
                },
            },
            "required": ["name"],
        },
        "method": "POST",
        "path": "/billing_groups",
        "category": "billing",
    },
    # ─── Webhooks ────────────────────────────────────────────────
    "list_webhook_deliveries": {
        "name": "list_webhook_deliveries",
        "description": "List webhook deliveries on the account.",
        "parameters": {
            "type": "object",
            "properties": {
                "page_size": {
                    "type": "integer",
                    "description": "Number of results per page.",
                    "default": 20,
                },
                "filter_status_code": {
                    "type": "string",
                    "description": "Filter by HTTP status code.",
                },
                "filter_webhook_url": {
                    "type": "string",
                    "description": "Filter by webhook URL.",
                },
                "filter_attempt_status": {
                    "type": "string",
                    "description": "Filter by attempt status.",
                },
            },
            "required": [],
        },
        "method": "GET",
        "path": "/webhook_deliveries",
        "category": "webhooks",
    },
    "get_webhook_delivery": {
        "name": "get_webhook_delivery",
        "description": "Get details of a specific webhook delivery.",
        "parameters": {
            "type": "object",
            "properties": {
                "id": {
                    "type": "string",
                    "description": "The ID of the webhook delivery to retrieve.",
                },
            },
            "required": ["id"],
        },
        "method": "GET",
        "path": "/webhook_deliveries/{id}",
        "category": "webhooks",
    },
    # ─── Networking ──────────────────────────────────────────────
    "list_networks": {
        "name": "list_networks",
        "description": "List private networks on the account.",
        "parameters": {
            "type": "object",
            "properties": {
                "page_size": {
                    "type": "integer",
                    "description": "Number of results per page.",
                    "default": 20,
                },
                "page_number": {
                    "type": "integer",
                    "description": "Page number to retrieve.",
                    "default": 1,
                },
            },
            "required": [],
        },
        "method": "GET",
        "path": "/networks",
        "category": "networking",
    },
    "create_network": {
        "name": "create_network",
        "description": "Create a new private network.",
        "parameters": {
            "type": "object",
            "properties": {
                "name": {
                    "type": "string",
                    "description": "Name for the network.",
                },
                "cidr_block": {
                    "type": "string",
                    "description": "CIDR block for the network (e.g. '10.0.0.0/16').",
                },
                "region": {
                    "type": "string",
                    "description": "Region for the network.",
                },
            },
            "required": ["name"],
        },
        "method": "POST",
        "path": "/networks",
        "category": "networking",
    },
    # ─── Storage (delete) ────────────────────────────────────────
    "delete_storage_bucket": {
        "name": "delete_storage_bucket",
        "description": "Delete a storage bucket.",
        "parameters": {
            "type": "object",
            "properties": {
                "bucket_name": {
                    "type": "string",
                    "description": "Name of the storage bucket to delete.",
                },
            },
            "required": ["bucket_name"],
        },
        "method": "DELETE",
        "path": "/storage/buckets/{bucket_name}",
        "category": "storage",
    },
    # ─── Fax ─────────────────────────────────────────────────────
    "list_faxes": {
        "name": "list_faxes",
        "description": "List faxes on the account.",
        "parameters": {
            "type": "object",
            "properties": {
                "page_size": {
                    "type": "integer",
                    "description": "Number of results per page.",
                    "default": 20,
                },
                "page_number": {
                    "type": "integer",
                    "description": "Page number to retrieve.",
                    "default": 1,
                },
            },
            "required": [],
        },
        "method": "GET",
        "path": "/faxes",
        "category": "fax",
    },
    "get_fax": {
        "name": "get_fax",
        "description": "Get details of a specific fax.",
        "parameters": {
            "type": "object",
            "properties": {
                "id": {
                    "type": "string",
                    "description": "The ID of the fax to retrieve.",
                },
            },
            "required": ["id"],
        },
        "method": "GET",
        "path": "/faxes/{id}",
        "category": "fax",
    },
    "delete_fax": {
        "name": "delete_fax",
        "description": "Delete a fax.",
        "parameters": {
            "type": "object",
            "properties": {
                "id": {
                    "type": "string",
                    "description": "The ID of the fax to delete.",
                },
            },
            "required": ["id"],
        },
        "method": "DELETE",
        "path": "/faxes/{id}",
        "category": "fax",
    },
    # ─── Storage Objects ─────────────────────────────────────────
    "upload_storage_object": {
        "name": "upload_storage_object",
        "description": "Upload an object to a storage bucket (S3-compatible PUT).",
        "parameters": {
            "type": "object",
            "properties": {
                "bucket_name": {
                    "type": "string",
                    "description": "Name of the storage bucket.",
                },
                "key": {
                    "type": "string",
                    "description": "Object key (path) within the bucket.",
                },
                "content_type": {
                    "type": "string",
                    "description": "MIME type of the object.",
                    "default": "application/octet-stream",
                },
            },
            "required": ["bucket_name", "key"],
        },
        "method": "PUT",
        "path": "/storage/buckets/{bucket_name}/{key}",
        "category": "storage",
    },
    "get_storage_object": {
        "name": "get_storage_object",
        "description": "Retrieve an object from a storage bucket.",
        "parameters": {
            "type": "object",
            "properties": {
                "bucket_name": {
                    "type": "string",
                    "description": "Name of the storage bucket.",
                },
                "key": {
                    "type": "string",
                    "description": "Object key (path) within the bucket.",
                },
            },
            "required": ["bucket_name", "key"],
        },
        "method": "GET",
        "path": "/storage/buckets/{bucket_name}/{key}",
        "category": "storage",
    },
    "create_presigned_url": {
        "name": "create_presigned_url",
        "description": "Create a presigned URL for uploading or downloading a storage object.",
        "parameters": {
            "type": "object",
            "properties": {
                "bucket_name": {
                    "type": "string",
                    "description": "Name of the storage bucket.",
                },
                "key": {
                    "type": "string",
                    "description": "Object key (path) within the bucket.",
                },
                "method": {
                    "type": "string",
                    "description": "HTTP method for the presigned URL.",
                    "enum": ["GET", "PUT"],
                    "default": "GET",
                },
                "expires_in": {
                    "type": "integer",
                    "description": "URL expiration time in seconds.",
                    "default": 3600,
                },
            },
            "required": ["bucket_name", "key"],
        },
        "method": "POST",
        "path": "/storage/buckets/{bucket_name}/presigned_url",
        "category": "storage",
    },
    # ─── Porting (create order) ──────────────────────────────────
    "create_porting_order": {
        "name": "create_porting_order",
        "description": "Create a new porting order to port phone numbers to Telnyx.",
        "parameters": {
            "type": "object",
            "properties": {
                "phone_numbers": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "List of phone numbers to port (E.164 format).",
                },
                "customer_name": {
                    "type": "string",
                    "description": "Name of the customer requesting the port.",
                },
                "authorized_person": {
                    "type": "string",
                    "description": "Person authorized to make the porting request.",
                },
                "billing_phone_number": {
                    "type": "string",
                    "description": "Billing telephone number on the current account.",
                },
                "old_service_provider": {
                    "type": "string",
                    "description": "Name of the current service provider.",
                },
            },
            "required": ["phone_numbers"],
        },
        "method": "POST",
        "path": "/porting_orders",
        "category": "porting",
    },

    # ─── Porting (extended CRUD + actions) ────────────────────────
    "get_porting_order": {
        "name": "get_porting_order",
        "description": "Retrieve details of a specific porting order.",
        "parameters": {
            "type": "object",
            "properties": {
                "id": {
                    "type": "string",
                    "description": "The ID of the porting order to retrieve.",
                },
            },
            "required": ["id"],
        },
        "method": "GET",
        "path": "/porting_orders/{id}",
        "category": "porting",
    },

    "update_porting_order": {
        "name": "update_porting_order",
        "description": "Update an existing porting order.",
        "parameters": {
            "type": "object",
            "properties": {
                "id": {
                    "type": "string",
                    "description": "The ID of the porting order to update.",
                },
                "customer_reference": {
                    "type": "string",
                    "description": "Customer reference for the porting order.",
                },
                "description": {
                    "type": "string",
                    "description": "Description of the porting order.",
                },
            },
            "required": ["id"],
        },
        "method": "PATCH",
        "path": "/porting_orders/{id}",
        "category": "porting",
    },

    "delete_porting_order": {
        "name": "delete_porting_order",
        "description": "Delete a porting order. Only draft orders can be deleted.",
        "parameters": {
            "type": "object",
            "properties": {
                "id": {
                    "type": "string",
                    "description": "The ID of the porting order to delete.",
                },
            },
            "required": ["id"],
        },
        "method": "DELETE",
        "path": "/porting_orders/{id}",
        "category": "porting",
    },

    "submit_porting_order": {
        "name": "submit_porting_order",
        "description": "Confirm and submit a porting order for processing.",
        "parameters": {
            "type": "object",
            "properties": {
                "id": {
                    "type": "string",
                    "description": "The ID of the porting order to submit.",
                },
            },
            "required": ["id"],
        },
        "method": "POST",
        "path": "/porting_orders/{id}/actions/confirm",
        "category": "porting",
    },

    "cancel_porting_order": {
        "name": "cancel_porting_order",
        "description": "Cancel a porting order.",
        "parameters": {
            "type": "object",
            "properties": {
                "id": {
                    "type": "string",
                    "description": "The ID of the porting order to cancel.",
                },
            },
            "required": ["id"],
        },
        "method": "POST",
        "path": "/porting_orders/{id}/actions/cancel",
        "category": "porting",
    },

    "activate_porting_order": {
        "name": "activate_porting_order",
        "description": "Activate all numbers in a porting order asynchronously. Only for US FastPort orders.",
        "parameters": {
            "type": "object",
            "properties": {
                "id": {
                    "type": "string",
                    "description": "The ID of the porting order to activate.",
                },
            },
            "required": ["id"],
        },
        "method": "POST",
        "path": "/porting_orders/{id}/actions/activate",
        "category": "porting",
    },

    "list_porting_phone_numbers": {
        "name": "list_porting_phone_numbers",
        "description": "List phone numbers associated with porting orders.",
        "parameters": {
            "type": "object",
            "properties": {
                "page_size": {
                    "type": "integer",
                    "description": "Number of results per page.",
                    "default": 20,
                },
                "page_number": {
                    "type": "integer",
                    "description": "Page number to retrieve.",
                    "default": 1,
                },
            },
            "required": [],
        },
        "method": "GET",
        "path": "/porting_phone_numbers",
        "category": "porting",
    },

    "list_porting_comments": {
        "name": "list_porting_comments",
        "description": "List comments on a specific porting order.",
        "parameters": {
            "type": "object",
            "properties": {
                "id": {
                    "type": "string",
                    "description": "The ID of the porting order.",
                },
            },
            "required": ["id"],
        },
        "method": "GET",
        "path": "/porting_orders/{id}/comments",
        "category": "porting",
    },

    "create_porting_comment": {
        "name": "create_porting_comment",
        "description": "Add a comment to a porting order.",
        "parameters": {
            "type": "object",
            "properties": {
                "id": {
                    "type": "string",
                    "description": "The ID of the porting order.",
                },
                "body": {
                    "type": "string",
                    "description": "The comment text.",
                },
            },
            "required": ["id", "body"],
        },
        "method": "POST",
        "path": "/porting_orders/{id}/comments",
        "category": "porting",
    },

    "list_porting_documents": {
        "name": "list_porting_documents",
        "description": "List additional documents for a porting order.",
        "parameters": {
            "type": "object",
            "properties": {
                "id": {
                    "type": "string",
                    "description": "The ID of the porting order.",
                },
            },
            "required": ["id"],
        },
        "method": "GET",
        "path": "/porting_orders/{id}/additional_documents",
        "category": "porting",
    },

    "upload_porting_document": {
        "name": "upload_porting_document",
        "description": (
            "Upload an additional document to a porting order. "
            "Provide the porting order ID, document type, and base64-encoded file contents. "
            "Supported document types: loa, invoice, csr, other."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "id": {
                    "type": "string",
                    "description": "The ID of the porting order.",
                },
                "document_type": {
                    "type": "string",
                    "description": "Type of document (loa, invoice, csr, other).",
                    "enum": ["loa", "invoice", "csr", "other"],
                },
                "file_content": {
                    "type": "string",
                    "description": (
                        "Base64-encoded file contents to upload. "
                        "For example, a PDF or PNG of the Letter of Authorization."
                    ),
                },
                "filename": {
                    "type": "string",
                    "description": "Optional filename for the uploaded document (e.g. 'loa.pdf').",
                },
            },
            "required": ["id", "document_type", "file_content"],
        },
        "method": "POST",
        "path": "/porting_orders/{id}/additional_documents",
        "category": "porting",
    },

    "list_porting_events": {
        "name": "list_porting_events",
        "description": "List all porting events.",
        "parameters": {
            "type": "object",
            "properties": {
                "page_size": {
                    "type": "integer",
                    "description": "Number of results per page.",
                    "default": 20,
                },
            },
            "required": [],
        },
        "method": "GET",
        "path": "/porting/events",
        "category": "porting",
    },

    "list_porting_exception_types": {
        "name": "list_porting_exception_types",
        "description": "List all possible exception types for porting orders.",
        "parameters": {
            "type": "object",
            "properties": {},
            "required": [],
        },
        "method": "GET",
        "path": "/porting_orders/exception_types",
        "category": "porting",
    },

    "list_allowed_foc_windows": {
        "name": "list_allowed_foc_windows",
        "description": "List allowed FOC (Firm Order Commitment) dates for a porting order.",
        "parameters": {
            "type": "object",
            "properties": {
                "id": {
                    "type": "string",
                    "description": "The ID of the porting order.",
                },
            },
            "required": ["id"],
        },
        "method": "GET",
        "path": "/porting_orders/{id}/allowed_foc_windows",
        "category": "porting",
    },

    "list_porting_requirements": {
        "name": "list_porting_requirements",
        "description": "List requirements for a porting order based on country and number type.",
        "parameters": {
            "type": "object",
            "properties": {
                "id": {
                    "type": "string",
                    "description": "The ID of the porting order.",
                },
            },
            "required": ["id"],
        },
        "method": "GET",
        "path": "/porting_orders/{id}/requirements",
        "category": "porting",
    },

    "list_porting_activation_jobs": {
        "name": "list_porting_activation_jobs",
        "description": "List activation jobs for a porting order.",
        "parameters": {
            "type": "object",
            "properties": {
                "id": {
                    "type": "string",
                    "description": "The ID of the porting order.",
                },
            },
            "required": ["id"],
        },
        "method": "GET",
        "path": "/porting_orders/{id}/activation_jobs",
        "category": "porting",
    },

    "get_porting_activation_job": {
        "name": "get_porting_activation_job",
        "description": "Get details of a specific porting activation job.",
        "parameters": {
            "type": "object",
            "properties": {
                "id": {
                    "type": "string",
                    "description": "The ID of the porting order.",
                },
                "activation_job_id": {
                    "type": "string",
                    "description": "The ID of the activation job.",
                },
            },
            "required": ["id", "activation_job_id"],
        },
        "method": "GET",
        "path": "/porting_orders/{id}/activation_jobs/{activation_job_id}",
        "category": "porting",
    },

    "update_porting_activation_job": {
        "name": "update_porting_activation_job",
        "description": "Update the activation time of a porting activation job.",
        "parameters": {
            "type": "object",
            "properties": {
                "id": {
                    "type": "string",
                    "description": "The ID of the porting order.",
                },
                "activation_job_id": {
                    "type": "string",
                    "description": "The ID of the activation job.",
                },
            },
            "required": ["id", "activation_job_id"],
        },
        "method": "PATCH",
        "path": "/porting_orders/{id}/activation_jobs/{activation_job_id}",
        "category": "porting",
    },

    "list_porting_loa_configurations": {
        "name": "list_porting_loa_configurations",
        "description": "List LOA (Letter of Authorization) configurations.",
        "parameters": {
            "type": "object",
            "properties": {
                "page_size": {
                    "type": "integer",
                    "description": "Number of results per page.",
                    "default": 20,
                },
            },
            "required": [],
        },
        "method": "GET",
        "path": "/porting/loa_configurations",
        "category": "porting",
    },

    "create_porting_loa_configuration": {
        "name": "create_porting_loa_configuration",
        "description": "Create a new LOA (Letter of Authorization) configuration.",
        "parameters": {
            "type": "object",
            "properties": {
                "name": {
                    "type": "string",
                    "description": "Name for the LOA configuration.",
                },
            },
            "required": ["name"],
        },
        "method": "POST",
        "path": "/porting/loa_configurations",
        "category": "porting",
    },

    "get_porting_loa_configuration": {
        "name": "get_porting_loa_configuration",
        "description": "Retrieve a specific LOA configuration.",
        "parameters": {
            "type": "object",
            "properties": {
                "id": {
                    "type": "string",
                    "description": "The ID of the LOA configuration.",
                },
            },
            "required": ["id"],
        },
        "method": "GET",
        "path": "/porting/loa_configurations/{id}",
        "category": "porting",
    },

    "list_porting_reports": {
        "name": "list_porting_reports",
        "description": "List porting-related reports.",
        "parameters": {
            "type": "object",
            "properties": {
                "page_size": {
                    "type": "integer",
                    "description": "Number of results per page.",
                    "default": 20,
                },
            },
            "required": [],
        },
        "method": "GET",
        "path": "/porting/reports",
        "category": "porting",
    },

    "create_porting_report": {
        "name": "create_porting_report",
        "description": "Generate a porting-related report.",
        "parameters": {
            "type": "object",
            "properties": {
                "report_type": {
                    "type": "string",
                    "description": "Type of report to generate.",
                    "enum": ["export_porting_orders_csv"],
                },
            },
            "required": [],
        },
        "method": "POST",
        "path": "/porting/reports",
        "category": "porting",
    },

    # ─── Port-Out ────────────────────────────────────────────────
    "list_portout_orders": {
        "name": "list_portout_orders",
        "description": "List port-out orders on the account.",
        "parameters": {
            "type": "object",
            "properties": {
                "page_size": {
                    "type": "integer",
                    "description": "Number of results per page.",
                    "default": 20,
                },
                "page_number": {
                    "type": "integer",
                    "description": "Page number to retrieve.",
                    "default": 1,
                },
            },
            "required": [],
        },
        "method": "GET",
        "path": "/portout_orders",
        "category": "portout",
    },

    "get_portout_order": {
        "name": "get_portout_order",
        "description": "Retrieve details of a specific port-out order.",
        "parameters": {
            "type": "object",
            "properties": {
                "id": {
                    "type": "string",
                    "description": "The ID of the port-out order.",
                },
            },
            "required": ["id"],
        },
        "method": "GET",
        "path": "/portout_orders/{id}",
        "category": "portout",
    },

    "list_portout_comments": {
        "name": "list_portout_comments",
        "description": "List comments on a specific port-out order.",
        "parameters": {
            "type": "object",
            "properties": {
                "id": {
                    "type": "string",
                    "description": "The ID of the port-out order.",
                },
            },
            "required": ["id"],
        },
        "method": "GET",
        "path": "/portout_orders/{id}/comments",
        "category": "portout",
    },

    "create_portout_comment": {
        "name": "create_portout_comment",
        "description": "Add a comment to a port-out order.",
        "parameters": {
            "type": "object",
            "properties": {
                "id": {
                    "type": "string",
                    "description": "The ID of the port-out order.",
                },
                "body": {
                    "type": "string",
                    "description": "The comment text.",
                },
            },
            "required": ["id", "body"],
        },
        "method": "POST",
        "path": "/portout_orders/{id}/comments",
        "category": "portout",
    },

    "list_portout_documents": {
        "name": "list_portout_documents",
        "description": "List documents for a specific port-out order.",
        "parameters": {
            "type": "object",
            "properties": {
                "id": {
                    "type": "string",
                    "description": "The ID of the port-out order.",
                },
            },
            "required": ["id"],
        },
        "method": "GET",
        "path": "/portout_orders/{id}/documents",
        "category": "portout",
    },

    "upload_portout_document": {
        "name": "upload_portout_document",
        "description": (
            "Upload a document to a port-out order. "
            "Provide the port-out order ID and base64-encoded file contents."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "id": {
                    "type": "string",
                    "description": "The ID of the port-out order.",
                },
                "file_content": {
                    "type": "string",
                    "description": "Base64-encoded file contents to upload.",
                },
                "filename": {
                    "type": "string",
                    "description": "Optional filename for the uploaded document.",
                },
            },
            "required": ["id", "file_content"],
        },
        "method": "POST",
        "path": "/portout_orders/{id}/documents",
        "category": "portout",
    },

    "list_portout_rejection_codes": {
        "name": "list_portout_rejection_codes",
        "description": "List rejection codes available for port-out orders.",
        "parameters": {
            "type": "object",
            "properties": {},
            "required": [],
        },
        "method": "GET",
        "path": "/portout_orders/rejection_codes",
        "category": "portout",
    },

    "list_portout_events": {
        "name": "list_portout_events",
        "description": "List all port-out events.",
        "parameters": {
            "type": "object",
            "properties": {
                "page_size": {
                    "type": "integer",
                    "description": "Number of results per page.",
                    "default": 20,
                },
            },
            "required": [],
        },
        "method": "GET",
        "path": "/portout/events",
        "category": "portout",
    },

    # ─── E911 (update/delete) ────────────────────────────────────
    "update_e911_address": {
        "name": "update_e911_address",
        "description": "Update an existing emergency (E911) address.",
        "parameters": {
            "type": "object",
            "properties": {
                "id": {
                    "type": "string",
                    "description": "The ID of the E911 address to update.",
                },
                "street_address": {
                    "type": "string",
                    "description": "Street address.",
                },
                "city": {
                    "type": "string",
                    "description": "City.",
                },
                "state": {
                    "type": "string",
                    "description": "State code (e.g. 'NY').",
                },
                "postal_code": {
                    "type": "string",
                    "description": "Postal/ZIP code.",
                },
                "country_code": {
                    "type": "string",
                    "description": "Country code (e.g. 'US').",
                },
            },
            "required": ["id"],
        },
        "method": "PATCH",
        "path": "/e911_addresses/{id}",
        "category": "e911",
    },
    "delete_e911_address": {
        "name": "delete_e911_address",
        "description": "Delete an emergency (E911) address.",
        "parameters": {
            "type": "object",
            "properties": {
                "id": {
                    "type": "string",
                    "description": "The ID of the E911 address to delete.",
                },
            },
            "required": ["id"],
        },
        "method": "DELETE",
        "path": "/e911_addresses/{id}",
        "category": "e911",
    },
    # ─── Billing (update/delete) ─────────────────────────────────
    "update_billing_group": {
        "name": "update_billing_group",
        "description": "Update an existing billing group.",
        "parameters": {
            "type": "object",
            "properties": {
                "id": {
                    "type": "string",
                    "description": "The ID of the billing group to update.",
                },
                "name": {
                    "type": "string",
                    "description": "New name for the billing group.",
                },
                "organization_id": {
                    "type": "string",
                    "description": "Organization ID to associate.",
                },
            },
            "required": ["id"],
        },
        "method": "PATCH",
        "path": "/billing_groups/{id}",
        "category": "billing",
    },
    "delete_billing_group": {
        "name": "delete_billing_group",
        "description": "Delete a billing group.",
        "parameters": {
            "type": "object",
            "properties": {
                "id": {
                    "type": "string",
                    "description": "The ID of the billing group to delete.",
                },
            },
            "required": ["id"],
        },
        "method": "DELETE",
        "path": "/billing_groups/{id}",
        "category": "billing",
    },
    # ─── Networking (update/delete/interfaces) ───────────────────
    "update_network": {
        "name": "update_network",
        "description": "Update an existing private network.",
        "parameters": {
            "type": "object",
            "properties": {
                "id": {
                    "type": "string",
                    "description": "The ID of the network to update.",
                },
                "name": {
                    "type": "string",
                    "description": "New name for the network.",
                },
            },
            "required": ["id"],
        },
        "method": "PATCH",
        "path": "/networks/{id}",
        "category": "networking",
    },
    "delete_network": {
        "name": "delete_network",
        "description": "Delete a private network.",
        "parameters": {
            "type": "object",
            "properties": {
                "id": {
                    "type": "string",
                    "description": "The ID of the network to delete.",
                },
            },
            "required": ["id"],
        },
        "method": "DELETE",
        "path": "/networks/{id}",
        "category": "networking",
    },
    "list_network_interfaces": {
        "name": "list_network_interfaces",
        "description": "List network interfaces, optionally filtered by network.",
        "parameters": {
            "type": "object",
            "properties": {
                "network_id": {
                    "type": "string",
                    "description": "Filter by network ID.",
                },
                "page_size": {
                    "type": "integer",
                    "description": "Number of results per page.",
                    "default": 20,
                },
                "page_number": {
                    "type": "integer",
                    "description": "Page number to retrieve.",
                    "default": 1,
                },
            },
            "required": [],
        },
        "method": "GET",
        "path": "/network_interfaces",
        "category": "networking",
    },
    # ─── Lookup (bulk) ───────────────────────────────────────────
    "bulk_lookup_numbers": {
        "name": "bulk_lookup_numbers",
        "description": "Look up information about multiple phone numbers in bulk.",
        "parameters": {
            "type": "object",
            "properties": {
                "phone_numbers": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "List of phone numbers to look up (E.164 format).",
                },
            },
            "required": ["phone_numbers"],
        },
        "method": "POST",
        "path": "/number_lookup",
        "category": "lookup",
    },
    # ─── Messages (get single) ───────────────────────────────────
    "get_message": {
        "name": "get_message",
        "description": "Get details of a specific message.",
        "parameters": {
            "type": "object",
            "properties": {
                "id": {
                    "type": "string",
                    "description": "The ID of the message to retrieve.",
                },
            },
            "required": ["id"],
        },
        "method": "GET",
        "path": "/messages/{id}",
        "category": "messaging",
    },
    # ─── AI Missions ─────────────────────────────────────────────
    "create_mission": {
        "name": "create_mission",
        "description": "Create a new AI mission.",
        "parameters": {
            "type": "object",
            "properties": {
                "name": {
                    "type": "string",
                    "description": "Name of the mission.",
                },
                "instructions": {
                    "type": "string",
                    "description": "Instructions for the mission.",
                },
            },
            "required": ["name", "instructions"],
        },
        "method": "POST",
        "path": "/ai/missions",
        "category": "missions",
    },
    "get_mission": {
        "name": "get_mission",
        "description": "Get details of a specific AI mission.",
        "parameters": {
            "type": "object",
            "properties": {
                "mission_id": {
                    "type": "string",
                    "description": "The ID of the mission to retrieve.",
                },
            },
            "required": ["mission_id"],
        },
        "method": "GET",
        "path": "/ai/missions/{mission_id}",
        "category": "missions",
    },
    "list_missions": {
        "name": "list_missions",
        "description": "List AI missions on the account.",
        "parameters": {
            "type": "object",
            "properties": {
                "page_size": {
                    "type": "integer",
                    "description": "Number of results per page.",
                    "default": 20,
                },
            },
            "required": [],
        },
        "method": "GET",
        "path": "/ai/missions",
        "category": "missions",
    },
    "create_mission_run": {
        "name": "create_mission_run",
        "description": "Create a new run for an AI mission.",
        "parameters": {
            "type": "object",
            "properties": {
                "mission_id": {
                    "type": "string",
                    "description": "The ID of the mission to create a run for.",
                },
                "input": {
                    "type": "string",
                    "description": "Input data for the mission run.",
                },
            },
            "required": ["mission_id", "input"],
        },
        "method": "POST",
        "path": "/ai/missions/{mission_id}/runs",
        "category": "missions",
    },
    "get_mission_run": {
        "name": "get_mission_run",
        "description": "Get details of a specific mission run.",
        "parameters": {
            "type": "object",
            "properties": {
                "mission_id": {
                    "type": "string",
                    "description": "The ID of the mission.",
                },
                "run_id": {
                    "type": "string",
                    "description": "The ID of the run to retrieve.",
                },
            },
            "required": ["mission_id", "run_id"],
        },
        "method": "GET",
        "path": "/ai/missions/{mission_id}/runs/{run_id}",
        "category": "missions",
    },
    "update_mission_run": {
        "name": "update_mission_run",
        "description": "Update an existing mission run (e.g. status, result).",
        "parameters": {
            "type": "object",
            "properties": {
                "mission_id": {
                    "type": "string",
                    "description": "The ID of the mission.",
                },
                "run_id": {
                    "type": "string",
                    "description": "The ID of the run to update.",
                },
                "status": {
                    "type": "string",
                    "description": "New status for the run.",
                },
                "result_summary": {
                    "type": "string",
                    "description": "Summary of the run result.",
                },
                "result_payload": {
                    "type": "object",
                    "description": "Structured result payload.",
                },
            },
            "required": ["mission_id", "run_id"],
        },
        "method": "PATCH",
        "path": "/ai/missions/{mission_id}/runs/{run_id}",
        "category": "missions",
    },
    "create_mission_plan": {
        "name": "create_mission_plan",
        "description": "Create a plan with steps for a mission run.",
        "parameters": {
            "type": "object",
            "properties": {
                "mission_id": {
                    "type": "string",
                    "description": "The ID of the mission.",
                },
                "run_id": {
                    "type": "string",
                    "description": "The ID of the run to create a plan for.",
                },
                "steps": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "step_id": {"type": "string"},
                            "description": {"type": "string"},
                            "sequence": {"type": "integer"},
                        },
                    },
                    "description": "List of plan steps.",
                },
            },
            "required": ["mission_id", "run_id", "steps"],
        },
        "method": "POST",
        "path": "/ai/missions/{mission_id}/runs/{run_id}/plan",
        "category": "missions",
    },
    "update_mission_step": {
        "name": "update_mission_step",
        "description": "Update the status of a step in a mission run plan.",
        "parameters": {
            "type": "object",
            "properties": {
                "mission_id": {
                    "type": "string",
                    "description": "The ID of the mission.",
                },
                "run_id": {
                    "type": "string",
                    "description": "The ID of the run.",
                },
                "step_id": {
                    "type": "string",
                    "description": "The ID of the step to update.",
                },
                "status": {
                    "type": "string",
                    "description": "New status for the step.",
                },
            },
            "required": ["mission_id", "run_id", "step_id", "status"],
        },
        "method": "PUT",
        "path": "/ai/missions/{mission_id}/runs/{run_id}/plan/steps/{step_id}",
        "category": "missions",
    },
    "log_mission_event": {
        "name": "log_mission_event",
        "description": "Log an event for a mission run.",
        "parameters": {
            "type": "object",
            "properties": {
                "mission_id": {
                    "type": "string",
                    "description": "The ID of the mission.",
                },
                "run_id": {
                    "type": "string",
                    "description": "The ID of the run.",
                },
                "type": {
                    "type": "string",
                    "description": "Type of event.",
                },
                "summary": {
                    "type": "string",
                    "description": "Summary of the event.",
                },
                "step_id": {
                    "type": "string",
                    "description": "Optional step ID this event relates to.",
                },
                "payload": {
                    "type": "object",
                    "description": "Optional structured event payload.",
                },
            },
            "required": ["mission_id", "run_id", "type", "summary"],
        },
        "method": "POST",
        "path": "/ai/missions/{mission_id}/runs/{run_id}/events",
        "category": "missions",
    },
    # ─── AI Insights ─────────────────────────────────────────────
    "create_insight": {
        "name": "create_insight",
        "description": "Create a new conversation insight definition.",
        "parameters": {
            "type": "object",
            "properties": {
                "name": {
                    "type": "string",
                    "description": "Name of the insight.",
                },
                "instructions": {
                    "type": "string",
                    "description": "Instructions for extracting the insight.",
                },
                "json_schema": {
                    "type": "object",
                    "description": "JSON schema for the insight output.",
                },
            },
            "required": ["name", "instructions"],
        },
        "method": "POST",
        "path": "/ai/conversations/insights",
        "category": "insights",
    },
    "get_insight": {
        "name": "get_insight",
        "description": "Get details of a specific conversation insight.",
        "parameters": {
            "type": "object",
            "properties": {
                "insight_id": {
                    "type": "string",
                    "description": "The ID of the insight to retrieve.",
                },
            },
            "required": ["insight_id"],
        },
        "method": "GET",
        "path": "/ai/conversations/insights/{insight_id}",
        "category": "insights",
    },
    "list_insights": {
        "name": "list_insights",
        "description": "List conversation insight definitions.",
        "parameters": {
            "type": "object",
            "properties": {
                "page_size": {
                    "type": "integer",
                    "description": "Number of results per page.",
                    "default": 20,
                },
            },
            "required": [],
        },
        "method": "GET",
        "path": "/ai/conversations/insights",
        "category": "insights",
    },
    "update_insight": {
        "name": "update_insight",
        "description": "Update an existing conversation insight definition.",
        "parameters": {
            "type": "object",
            "properties": {
                "insight_id": {
                    "type": "string",
                    "description": "The ID of the insight to update.",
                },
                "name": {
                    "type": "string",
                    "description": "New name for the insight.",
                },
                "instructions": {
                    "type": "string",
                    "description": "New instructions for the insight.",
                },
            },
            "required": ["insight_id"],
        },
        "method": "PUT",
        "path": "/ai/conversations/insights/{insight_id}",
        "category": "insights",
    },
    "create_insight_group": {
        "name": "create_insight_group",
        "description": "Create a new insight group.",
        "parameters": {
            "type": "object",
            "properties": {
                "name": {
                    "type": "string",
                    "description": "Name of the insight group.",
                },
                "description": {
                    "type": "string",
                    "description": "Description of the insight group.",
                },
            },
            "required": ["name"],
        },
        "method": "POST",
        "path": "/ai/conversations/insight-groups",
        "category": "insights",
    },
    "get_insight_group": {
        "name": "get_insight_group",
        "description": "Get details of a specific insight group.",
        "parameters": {
            "type": "object",
            "properties": {
                "group_id": {
                    "type": "string",
                    "description": "The ID of the insight group to retrieve.",
                },
            },
            "required": ["group_id"],
        },
        "method": "GET",
        "path": "/ai/conversations/insight-groups/{group_id}",
        "category": "insights",
    },
    "assign_insight_to_group": {
        "name": "assign_insight_to_group",
        "description": "Assign an insight to an insight group.",
        "parameters": {
            "type": "object",
            "properties": {
                "group_id": {
                    "type": "string",
                    "description": "The ID of the insight group.",
                },
                "insight_id": {
                    "type": "string",
                    "description": "The ID of the insight to assign.",
                },
            },
            "required": ["group_id", "insight_id"],
        },
        "method": "POST",
        "path": "/ai/conversations/insight-groups/{group_id}/insights/{insight_id}/assign",
        "category": "insights",
    },
    # ─── Scheduled Events ────────────────────────────────────────
    "schedule_call": {
        "name": "schedule_call",
        "description": "Schedule an outbound call via an AI assistant.",
        "parameters": {
            "type": "object",
            "properties": {
                "assistant_id": {
                    "type": "string",
                    "description": "The AI assistant ID to use for the call.",
                },
                "to": {
                    "type": "string",
                    "description": "Destination phone number (E.164 format).",
                },
                "from_": {
                    "type": "string",
                    "description": "Caller ID phone number (E.164 format).",
                },
                "scheduled_at_fixed_datetime": {
                    "type": "string",
                    "description": "ISO 8601 datetime to schedule the call.",
                },
                "mission_id": {
                    "type": "string",
                    "description": "Optional mission ID to associate.",
                },
                "mission_run_id": {
                    "type": "string",
                    "description": "Optional mission run ID to associate.",
                },
                "step_id": {
                    "type": "string",
                    "description": "Optional step ID to associate.",
                },
                "dynamic_variables": {
                    "type": "object",
                    "description": "Dynamic variables to pass to the assistant.",
                },
            },
            "required": ["assistant_id", "to", "from_", "scheduled_at_fixed_datetime"],
        },
        "method": "POST",
        "path": "/ai/assistants/{assistant_id}/scheduled_events",
        "category": "scheduled_events",
    },
    "schedule_sms": {
        "name": "schedule_sms",
        "description": "Schedule an outbound SMS via an AI assistant.",
        "parameters": {
            "type": "object",
            "properties": {
                "assistant_id": {
                    "type": "string",
                    "description": "The AI assistant ID to use.",
                },
                "to": {
                    "type": "string",
                    "description": "Destination phone number (E.164 format).",
                },
                "from_": {
                    "type": "string",
                    "description": "Sender phone number (E.164 format).",
                },
                "scheduled_at_fixed_datetime": {
                    "type": "string",
                    "description": "ISO 8601 datetime to schedule the SMS.",
                },
                "first_message_content": {
                    "type": "string",
                    "description": "The initial SMS message content.",
                },
                "mission_id": {
                    "type": "string",
                    "description": "Optional mission ID to associate.",
                },
                "mission_run_id": {
                    "type": "string",
                    "description": "Optional mission run ID to associate.",
                },
                "step_id": {
                    "type": "string",
                    "description": "Optional step ID to associate.",
                },
            },
            "required": ["assistant_id", "to", "from_", "scheduled_at_fixed_datetime", "first_message_content"],
        },
        "method": "POST",
        "path": "/ai/assistants/{assistant_id}/scheduled_events",
        "category": "scheduled_events",
    },
    "get_scheduled_event": {
        "name": "get_scheduled_event",
        "description": "Get details of a specific scheduled event.",
        "parameters": {
            "type": "object",
            "properties": {
                "assistant_id": {
                    "type": "string",
                    "description": "The AI assistant ID.",
                },
                "event_id": {
                    "type": "string",
                    "description": "The ID of the scheduled event to retrieve.",
                },
            },
            "required": ["assistant_id", "event_id"],
        },
        "method": "GET",
        "path": "/ai/assistants/{assistant_id}/scheduled_events/{event_id}",
        "category": "scheduled_events",
    },
    "cancel_scheduled_event": {
        "name": "cancel_scheduled_event",
        "description": "Cancel a scheduled event.",
        "parameters": {
            "type": "object",
            "properties": {
                "assistant_id": {
                    "type": "string",
                    "description": "The AI assistant ID.",
                },
                "event_id": {
                    "type": "string",
                    "description": "The ID of the scheduled event to cancel.",
                },
            },
            "required": ["assistant_id", "event_id"],
        },
        "method": "DELETE",
        "path": "/ai/assistants/{assistant_id}/scheduled_events/{event_id}",
        "category": "scheduled_events",
    },
    # ─── Conversations ───────────────────────────────────────────
    "list_conversations": {
        "name": "list_conversations",
        "description": "List AI conversations on the account.",
        "parameters": {
            "type": "object",
            "properties": {
                "page_size": {
                    "type": "integer",
                    "description": "Number of results per page.",
                    "default": 25,
                },
            },
            "required": [],
        },
        "method": "GET",
        "path": "/ai/conversations",
        "category": "conversations",
    },
    "get_conversation": {
        "name": "get_conversation",
        "description": "Get details of a specific AI conversation.",
        "parameters": {
            "type": "object",
            "properties": {
                "conversation_id": {
                    "type": "string",
                    "description": "The ID of the conversation to retrieve.",
                },
            },
            "required": ["conversation_id"],
        },
        "method": "GET",
        "path": "/ai/conversations/{conversation_id}",
        "category": "conversations",
    },
    "get_conversation_messages": {
        "name": "get_conversation_messages",
        "description": "Get messages from a specific AI conversation.",
        "parameters": {
            "type": "object",
            "properties": {
                "conversation_id": {
                    "type": "string",
                    "description": "The ID of the conversation.",
                },
            },
            "required": ["conversation_id"],
        },
        "method": "GET",
        "path": "/ai/conversations/{conversation_id}/messages",
        "category": "conversations",
    },
    "get_conversation_insights": {
        "name": "get_conversation_insights",
        "description": "Get insights extracted from a specific AI conversation.",
        "parameters": {
            "type": "object",
            "properties": {
                "conversation_id": {
                    "type": "string",
                    "description": "The ID of the conversation.",
                },
            },
            "required": ["conversation_id"],
        },
        "method": "GET",
        "path": "/ai/conversations/{conversation_id}/conversations-insights",
        "category": "conversations",
    },
    # ─── STT / TTS / Embeddings ──────────────────────────────────
    "transcribe_audio": {
        "name": "transcribe_audio",
        "description": "Transcribe audio to text using Telnyx AI speech-to-text. Note: file_url is used for URL-based transcription; direct file upload requires multipart/form-data handling.",
        "parameters": {
            "type": "object",
            "properties": {
                "file_url": {
                    "type": "string",
                    "description": "URL of the audio file to transcribe.",
                },
                "language": {
                    "type": "string",
                    "description": "Language code for transcription (e.g. 'en').",
                },
            },
            "required": ["file_url"],
        },
        "method": "POST",
        "path": "/ai/audio/transcriptions",
        "category": "stt",
    },
    "text_to_speech": {
        "name": "text_to_speech",
        "description": "Generate speech audio from text using Telnyx AI. Note: the primary TTS interface may be WebSocket-based; this REST endpoint is provided for simple use cases.",
        "parameters": {
            "type": "object",
            "properties": {
                "text": {
                    "type": "string",
                    "description": "Text to convert to speech.",
                },
                "voice": {
                    "type": "string",
                    "description": "Voice ID to use for speech generation.",
                },
                "model": {
                    "type": "string",
                    "description": "TTS model to use.",
                },
            },
            "required": ["text"],
        },
        "method": "POST",
        "path": "/ai/generate",
        "category": "tts",
    },
    "generate_embeddings": {
        "name": "generate_embeddings",
        "description": "Generate embeddings using the OpenAI-compatible endpoint.",
        "parameters": {
            "type": "object",
            "properties": {
                "input": {
                    "type": ["string", "array"],
                    "description": "Text or list of texts to embed.",
                },
                "model": {
                    "type": "string",
                    "description": "Embedding model ID.",
                },
            },
            "required": ["input", "model"],
        },
        "method": "POST",
        "path": "/ai/openai/embeddings",
        "category": "embeddings",
    },
    # ─── IoT / Wireless (expanded) ───────────────────────────────
    "get_sim_card_group": {
        "name": "get_sim_card_group",
        "description": "Get details of a specific SIM card group.",
        "parameters": {
            "type": "object",
            "properties": {
                "id": {
                    "type": "string",
                    "description": "The ID of the SIM card group to retrieve.",
                },
            },
            "required": ["id"],
        },
        "method": "GET",
        "path": "/sim_card_groups/{id}",
        "category": "iot",
    },
    "get_sim_card_data_usage": {
        "name": "get_sim_card_data_usage",
        "description": "Get daily network data usage for a SIM card.",
        "parameters": {
            "type": "object",
            "properties": {
                "sim_card_id": {
                    "type": "string",
                    "description": "The ID of the SIM card.",
                },
            },
            "required": ["sim_card_id"],
        },
        "method": "GET",
        "path": "/network_daily_data_usage",
        "category": "iot",
    },
    # ─── Billing (expanded) ──────────────────────────────────────
    "list_invoices": {
        "name": "list_invoices",
        "description": "List invoices on the account.",
        "parameters": {
            "type": "object",
            "properties": {
                "page_size": {
                    "type": "integer",
                    "description": "Number of results per page.",
                    "default": 20,
                },
                "page_number": {
                    "type": "integer",
                    "description": "Page number to retrieve.",
                    "default": 1,
                },
            },
            "required": [],
        },
        "method": "GET",
        "path": "/invoices",
        "category": "billing",
    },
    "get_invoice": {
        "name": "get_invoice",
        "description": "Get details of a specific invoice.",
        "parameters": {
            "type": "object",
            "properties": {
                "id": {
                    "type": "string",
                    "description": "The ID of the invoice to retrieve.",
                },
            },
            "required": ["id"],
        },
        "method": "GET",
        "path": "/invoices/{id}",
        "category": "billing",
    },
    # ─── TeXML Applications ─────────────────────────────────────
    "list_texml_applications": {
        "name": "list_texml_applications",
        "description": "List TeXML applications on the account.",
        "parameters": {
            "type": "object",
            "properties": {
                "page_size": {
                    "type": "integer",
                    "description": "Number of results per page.",
                    "default": 20,
                },
                "page_number": {
                    "type": "integer",
                    "description": "Page number to retrieve.",
                    "default": 1,
                },
            },
            "required": [],
        },
        "method": "GET",
        "path": "/texml_applications",
        "category": "texml",
    },
    "create_texml_application": {
        "name": "create_texml_application",
        "description": "Create a new TeXML application.",
        "parameters": {
            "type": "object",
            "properties": {
                "friendly_name": {
                    "type": "string",
                    "description": "A friendly name for the TeXML application.",
                },
                "voice_url": {
                    "type": "string",
                    "description": "The URL to request when a call is received.",
                },
                "voice_method": {
                    "type": "string",
                    "description": "HTTP method for voice_url requests.",
                    "default": "POST",
                },
                "status_callback": {
                    "type": "string",
                    "description": "URL for status callback events.",
                },
                "status_callback_method": {
                    "type": "string",
                    "description": "HTTP method for status callback requests.",
                },
                "active": {
                    "type": "boolean",
                    "description": "Whether the application is active.",
                    "default": True,
                },
            },
            "required": ["friendly_name", "voice_url"],
        },
        "method": "POST",
        "path": "/texml_applications",
        "category": "texml",
    },
    "get_texml_application": {
        "name": "get_texml_application",
        "description": "Get details of a specific TeXML application.",
        "parameters": {
            "type": "object",
            "properties": {
                "id": {
                    "type": "string",
                    "description": "The ID of the TeXML application.",
                },
            },
            "required": ["id"],
        },
        "method": "GET",
        "path": "/texml_applications/{id}",
        "category": "texml",
    },
    "update_texml_application": {
        "name": "update_texml_application",
        "description": "Update a TeXML application.",
        "parameters": {
            "type": "object",
            "properties": {
                "id": {
                    "type": "string",
                    "description": "The ID of the TeXML application to update.",
                },
                "friendly_name": {
                    "type": "string",
                    "description": "A friendly name for the TeXML application.",
                },
                "voice_url": {
                    "type": "string",
                    "description": "The URL to request when a call is received.",
                },
                "active": {
                    "type": "boolean",
                    "description": "Whether the application is active.",
                },
            },
            "required": ["id"],
        },
        "method": "PATCH",
        "path": "/texml_applications/{id}",
        "category": "texml",
    },
    "delete_texml_application": {
        "name": "delete_texml_application",
        "description": "Delete a TeXML application.",
        "parameters": {
            "type": "object",
            "properties": {
                "id": {
                    "type": "string",
                    "description": "The ID of the TeXML application to delete.",
                },
            },
            "required": ["id"],
        },
        "method": "DELETE",
        "path": "/texml_applications/{id}",
        "category": "texml",
    },
    # ─── Push Credentials ───────────────────────────────────────
    "list_push_credentials": {
        "name": "list_push_credentials",
        "description": "List mobile push credentials on the account.",
        "parameters": {
            "type": "object",
            "properties": {
                "type": {
                    "type": "string",
                    "description": "Filter by credential type.",
                    "enum": ["ios", "android"],
                },
                "alias": {
                    "type": "string",
                    "description": "Filter by alias.",
                },
            },
            "required": [],
        },
        "method": "GET",
        "path": "/mobile_push_credentials",
        "category": "push_credentials",
    },
    "create_push_credential": {
        "name": "create_push_credential",
        "description": "Create a new mobile push credential.",
        "parameters": {
            "type": "object",
            "properties": {
                "type": {
                    "type": "string",
                    "description": "The credential type (ios or android).",
                    "enum": ["ios", "android"],
                },
                "alias": {
                    "type": "string",
                    "description": "An alias for the credential.",
                },
                "certificate": {
                    "type": "string",
                    "description": "The APNs certificate (iOS only).",
                },
                "private_key": {
                    "type": "string",
                    "description": "The APNs private key (iOS only).",
                },
                "server_key": {
                    "type": "string",
                    "description": "The FCM server key (Android only).",
                },
                "sandbox": {
                    "type": "boolean",
                    "description": "Whether to use the APNs sandbox environment (iOS only).",
                },
            },
            "required": ["type"],
        },
        "method": "POST",
        "path": "/mobile_push_credentials",
        "category": "push_credentials",
    },
    "get_push_credential": {
        "name": "get_push_credential",
        "description": "Get details of a specific push credential.",
        "parameters": {
            "type": "object",
            "properties": {
                "id": {
                    "type": "string",
                    "description": "The ID of the push credential.",
                },
            },
            "required": ["id"],
        },
        "method": "GET",
        "path": "/mobile_push_credentials/{id}",
        "category": "push_credentials",
    },
    "delete_push_credential": {
        "name": "delete_push_credential",
        "description": "Delete a push credential.",
        "parameters": {
            "type": "object",
            "properties": {
                "id": {
                    "type": "string",
                    "description": "The ID of the push credential to delete.",
                },
            },
            "required": ["id"],
        },
        "method": "DELETE",
        "path": "/mobile_push_credentials/{id}",
        "category": "push_credentials",
    },
    # ─── MCP Servers ────────────────────────────────────────────
    "list_mcp_servers": {
        "name": "list_mcp_servers",
        "description": "List MCP servers on the account.",
        "parameters": {
            "type": "object",
            "properties": {
                "type": {
                    "type": "string",
                    "description": "Filter by server type.",
                },
                "url": {
                    "type": "string",
                    "description": "Filter by server URL.",
                },
                "page_size": {
                    "type": "integer",
                    "description": "Number of results per page.",
                    "default": 20,
                },
                "page_number": {
                    "type": "integer",
                    "description": "Page number to retrieve.",
                    "default": 1,
                },
            },
            "required": [],
        },
        "method": "GET",
        "path": "/ai/mcp_servers",
        "category": "mcp_servers",
    },
    "create_mcp_server": {
        "name": "create_mcp_server",
        "description": "Create a new MCP server.",
        "parameters": {
            "type": "object",
            "properties": {
                "name": {
                    "type": "string",
                    "description": "The name of the MCP server.",
                },
                "url": {
                    "type": "string",
                    "description": "The URL of the MCP server.",
                },
                "type": {
                    "type": "string",
                    "description": "The type of the MCP server.",
                },
                "description": {
                    "type": "string",
                    "description": "A description of the MCP server.",
                },
            },
            "required": ["name", "url"],
        },
        "method": "POST",
        "path": "/ai/mcp_servers",
        "category": "mcp_servers",
    },
    "get_mcp_server": {
        "name": "get_mcp_server",
        "description": "Get details of a specific MCP server.",
        "parameters": {
            "type": "object",
            "properties": {
                "id": {
                    "type": "string",
                    "description": "The ID of the MCP server.",
                },
            },
            "required": ["id"],
        },
        "method": "GET",
        "path": "/ai/mcp_servers/{id}",
        "category": "mcp_servers",
    },
    "update_mcp_server": {
        "name": "update_mcp_server",
        "description": "Update an MCP server.",
        "parameters": {
            "type": "object",
            "properties": {
                "id": {
                    "type": "string",
                    "description": "The ID of the MCP server to update.",
                },
                "name": {
                    "type": "string",
                    "description": "The name of the MCP server.",
                },
                "url": {
                    "type": "string",
                    "description": "The URL of the MCP server.",
                },
                "type": {
                    "type": "string",
                    "description": "The type of the MCP server.",
                },
                "description": {
                    "type": "string",
                    "description": "A description of the MCP server.",
                },
            },
            "required": ["id"],
        },
        "method": "PUT",
        "path": "/ai/mcp_servers/{id}",
        "category": "mcp_servers",
    },
    "delete_mcp_server": {
        "name": "delete_mcp_server",
        "description": "Delete an MCP server.",
        "parameters": {
            "type": "object",
            "properties": {
                "id": {
                    "type": "string",
                    "description": "The ID of the MCP server to delete.",
                },
            },
            "required": ["id"],
        },
        "method": "DELETE",
        "path": "/ai/mcp_servers/{id}",
        "category": "mcp_servers",
    },
    # ─── Call Control Applications ──────────────────────────────
    "list_call_control_applications": {
        "name": "list_call_control_applications",
        "description": "List call control applications on the account.",
        "parameters": {
            "type": "object",
            "properties": {
                "page_size": {
                    "type": "integer",
                    "description": "Number of results per page.",
                    "default": 20,
                },
                "page_number": {
                    "type": "integer",
                    "description": "Page number to retrieve.",
                    "default": 1,
                },
            },
            "required": [],
        },
        "method": "GET",
        "path": "/call_control_applications",
        "category": "call_control",
    },
    "create_call_control_application": {
        "name": "create_call_control_application",
        "description": "Create a new call control application.",
        "parameters": {
            "type": "object",
            "properties": {
                "application_name": {
                    "type": "string",
                    "description": "The name of the call control application.",
                },
                "webhook_event_url": {
                    "type": "string",
                    "description": "The URL to send webhook events to.",
                },
                "webhook_event_failover_url": {
                    "type": "string",
                    "description": "Failover URL for webhook events.",
                },
                "active": {
                    "type": "boolean",
                    "description": "Whether the application is active.",
                    "default": True,
                },
            },
            "required": ["application_name", "webhook_event_url"],
        },
        "method": "POST",
        "path": "/call_control_applications",
        "category": "call_control",
    },
    "get_call_control_application": {
        "name": "get_call_control_application",
        "description": "Get details of a specific call control application.",
        "parameters": {
            "type": "object",
            "properties": {
                "id": {
                    "type": "string",
                    "description": "The ID of the call control application.",
                },
            },
            "required": ["id"],
        },
        "method": "GET",
        "path": "/call_control_applications/{id}",
        "category": "call_control",
    },
    "delete_call_control_application": {
        "name": "delete_call_control_application",
        "description": "Delete a call control application.",
        "parameters": {
            "type": "object",
            "properties": {
                "id": {
                    "type": "string",
                    "description": "The ID of the call control application to delete.",
                },
            },
            "required": ["id"],
        },
        "method": "DELETE",
        "path": "/call_control_applications/{id}",
        "category": "call_control",
    },
    # ─── Call Recordings ────────────────────────────────────────
    "list_recordings": {
        "name": "list_recordings",
        "description": "List call recordings on the account.",
        "parameters": {
            "type": "object",
            "properties": {
                "page_size": {
                    "type": "integer",
                    "description": "Number of results per page.",
                    "default": 20,
                },
                "page_number": {
                    "type": "integer",
                    "description": "Page number to retrieve.",
                    "default": 1,
                },
            },
            "required": [],
        },
        "method": "GET",
        "path": "/recordings",
        "category": "recordings",
    },
    "get_recording": {
        "name": "get_recording",
        "description": "Get details of a specific call recording.",
        "parameters": {
            "type": "object",
            "properties": {
                "id": {
                    "type": "string",
                    "description": "The ID of the recording.",
                },
            },
            "required": ["id"],
        },
        "method": "GET",
        "path": "/recordings/{id}",
        "category": "recordings",
    },
    # ─── Usage Reports ──────────────────────────────────────────
    "create_usage_report": {
        "name": "create_usage_report",
        "description": "Create a batch MDR (Message Detail Record) usage report.",
        "parameters": {
            "type": "object",
            "properties": {
                "start_date": {
                    "type": "string",
                    "description": "Start date for the report (ISO 8601 format).",
                },
                "end_date": {
                    "type": "string",
                    "description": "End date for the report (ISO 8601 format).",
                },
                "directions": {
                    "type": "string",
                    "description": "Filter by direction.",
                    "enum": ["inbound", "outbound"],
                },
                "record_types": {
                    "type": "string",
                    "description": "Filter by record type.",
                    "enum": ["incomplete", "completed", "errors"],
                },
            },
            "required": ["start_date", "end_date"],
        },
        "method": "POST",
        "path": "/reports/batch_mdr_reports",
        "category": "reporting",
    },
    "get_usage_report": {
        "name": "get_usage_report",
        "description": "Get status and details of a usage report.",
        "parameters": {
            "type": "object",
            "properties": {
                "id": {
                    "type": "string",
                    "description": "The ID of the usage report.",
                },
            },
            "required": ["id"],
        },
        "method": "GET",
        "path": "/reports/batch_mdr_reports/{id}",
        "category": "reporting",
    },
    # ─── Global IPs ─────────────────────────────────────────────
    "list_global_ips": {
        "name": "list_global_ips",
        "description": "List global IPs on the account.",
        "parameters": {
            "type": "object",
            "properties": {
                "page_size": {
                    "type": "integer",
                    "description": "Number of results per page.",
                    "default": 20,
                },
                "page_number": {
                    "type": "integer",
                    "description": "Page number to retrieve.",
                    "default": 1,
                },
            },
            "required": [],
        },
        "method": "GET",
        "path": "/global_ips",
        "category": "global_ips",
    },
    "create_global_ip": {
        "name": "create_global_ip",
        "description": "Create a new global IP.",
        "parameters": {
            "type": "object",
            "properties": {},
            "required": [],
        },
        "method": "POST",
        "path": "/global_ips",
        "category": "global_ips",
    },
    "delete_global_ip": {
        "name": "delete_global_ip",
        "description": "Delete a global IP.",
        "parameters": {
            "type": "object",
            "properties": {
                "id": {
                    "type": "string",
                    "description": "The ID of the global IP to delete.",
                },
            },
            "required": ["id"],
        },
        "method": "DELETE",
        "path": "/global_ips/{id}",
        "category": "global_ips",
    },
    # ─── SIM Card Orders ────────────────────────────────────────
    "list_sim_card_orders": {
        "name": "list_sim_card_orders",
        "description": "List SIM card orders on the account.",
        "parameters": {
            "type": "object",
            "properties": {
                "page_size": {
                    "type": "integer",
                    "description": "Number of results per page.",
                    "default": 20,
                },
                "page_number": {
                    "type": "integer",
                    "description": "Page number to retrieve.",
                    "default": 1,
                },
            },
            "required": [],
        },
        "method": "GET",
        "path": "/sim_card_orders",
        "category": "iot",
    },
    "create_sim_card_order": {
        "name": "create_sim_card_order",
        "description": "Create a new SIM card order.",
        "parameters": {
            "type": "object",
            "properties": {
                "sim_card_group_id": {
                    "type": "string",
                    "description": "The SIM card group ID to associate with the order.",
                },
                "quantity": {
                    "type": "integer",
                    "description": "The number of SIM cards to order.",
                },
                "address_id": {
                    "type": "string",
                    "description": "The address ID for shipping.",
                },
            },
            "required": ["sim_card_group_id", "quantity"],
        },
        "method": "POST",
        "path": "/sim_card_orders",
        "category": "iot",
    },
    # ─── Private Wireless Gateways ──────────────────────────────
    "list_private_wireless_gateways": {
        "name": "list_private_wireless_gateways",
        "description": "List private wireless gateways on the account.",
        "parameters": {
            "type": "object",
            "properties": {
                "page_size": {
                    "type": "integer",
                    "description": "Number of results per page.",
                    "default": 20,
                },
                "page_number": {
                    "type": "integer",
                    "description": "Page number to retrieve.",
                    "default": 1,
                },
            },
            "required": [],
        },
        "method": "GET",
        "path": "/private_wireless_gateways",
        "category": "iot",
    },
    "create_private_wireless_gateway": {
        "name": "create_private_wireless_gateway",
        "description": "Create a new private wireless gateway.",
        "parameters": {
            "type": "object",
            "properties": {
                "name": {
                    "type": "string",
                    "description": "The name of the private wireless gateway.",
                },
                "network_id": {
                    "type": "string",
                    "description": "The network ID to associate with the gateway.",
                },
                "region_code": {
                    "type": "string",
                    "description": "The region code for the gateway.",
                },
            },
            "required": ["name", "network_id"],
        },
        "method": "POST",
        "path": "/private_wireless_gateways",
        "category": "iot",
    },
    "delete_private_wireless_gateway": {
        "name": "delete_private_wireless_gateway",
        "description": "Delete a private wireless gateway.",
        "parameters": {
            "type": "object",
            "properties": {
                "id": {
                    "type": "string",
                    "description": "The ID of the private wireless gateway to delete.",
                },
            },
            "required": ["id"],
        },
        "method": "DELETE",
        "path": "/private_wireless_gateways/{id}",
        "category": "iot",
    },
    # ─── External Connections ───────────────────────────────────
    "list_external_connections": {
        "name": "list_external_connections",
        "description": "List external connections (BYOC) on the account.",
        "parameters": {
            "type": "object",
            "properties": {
                "page_size": {
                    "type": "integer",
                    "description": "Number of results per page.",
                    "default": 20,
                },
                "page_number": {
                    "type": "integer",
                    "description": "Page number to retrieve.",
                    "default": 1,
                },
            },
            "required": [],
        },
        "method": "GET",
        "path": "/external_connections",
        "category": "external_connections",
    },
    "create_external_connection": {
        "name": "create_external_connection",
        "description": "Create a new external connection (BYOC).",
        "parameters": {
            "type": "object",
            "properties": {
                "active": {
                    "type": "boolean",
                    "description": "Whether the connection is active.",
                    "default": True,
                },
                "external_sip_connection": {
                    "type": "string",
                    "description": "The external SIP connection URI.",
                },
            },
            "required": ["external_sip_connection"],
        },
        "method": "POST",
        "path": "/external_connections",
        "category": "external_connections",
    },
    "delete_external_connection": {
        "name": "delete_external_connection",
        "description": "Delete an external connection.",
        "parameters": {
            "type": "object",
            "properties": {
                "id": {
                    "type": "string",
                    "description": "The ID of the external connection to delete.",
                },
            },
            "required": ["id"],
        },
        "method": "DELETE",
        "path": "/external_connections/{id}",
        "category": "external_connections",
    },
    # ─── Voice Clones ──────────────────────────────────────────
    "list_voice_clones": {
        "name": "list_voice_clones",
        "description": "List AI voice clones on the account.",
        "parameters": {
            "type": "object",
            "properties": {
                "page_size": {
                    "type": "integer",
                    "description": "Number of results per page.",
                    "default": 20,
                },
                "page_number": {
                    "type": "integer",
                    "description": "Page number to retrieve.",
                    "default": 1,
                },
            },
            "required": [],
        },
        "method": "GET",
        "path": "/ai/voice_clones",
        "category": "voice",
    },
    "create_voice_clone": {
        "name": "create_voice_clone",
        "description": "Create a new AI voice clone.",
        "parameters": {
            "type": "object",
            "properties": {
                "name": {
                    "type": "string",
                    "description": "The name of the voice clone.",
                },
                "description": {
                    "type": "string",
                    "description": "A description of the voice clone.",
                },
            },
            "required": ["name"],
        },
        "method": "POST",
        "path": "/ai/voice_clones",
        "category": "voice",
    },
    "get_voice_clone": {
        "name": "get_voice_clone",
        "description": "Get details of a specific AI voice clone.",
        "parameters": {
            "type": "object",
            "properties": {
                "id": {
                    "type": "string",
                    "description": "The ID of the voice clone.",
                },
            },
            "required": ["id"],
        },
        "method": "GET",
        "path": "/ai/voice_clones/{id}",
        "category": "voice",
    },
    # ─── Voice Designs ─────────────────────────────────────────
    "list_voice_designs": {
        "name": "list_voice_designs",
        "description": "List AI voice designs on the account.",
        "parameters": {
            "type": "object",
            "properties": {
                "page_size": {
                    "type": "integer",
                    "description": "Number of results per page.",
                    "default": 20,
                },
                "page_number": {
                    "type": "integer",
                    "description": "Page number to retrieve.",
                    "default": 1,
                },
            },
            "required": [],
        },
        "method": "GET",
        "path": "/ai/voice_designs",
        "category": "voice",
    },
    "create_voice_design": {
        "name": "create_voice_design",
        "description": "Create a new AI voice design.",
        "parameters": {
            "type": "object",
            "properties": {
                "name": {
                    "type": "string",
                    "description": "The name of the voice design.",
                },
                "description": {
                    "type": "string",
                    "description": "A description of the voice design.",
                },
                "gender": {
                    "type": "string",
                    "description": "The gender of the voice.",
                },
                "age": {
                    "type": "string",
                    "description": "The age range of the voice.",
                },
                "accent": {
                    "type": "string",
                    "description": "The accent of the voice.",
                },
            },
            "required": ["name"],
        },
        "method": "POST",
        "path": "/ai/voice_designs",
        "category": "voice",
    },
    "get_voice_design": {
        "name": "get_voice_design",
        "description": "Get details of a specific AI voice design.",
        "parameters": {
            "type": "object",
            "properties": {
                "id": {
                    "type": "string",
                    "description": "The ID of the voice design.",
                },
            },
            "required": ["id"],
        },
        "method": "GET",
        "path": "/ai/voice_designs/{id}",
        "category": "voice",
    },
    # ─── Fine Tuning ───────────────────────────────────────────
    "list_fine_tuning_jobs": {
        "name": "list_fine_tuning_jobs",
        "description": "List AI fine-tuning jobs on the account.",
        "parameters": {
            "type": "object",
            "properties": {
                "page_size": {
                    "type": "integer",
                    "description": "Number of results per page.",
                    "default": 20,
                },
                "page_number": {
                    "type": "integer",
                    "description": "Page number to retrieve.",
                    "default": 1,
                },
            },
            "required": [],
        },
        "method": "GET",
        "path": "/ai/fine_tuning/jobs",
        "category": "ai",
    },
    "create_fine_tuning_job": {
        "name": "create_fine_tuning_job",
        "description": "Create a new AI fine-tuning job.",
        "parameters": {
            "type": "object",
            "properties": {
                "model": {
                    "type": "string",
                    "description": "The base model to fine-tune.",
                },
                "training_file": {
                    "type": "string",
                    "description": "The ID or URL of the training file.",
                },
            },
            "required": ["model", "training_file"],
        },
        "method": "POST",
        "path": "/ai/fine_tuning/jobs",
        "category": "ai",
    },
    "get_fine_tuning_job": {
        "name": "get_fine_tuning_job",
        "description": "Get details of a specific fine-tuning job.",
        "parameters": {
            "type": "object",
            "properties": {
                "id": {
                    "type": "string",
                    "description": "The ID of the fine-tuning job.",
                },
            },
            "required": ["id"],
        },
        "method": "GET",
        "path": "/ai/fine_tuning/jobs/{id}",
        "category": "ai",
    },
    # ─── Toll-Free Verification ─────────────────────────────────
    "list_toll_free_verifications": {
        "name": "list_toll_free_verifications",
        "description": "List toll-free verification requests on the account.",
        "parameters": {
            "type": "object",
            "properties": {
                "page_size": {
                    "type": "integer",
                    "description": "Number of results per page.",
                    "default": 20,
                },
                "page_number": {
                    "type": "integer",
                    "description": "Page number to retrieve.",
                    "default": 1,
                },
            },
            "required": [],
        },
        "method": "GET",
        "path": "/toll_free_verification_requests",
        "category": "messaging",
    },
    "create_toll_free_verification": {
        "name": "create_toll_free_verification",
        "description": "Create a new toll-free verification request.",
        "parameters": {
            "type": "object",
            "properties": {
                "phone_number_id": {
                    "type": "string",
                    "description": "The ID of the toll-free phone number to verify.",
                },
                "business_name": {
                    "type": "string",
                    "description": "The business name for verification.",
                },
                "corporate_url": {
                    "type": "string",
                    "description": "The corporate website URL.",
                },
                "use_case": {
                    "type": "string",
                    "description": "The intended use case for the toll-free number.",
                },
            },
            "required": ["phone_number_id", "business_name", "use_case"],
        },
        "method": "POST",
        "path": "/toll_free_verification_requests",
        "category": "messaging",
    },
    # ─── Detail Records ─────────────────────────────────────────
    "list_detail_records": {
        "name": "list_detail_records",
        "description": "List CDR (Call Detail Record) report requests.",
        "parameters": {
            "type": "object",
            "properties": {
                "page_size": {
                    "type": "integer",
                    "description": "Number of results per page.",
                    "default": 20,
                },
                "page_number": {
                    "type": "integer",
                    "description": "Page number to retrieve.",
                    "default": 1,
                },
            },
            "required": [],
        },
        "method": "GET",
        "path": "/reports/cdr_requests",
        "category": "reporting",
    },
    # ─── WhatsApp ─────────────────────────────────────────────────
    "send_whatsapp_message": {
        "name": "send_whatsapp_message",
        "description": "Send a WhatsApp message (template or free-form text). Template messages can be sent anytime; free-form text requires an open 24-hour customer service window.",
        "parameters": {
            "type": "object",
            "properties": {
                "from_": {
                    "type": "string",
                    "description": "WhatsApp-enabled phone number in E.164 format (e.g. +19452940762).",
                },
                "to": {
                    "type": "string",
                    "description": "Recipient phone number in E.164 format.",
                },
                "whatsapp_message": {
                    "type": "object",
                    "description": "WhatsApp message object. For templates: {type: 'template', template: {name, language: {code}, components: [...]}}. For text: {type: 'text', text: {body: '...'}}. You can also use template_id instead of name+language.",
                },
                "messaging_profile_id": {
                    "type": "string",
                    "description": "Optional messaging profile ID.",
                },
            },
            "required": ["from_", "to", "whatsapp_message"],
        },
        "method": "POST",
        "path": "/messages/whatsapp",
        "category": "whatsapp",
    },
    "list_whatsapp_business_accounts": {
        "name": "list_whatsapp_business_accounts",
        "description": "List WhatsApp Business Accounts (WABAs) on the account.",
        "parameters": {
            "type": "object",
            "properties": {
                "page_size": {
                    "type": "integer",
                    "description": "Number of results per page.",
                    "default": 20,
                },
                "page_number": {
                    "type": "integer",
                    "description": "Page number to retrieve.",
                    "default": 1,
                },
            },
            "required": [],
        },
        "method": "GET",
        "path": "/whatsapp/business_accounts",
        "category": "whatsapp",
    },
    "list_whatsapp_templates": {
        "name": "list_whatsapp_templates",
        "description": "List WhatsApp message templates. Filter by WABA, category (AUTHENTICATION, MARKETING, UTILITY), or status (APPROVED, PENDING, REJECTED, DISABLED).",
        "parameters": {
            "type": "object",
            "properties": {
                "waba_id": {
                    "type": "string",
                    "description": "Filter by Telnyx WABA UUID.",
                },
                "category": {
                    "type": "string",
                    "description": "Filter by template category.",
                    "enum": ["AUTHENTICATION", "MARKETING", "UTILITY"],
                },
                "status": {
                    "type": "string",
                    "description": "Filter by template status.",
                    "enum": ["APPROVED", "PENDING", "REJECTED", "DISABLED"],
                },
                "page_size": {
                    "type": "integer",
                    "description": "Number of results per page.",
                    "default": 20,
                },
                "page_number": {
                    "type": "integer",
                    "description": "Page number to retrieve.",
                    "default": 1,
                },
            },
            "required": [],
        },
        "method": "GET",
        "path": "/whatsapp/message_templates",
        "category": "whatsapp",
    },
    "create_whatsapp_template": {
        "name": "create_whatsapp_template",
        "description": "Create a new WhatsApp message template for Meta review. Use lowercase names with underscores only. Provide realistic sample values in the example field.",
        "parameters": {
            "type": "object",
            "properties": {
                "waba_id": {
                    "type": "string",
                    "description": "Telnyx WABA UUID to create the template under.",
                },
                "name": {
                    "type": "string",
                    "description": "Template name (lowercase, underscores only, e.g. order_confirmation).",
                },
                "category": {
                    "type": "string",
                    "description": "Template category. AUTHENTICATION for OTPs, UTILITY for transactional, MARKETING for promotional.",
                    "enum": ["AUTHENTICATION", "MARKETING", "UTILITY"],
                },
                "language": {
                    "type": "string",
                    "description": "Language code (e.g. en_US).",
                },
                "components": {
                    "type": "array",
                    "description": "Template components (HEADER, BODY, FOOTER, BUTTONS). Use {{1}}, {{2}} for parameters.",
                },
            },
            "required": ["waba_id", "name", "category", "language", "components"],
        },
        "method": "POST",
        "path": "/whatsapp/message_templates",
        "category": "whatsapp",
    },
    "get_whatsapp_template": {
        "name": "get_whatsapp_template",
        "description": "Get details of a specific WhatsApp message template by its Telnyx UUID.",
        "parameters": {
            "type": "object",
            "properties": {
                "id": {
                    "type": "string",
                    "description": "Telnyx template UUID.",
                },
            },
            "required": ["id"],
        },
        "method": "GET",
        "path": "/whatsapp_message_templates/{id}",
        "category": "whatsapp",
    },
    "list_whatsapp_phone_numbers": {
        "name": "list_whatsapp_phone_numbers",
        "description": "List WhatsApp-enabled phone numbers. Includes quality rating (GREEN/YELLOW/RED) and messaging limit tier.",
        "parameters": {
            "type": "object",
            "properties": {
                "waba_id": {
                    "type": "string",
                    "description": "Filter by Telnyx WABA UUID.",
                },
                "page_size": {
                    "type": "integer",
                    "description": "Number of results per page.",
                    "default": 20,
                },
                "page_number": {
                    "type": "integer",
                    "description": "Page number to retrieve.",
                    "default": 1,
                },
            },
            "required": [],
        },
        "method": "GET",
        "path": "/whatsapp/phone_numbers",
        "category": "whatsapp",
    },
    "get_whatsapp_business_profile": {
        "name": "get_whatsapp_business_profile",
        "description": "Get the WhatsApp business profile for a phone number, including display name, photo, description, and contact info.",
        "parameters": {
            "type": "object",
            "properties": {
                "phone_number": {
                    "type": "string",
                    "description": "Phone number in E.164 format (e.g. +19452940762).",
                },
            },
            "required": ["phone_number"],
        },
        "method": "GET",
        "path": "/whatsapp/phone_numbers/{phone_number}/profile",
        "category": "whatsapp",
    },
    # ─── RCS & Live Call Control ────────────────────────────────
    "send_rcs_message": {
        "name": "send_rcs_message",
        "description": "Send an RCS message from an approved RCS agent.",
        "parameters": {
            "type": "object",
            "properties": {
                "agent_id": {
                    "type": "string",
                    "description": "The RCS agent ID to send from.",
                },
                "to": {
                    "type": "string",
                    "description": "The recipient phone number in E.164 format.",
                },
                "messaging_profile_id": {
                    "type": "string",
                    "description": (
                        "The messaging profile associated with the RCS agent."
                    ),
                },
                "agent_message": {
                    "type": "object",
                    "description": (
                        "The RCS agent message payload, including content_message "
                        "and optional ttl."
                    ),
                },
                "mms_fallback": {
                    "type": "object",
                    "description": "Optional MMS fallback payload.",
                },
                "sms_fallback": {
                    "type": "object",
                    "description": "Optional SMS fallback payload.",
                },
                "type": {
                    "type": "string",
                    "description": "The message type.",
                    "enum": ["RCS"],
                },
                "webhook_url": {
                    "type": "string",
                    "description": "Optional URL to receive message status webhooks.",
                },
            },
            "required": [
                "agent_id",
                "to",
                "messaging_profile_id",
                "agent_message",
                "type",
            ],
        },
        "method": "POST",
        "path": "/messages/rcs",
        "category": "messaging",
    },
    "check_rcs_capabilities": {
        "name": "check_rcs_capabilities",
        "description": "Check the RCS capabilities available for a recipient.",
        "parameters": {
            "type": "object",
            "properties": {
                "agent_id": {
                    "type": "string",
                    "description": "The RCS agent ID.",
                },
                "phone_number": {
                    "type": "string",
                    "description": "The recipient phone number in E.164 format.",
                },
            },
            "required": ["agent_id", "phone_number"],
        },
        "method": "GET",
        "path": "/messaging/rcs/capabilities/{agent_id}/{phone_number}",
        "category": "messaging",
    },
    "add_ai_assistant_messages": {
        "name": "add_ai_assistant_messages",
        "description": "Add messages to the AI assistant conversation on a live call.",
        "parameters": {
            "type": "object",
            "properties": {
                "call_control_id": {
                    "type": "string",
                    "description": "The Call Control ID of the live call.",
                },
                "client_state": {
                    "type": "string",
                    "description": "Optional opaque client state.",
                },
                "command_id": {
                    "type": "string",
                    "description": "Optional command ID for idempotency.",
                },
                "messages": {
                    "type": "array",
                    "items": {"type": "object"},
                    "description": "Messages to add to the AI assistant conversation.",
                },
            },
            "required": ["call_control_id"],
        },
        "method": "POST",
        "path": "/calls/{call_control_id}/actions/ai_assistant_add_messages",
        "category": "voice",
    },
    "gather_using_ai": {
        "name": "gather_using_ai",
        "description": (
            "Gather structured information on a live call using a voice assistant."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "call_control_id": {
                    "type": "string",
                    "description": "The Call Control ID of the live call.",
                },
                "parameters": {
                    "type": "object",
                    "description": (
                        "A JSON Schema describing the information to gather."
                    ),
                },
                "assistant": {
                    "type": "object",
                    "description": "Optional assistant configuration.",
                },
                "client_state": {
                    "type": "string",
                    "description": "Optional opaque client state.",
                },
                "command_id": {
                    "type": "string",
                    "description": "Optional command ID for idempotency.",
                },
                "gather_ended_speech": {
                    "type": "string",
                    "description": "Speech to play when gathering ends.",
                },
                "greeting": {
                    "type": "string",
                    "description": "Initial greeting spoken by the assistant.",
                },
                "interruption_settings": {
                    "type": "object",
                    "description": "Interruption behavior for the assistant.",
                },
                "language": {
                    "type": "string",
                    "description": "Language to use for speech recognition.",
                    "enum": [
                        "af",
                        "sq",
                        "am",
                        "ar",
                        "hy",
                        "az",
                        "eu",
                        "bn",
                        "bs",
                        "bg",
                        "my",
                        "ca",
                        "yue",
                        "zh",
                        "hr",
                        "cs",
                        "da",
                        "nl",
                        "en",
                        "et",
                        "fil",
                        "fi",
                        "fr",
                        "gl",
                        "ka",
                        "de",
                        "el",
                        "gu",
                        "iw",
                        "hi",
                        "hu",
                        "is",
                        "id",
                        "it",
                        "ja",
                        "jv",
                        "kn",
                        "kk",
                        "km",
                        "ko",
                        "lo",
                        "lv",
                        "lt",
                        "mk",
                        "ms",
                        "ml",
                        "mr",
                        "mn",
                        "ne",
                        "no",
                        "fa",
                        "pl",
                        "pt",
                        "pa",
                        "ro",
                        "ru",
                        "rw",
                        "sr",
                        "si",
                        "sk",
                        "sl",
                        "ss",
                        "st",
                        "es",
                        "su",
                        "sw",
                        "sv",
                        "ta",
                        "te",
                        "th",
                        "tn",
                        "tr",
                        "ts",
                        "uk",
                        "ur",
                        "uz",
                        "ve",
                        "vi",
                        "xh",
                        "zu",
                    ],
                },
                "message_history": {
                    "type": "array",
                    "items": {"type": "object"},
                    "description": "Prior assistant conversation messages.",
                },
                "send_message_history_updates": {
                    "type": "boolean",
                    "description": "Whether to send message history update webhooks.",
                },
                "send_partial_results": {
                    "type": "boolean",
                    "description": "Whether to send partial result webhooks.",
                },
                "transcription": {
                    "type": "object",
                    "description": "Transcription configuration.",
                },
                "user_response_timeout_ms": {
                    "type": "integer",
                    "description": (
                        "Time in milliseconds to wait for the user's response."
                    ),
                },
                "voice": {
                    "type": "string",
                    "description": "Voice used by the assistant.",
                },
                "voice_settings": {
                    "type": "object",
                    "description": "Voice synthesis settings.",
                },
            },
            "required": ["call_control_id", "parameters"],
        },
        "method": "POST",
        "path": "/calls/{call_control_id}/actions/gather_using_ai",
        "category": "voice",
    },
    "gather_using_audio": {
        "name": "gather_using_audio",
        "description": "Play audio and gather DTMF input on a live call.",
        "parameters": {
            "type": "object",
            "properties": {
                "call_control_id": {
                    "type": "string",
                    "description": "The Call Control ID of the live call.",
                },
                "audio_url": {
                    "type": "string",
                    "description": "URL of audio to play while gathering input.",
                },
                "client_state": {
                    "type": "string",
                    "description": "Optional opaque client state.",
                },
                "command_id": {
                    "type": "string",
                    "description": "Optional command ID for idempotency.",
                },
                "inter_digit_timeout_millis": {
                    "type": "integer",
                    "description": "Maximum time between digits in milliseconds.",
                },
                "invalid_audio_url": {
                    "type": "string",
                    "description": "Audio URL to play after invalid input.",
                },
                "invalid_media_name": {
                    "type": "string",
                    "description": "Uploaded media to play after invalid input.",
                },
                "maximum_digits": {
                    "type": "integer",
                    "description": "Maximum number of digits to gather.",
                },
                "maximum_tries": {
                    "type": "integer",
                    "description": "Maximum number of gather attempts.",
                },
                "media_name": {
                    "type": "string",
                    "description": "Uploaded media to play while gathering input.",
                },
                "minimum_digits": {
                    "type": "integer",
                    "description": "Minimum number of digits to gather.",
                },
                "terminating_digit": {
                    "type": "string",
                    "description": "Digit that terminates gathering.",
                },
                "timeout_millis": {
                    "type": "integer",
                    "description": "Overall gather timeout in milliseconds.",
                },
                "valid_digits": {
                    "type": "string",
                    "description": "Digits accepted by the gather action.",
                },
            },
            "required": ["call_control_id"],
        },
        "method": "POST",
        "path": "/calls/{call_control_id}/actions/gather_using_audio",
        "category": "voice",
    },
    "gather_using_speak": {
        "name": "gather_using_speak",
        "description": "Speak text and gather DTMF input on a live call.",
        "parameters": {
            "type": "object",
            "properties": {
                "call_control_id": {
                    "type": "string",
                    "description": "The Call Control ID of the live call.",
                },
                "payload": {
                    "type": "string",
                    "description": "Text or SSML to speak while gathering input.",
                },
                "voice": {
                    "type": "string",
                    "description": "Voice used to synthesize the payload.",
                },
                "client_state": {
                    "type": "string",
                    "description": "Optional opaque client state.",
                },
                "command_id": {
                    "type": "string",
                    "description": "Optional command ID for idempotency.",
                },
                "inter_digit_timeout_millis": {
                    "type": "integer",
                    "description": "Maximum time between digits in milliseconds.",
                },
                "invalid_payload": {
                    "type": "string",
                    "description": "Text or SSML to speak after invalid input.",
                },
                "language": {
                    "type": "string",
                    "description": "Language used for speech synthesis.",
                    "enum": [
                        "arb",
                        "cmn-CN",
                        "cy-GB",
                        "da-DK",
                        "de-DE",
                        "en-AU",
                        "en-GB",
                        "en-GB-WLS",
                        "en-IN",
                        "en-US",
                        "es-ES",
                        "es-MX",
                        "es-US",
                        "fr-CA",
                        "fr-FR",
                        "hi-IN",
                        "is-IS",
                        "it-IT",
                        "ja-JP",
                        "ko-KR",
                        "nb-NO",
                        "nl-NL",
                        "pl-PL",
                        "pt-BR",
                        "pt-PT",
                        "ro-RO",
                        "ru-RU",
                        "sv-SE",
                        "tr-TR",
                    ],
                },
                "maximum_digits": {
                    "type": "integer",
                    "description": "Maximum number of digits to gather.",
                },
                "maximum_tries": {
                    "type": "integer",
                    "description": "Maximum number of gather attempts.",
                },
                "minimum_digits": {
                    "type": "integer",
                    "description": "Minimum number of digits to gather.",
                },
                "payload_type": {
                    "type": "string",
                    "description": "Whether the payload is plain text or SSML.",
                    "enum": ["text", "ssml"],
                },
                "service_level": {
                    "type": "string",
                    "description": "Text-to-speech service level.",
                    "enum": ["basic", "premium"],
                },
                "terminating_digit": {
                    "type": "string",
                    "description": "Digit that terminates gathering.",
                },
                "timeout_millis": {
                    "type": "integer",
                    "description": "Overall gather timeout in milliseconds.",
                },
                "valid_digits": {
                    "type": "string",
                    "description": "Digits accepted by the gather action.",
                },
                "voice_settings": {
                    "type": "object",
                    "description": "Voice synthesis settings.",
                },
            },
            "required": ["call_control_id", "payload", "voice"],
        },
        "method": "POST",
        "path": "/calls/{call_control_id}/actions/gather_using_speak",
        "category": "voice",
    },
    "join_ai_assistant": {
        "name": "join_ai_assistant",
        "description": "Join a live call to an existing AI assistant conversation.",
        "parameters": {
            "type": "object",
            "properties": {
                "call_control_id": {
                    "type": "string",
                    "description": "The Call Control ID of the live call.",
                },
                "conversation_id": {
                    "type": "string",
                    "description": "The existing AI assistant conversation ID.",
                },
                "participant": {
                    "type": "object",
                    "description": "The participant to add to the conversation.",
                },
                "client_state": {
                    "type": "string",
                    "description": "Optional opaque client state.",
                },
                "command_id": {
                    "type": "string",
                    "description": "Optional command ID for idempotency.",
                },
            },
            "required": ["call_control_id", "conversation_id", "participant"],
        },
        "method": "POST",
        "path": "/calls/{call_control_id}/actions/ai_assistant_join",
        "category": "voice",
    },
    "start_ai_assistant": {
        "name": "start_ai_assistant",
        "description": "Start an AI assistant on a live call.",
        "parameters": {
            "type": "object",
            "properties": {
                "call_control_id": {
                    "type": "string",
                    "description": "The Call Control ID of the live call.",
                },
                "assistant": {
                    "type": "object",
                    "description": (
                        "Assistant identity or inline assistant configuration."
                    ),
                },
                "client_state": {
                    "type": "string",
                    "description": "Optional opaque client state.",
                },
                "command_id": {
                    "type": "string",
                    "description": "Optional command ID for idempotency.",
                },
                "greeting": {
                    "type": "string",
                    "description": "Initial greeting spoken by the assistant.",
                },
                "interruption_settings": {
                    "type": "object",
                    "description": "Interruption behavior for the assistant.",
                },
                "message_history": {
                    "type": "array",
                    "items": {"type": "object"},
                    "description": "Prior assistant conversation messages.",
                },
                "participants": {
                    "type": "array",
                    "items": {"type": "object"},
                    "description": "Participants in the assistant conversation.",
                },
                "send_message_history_updates": {
                    "type": "boolean",
                    "description": "Whether to send message history update webhooks.",
                },
                "transcription": {
                    "type": "object",
                    "description": "Transcription configuration.",
                },
                "voice": {
                    "type": "string",
                    "description": "Voice used by the assistant.",
                },
                "voice_settings": {
                    "type": "object",
                    "description": "Voice synthesis settings.",
                },
            },
            "required": ["call_control_id"],
        },
        "method": "POST",
        "path": "/calls/{call_control_id}/actions/ai_assistant_start",
        "category": "voice",
    },
    "stop_ai_assistant": {
        "name": "stop_ai_assistant",
        "description": "Stop the AI assistant on a live call.",
        "parameters": {
            "type": "object",
            "properties": {
                "call_control_id": {
                    "type": "string",
                    "description": "The Call Control ID of the live call.",
                },
                "client_state": {
                    "type": "string",
                    "description": "Optional opaque client state.",
                },
                "command_id": {
                    "type": "string",
                    "description": "Optional command ID for idempotency.",
                },
            },
            "required": ["call_control_id"],
        },
        "method": "POST",
        "path": "/calls/{call_control_id}/actions/ai_assistant_stop",
        "category": "voice",
    },
    "start_conversation_relay": {
        "name": "start_conversation_relay",
        "description": "Start Conversation Relay on a live call.",
        "parameters": {
            "type": "object",
            "properties": {
                "call_control_id": {
                    "type": "string",
                    "description": "The Call Control ID of the live call.",
                },
                "assistant": {
                    "type": "object",
                    "description": "Optional assistant configuration.",
                },
                "client_state": {
                    "type": "string",
                    "description": "Optional opaque client state.",
                },
                "command_id": {
                    "type": "string",
                    "description": "Optional command ID for idempotency.",
                },
                "conversation_relay_dtmf_detection": {
                    "type": "boolean",
                    "description": "Whether Conversation Relay detects DTMF input.",
                },
                "conversation_relay_settings": {
                    "type": "object",
                    "description": "Nested Conversation Relay settings.",
                },
                "conversation_relay_url": {
                    "type": "string",
                    "description": "Conversation Relay WebSocket URL.",
                },
                "custom_parameters": {
                    "type": "object",
                    "description": "Custom parameters sent to the relay connection.",
                },
                "dtmf_detection": {
                    "type": "boolean",
                    "description": "Whether to detect DTMF input.",
                },
                "greeting": {
                    "type": "string",
                    "description": "Initial greeting spoken to the caller.",
                },
                "interruptible": {
                    "type": "string",
                    "description": "Controls which caller input interrupts speech.",
                    "enum": ["none", "any", "speech", "dtmf"],
                },
                "interruptible_greeting": {
                    "type": "string",
                    "description": (
                        "Controls which caller input interrupts the greeting."
                    ),
                    "enum": ["none", "any", "speech", "dtmf"],
                },
                "interruption_settings": {
                    "type": "object",
                    "description": "Interruption behavior for Conversation Relay.",
                },
                "language": {
                    "type": "string",
                    "description": "Default language for speech and transcription.",
                },
                "languages": {
                    "type": "array",
                    "description": "Per-language TTS and transcription settings.",
                    "items": {
                        "type": "object",
                        "properties": {
                            "language": {
                                "type": "string",
                                "description": "BCP 47 language tag.",
                            },
                            "tts_provider": {
                                "type": "string",
                                "description": "Text-to-speech provider.",
                            },
                            "voice": {
                                "type": "string",
                                "description": "Voice identifier.",
                            },
                            "voice_settings": {
                                "type": "object",
                                "description": "Voice settings for this language.",
                            },
                            "transcription_engine": {
                                "type": "string",
                                "description": "Speech recognition engine.",
                                "enum": [
                                    "Google",
                                    "Telnyx",
                                    "Deepgram",
                                    "Azure",
                                    "xAI",
                                    "AssemblyAI",
                                    "Speechmatics",
                                    "Soniox",
                                    "A",
                                    "B",
                                ],
                            },
                            "transcription_engine_config": {
                                "type": "object",
                                "description": "Speech recognition settings.",
                            },
                            "transcription_provider": {
                                "type": "string",
                                "description": "Legacy transcription provider.",
                            },
                            "speech_model": {
                                "type": "string",
                                "description": "Legacy speech recognition model.",
                            },
                        },
                        "required": ["language"],
                    },
                },
                "provider": {
                    "type": "string",
                    "description": "Conversation Relay provider.",
                },
                "structured_provider": {
                    "type": "object",
                    "description": "Structured provider configuration.",
                },
                "transcription": {
                    "type": "object",
                    "description": "Transcription configuration.",
                },
                "transcription_engine": {
                    "type": "string",
                    "description": "Transcription engine to use.",
                    "enum": [
                        "Google",
                        "Telnyx",
                        "Deepgram",
                        "Azure",
                        "xAI",
                        "AssemblyAI",
                        "Speechmatics",
                        "Soniox",
                        "A",
                        "B",
                    ],
                },
                "transcription_engine_config": {
                    "type": "object",
                    "description": "Transcription engine configuration.",
                },
                "tts_provider": {
                    "type": "string",
                    "description": "Text-to-speech provider.",
                },
                "url": {
                    "type": "string",
                    "description": "WebSocket URL for the relay connection.",
                },
                "voice": {
                    "type": "string",
                    "description": "Voice used for relay speech.",
                },
                "voice_settings": {
                    "type": "object",
                    "description": "Voice synthesis settings.",
                },
            },
            "required": ["call_control_id"],
            "anyOf": [
                {"required": ["url"]},
                {"required": ["conversation_relay_url"]},
                {"required": ["conversation_relay_settings"]},
            ],
        },
        "method": "POST",
        "path": "/calls/{call_control_id}/actions/conversation_relay_start",
        "category": "voice",
    },
    "stop_conversation_relay": {
        "name": "stop_conversation_relay",
        "description": "Stop Conversation Relay on a live call.",
        "parameters": {
            "type": "object",
            "properties": {
                "call_control_id": {
                    "type": "string",
                    "description": "The Call Control ID of the live call.",
                },
                "client_state": {
                    "type": "string",
                    "description": "Optional opaque client state.",
                },
                "command_id": {
                    "type": "string",
                    "description": "Optional command ID for idempotency.",
                },
            },
            "required": ["call_control_id"],
        },
        "method": "POST",
        "path": "/calls/{call_control_id}/actions/conversation_relay_stop",
        "category": "voice",
    },
    "switch_supervisor_role": {
        "name": "switch_supervisor_role",
        "description": "Switch the supervisor role for a bridged live call.",
        "parameters": {
            "type": "object",
            "properties": {
                "call_control_id": {
                    "type": "string",
                    "description": "The Call Control ID of the live call.",
                },
                "role": {
                    "type": "string",
                    "description": "The supervisor role to apply.",
                    "enum": ["barge", "whisper", "monitor"],
                },
            },
            "required": ["call_control_id", "role"],
        },
        "method": "POST",
        "path": "/calls/{call_control_id}/actions/switch_supervisor_role",
        "category": "voice",
    },
    # ─── Audit Logs ─────────────────────────────────────────────
    "list_audit_events": {
        "name": "list_audit_events",
        "description": "List audit events for the account.",
        "parameters": {
            "type": "object",
            "properties": {
                "page_size": {
                    "type": "integer",
                    "description": "Number of results per page.",
                    "default": 20,
                },
                "page_number": {
                    "type": "integer",
                    "description": "Page number to retrieve.",
                    "default": 1,
                },
            },
            "required": [],
        },
        "method": "GET",
        "path": "/audit_events",
        "category": "account",
    },
}
