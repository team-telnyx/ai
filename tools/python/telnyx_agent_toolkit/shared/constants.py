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
}
