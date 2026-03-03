---
name: telnyx-sip-go
description: >-
  Configure SIP trunking connections and outbound voice profiles. Use when
  connecting PBX systems or managing SIP infrastructure. This skill provides Go
  SDK examples.
metadata:
  author: telnyx
  product: sip
  language: go
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Sip - Go

## Installation

```bash
go get github.com/team-telnyx/telnyx-go
```

## Setup

```go
import (
  "context"
  "fmt"
  "os"

  "github.com/team-telnyx/telnyx-go"
  "github.com/team-telnyx/telnyx-go/option"
)

client := telnyx.NewClient(
  option.WithAPIKey(os.Getenv("TELNYX_API_KEY")),
)
```

All examples below assume `client` is already initialized as shown above.

## List all Access IP Ranges

`GET /access_ip_ranges`

```go
	page, err := client.AccessIPRanges.List(context.TODO(), telnyx.AccessIPRangeListParams{})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", page)
```

## Create new Access IP Range

`POST /access_ip_ranges` — Required: `cidr_block`

Optional: `description` (string)

```go
	accessIPRange, err := client.AccessIPRanges.New(context.TODO(), telnyx.AccessIPRangeNewParams{
		CidrBlock: "cidr_block",
	})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", accessIPRange.ID)
```

## Delete access IP ranges

`DELETE /access_ip_ranges/{access_ip_range_id}`

```go
	accessIPRange, err := client.AccessIPRanges.Delete(context.TODO(), "access_ip_range_id")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", accessIPRange.ID)
```

## List connections

Returns a list of your connections irrespective of type.

`GET /connections`

```go
	page, err := client.Connections.List(context.TODO(), telnyx.ConnectionListParams{})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", page)
```

## Retrieve a connection

Retrieves the high-level details of an existing connection.

`GET /connections/{id}`

```go
	connection, err := client.Connections.Get(context.TODO(), "id")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", connection.Data)
```

## List credential connections

Returns a list of your credential connections.

`GET /credential_connections`

```go
	page, err := client.CredentialConnections.List(context.TODO(), telnyx.CredentialConnectionListParams{})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", page)
```

## Create a credential connection

Creates a credential connection.

`POST /credential_connections` — Required: `user_name`, `password`, `connection_name`

Optional: `active` (boolean), `anchorsite_override` (enum), `android_push_credential_id` (['string', 'null']), `call_cost_in_webhooks` (boolean), `default_on_hold_comfort_noise_enabled` (boolean), `dtmf_type` (enum), `encode_contact_header_enabled` (boolean), `encrypted_media` (enum), `inbound` (object), `ios_push_credential_id` (['string', 'null']), `jitter_buffer` (object), `noise_suppression` (enum), `noise_suppression_details` (object), `onnet_t38_passthrough_enabled` (boolean), `outbound` (object), `rtcp_settings` (object), `sip_uri_calling_preference` (enum), `tags` (array[string]), `webhook_api_version` (enum), `webhook_event_failover_url` (uri), `webhook_event_url` (uri), `webhook_timeout_secs` (['integer', 'null'])

```go
	credentialConnection, err := client.CredentialConnections.New(context.TODO(), telnyx.CredentialConnectionNewParams{
		ConnectionName: "my name",
		Password:       "my123secure456password789",
		UserName:       "myusername123",
	})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", credentialConnection.Data)
```

## Retrieve a credential connection

Retrieves the details of an existing credential connection.

`GET /credential_connections/{id}`

```go
	credentialConnection, err := client.CredentialConnections.Get(context.TODO(), "id")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", credentialConnection.Data)
```

## Update a credential connection

Updates settings of an existing credential connection.

`PATCH /credential_connections/{id}`

Optional: `active` (boolean), `anchorsite_override` (enum), `android_push_credential_id` (['string', 'null']), `call_cost_in_webhooks` (boolean), `connection_name` (string), `default_on_hold_comfort_noise_enabled` (boolean), `dtmf_type` (enum), `encode_contact_header_enabled` (boolean), `encrypted_media` (enum), `inbound` (object), `ios_push_credential_id` (['string', 'null']), `jitter_buffer` (object), `noise_suppression` (enum), `noise_suppression_details` (object), `onnet_t38_passthrough_enabled` (boolean), `outbound` (object), `password` (string), `rtcp_settings` (object), `sip_uri_calling_preference` (enum), `tags` (array[string]), `user_name` (string), `webhook_api_version` (enum), `webhook_event_failover_url` (uri), `webhook_event_url` (uri), `webhook_timeout_secs` (['integer', 'null'])

```go
	credentialConnection, err := client.CredentialConnections.Update(
		context.TODO(),
		"id",
		telnyx.CredentialConnectionUpdateParams{},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", credentialConnection.Data)
```

## Delete a credential connection

Deletes an existing credential connection.

`DELETE /credential_connections/{id}`

```go
	credentialConnection, err := client.CredentialConnections.Delete(context.TODO(), "id")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", credentialConnection.Data)
```

## Check a Credential Connection Registration Status

Checks the registration_status for a credential connection, (`registration_status`) as well as the timestamp for the last SIP registration event (`registration_status_updated_at`)

`POST /credential_connections/{id}/actions/check_registration_status`

```go
	response, err := client.CredentialConnections.Actions.CheckRegistrationStatus(context.TODO(), "id")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.Data)
```

## List FQDN connections

Returns a list of your FQDN connections.

`GET /fqdn_connections`

```go
	page, err := client.FqdnConnections.List(context.TODO(), telnyx.FqdnConnectionListParams{})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", page)
```

## Create an FQDN connection

Creates a FQDN connection.

`POST /fqdn_connections` — Required: `connection_name`

Optional: `active` (boolean), `anchorsite_override` (enum), `android_push_credential_id` (['string', 'null']), `call_cost_in_webhooks` (boolean), `default_on_hold_comfort_noise_enabled` (boolean), `dtmf_type` (enum), `encode_contact_header_enabled` (boolean), `encrypted_media` (enum), `inbound` (object), `ios_push_credential_id` (['string', 'null']), `jitter_buffer` (object), `microsoft_teams_sbc` (boolean), `noise_suppression` (enum), `noise_suppression_details` (object), `onnet_t38_passthrough_enabled` (boolean), `outbound` (object), `rtcp_settings` (object), `tags` (array[string]), `transport_protocol` (enum), `webhook_api_version` (enum), `webhook_event_failover_url` (uri), `webhook_event_url` (uri), `webhook_timeout_secs` (['integer', 'null'])

```go
	fqdnConnection, err := client.FqdnConnections.New(context.TODO(), telnyx.FqdnConnectionNewParams{
		ConnectionName: "string",
	})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", fqdnConnection.Data)
```

## Retrieve an FQDN connection

Retrieves the details of an existing FQDN connection.

`GET /fqdn_connections/{id}`

```go
	fqdnConnection, err := client.FqdnConnections.Get(context.TODO(), "1293384261075731499")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", fqdnConnection.Data)
```

## Update an FQDN connection

Updates settings of an existing FQDN connection.

`PATCH /fqdn_connections/{id}`

Optional: `active` (boolean), `anchorsite_override` (enum), `android_push_credential_id` (['string', 'null']), `call_cost_in_webhooks` (boolean), `connection_name` (string), `default_on_hold_comfort_noise_enabled` (boolean), `dtmf_type` (enum), `encode_contact_header_enabled` (boolean), `encrypted_media` (enum), `inbound` (object), `ios_push_credential_id` (['string', 'null']), `jitter_buffer` (object), `noise_suppression` (enum), `noise_suppression_details` (object), `onnet_t38_passthrough_enabled` (boolean), `outbound` (object), `rtcp_settings` (object), `tags` (array[string]), `transport_protocol` (enum), `webhook_api_version` (enum), `webhook_event_failover_url` (uri), `webhook_event_url` (uri), `webhook_timeout_secs` (['integer', 'null'])

```go
	fqdnConnection, err := client.FqdnConnections.Update(
		context.TODO(),
		"1293384261075731499",
		telnyx.FqdnConnectionUpdateParams{},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", fqdnConnection.Data)
```

## Delete an FQDN connection

Deletes an FQDN connection.

`DELETE /fqdn_connections/{id}`

```go
	fqdnConnection, err := client.FqdnConnections.Delete(context.TODO(), "1293384261075731499")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", fqdnConnection.Data)
```

## List FQDNs

Get all FQDNs belonging to the user that match the given filters.

`GET /fqdns`

```go
	page, err := client.Fqdns.List(context.TODO(), telnyx.FqdnListParams{})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", page)
```

## Create an FQDN

Create a new FQDN object.

`POST /fqdns` — Required: `fqdn`, `dns_record_type`, `connection_id`

Optional: `port` (['integer', 'null'])

```go
	fqdn, err := client.Fqdns.New(context.TODO(), telnyx.FqdnNewParams{
		ConnectionID:  "1516447646313612565",
		DNSRecordType: "a",
		Fqdn:          "example.com",
	})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", fqdn.Data)
```

## Retrieve an FQDN

Return the details regarding a specific FQDN.

`GET /fqdns/{id}`

```go
	fqdn, err := client.Fqdns.Get(context.TODO(), "1517907029795014409")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", fqdn.Data)
```

## Update an FQDN

Update the details of a specific FQDN.

`PATCH /fqdns/{id}`

Optional: `connection_id` (string), `dns_record_type` (string), `fqdn` (string), `port` (['integer', 'null'])

```go
	fqdn, err := client.Fqdns.Update(
		context.TODO(),
		"1517907029795014409",
		telnyx.FqdnUpdateParams{},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", fqdn.Data)
```

## Delete an FQDN

Delete an FQDN.

`DELETE /fqdns/{id}`

```go
	fqdn, err := client.Fqdns.Delete(context.TODO(), "1517907029795014409")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", fqdn.Data)
```

## List Ip connections

Returns a list of your IP connections.

`GET /ip_connections`

```go
	page, err := client.IPConnections.List(context.TODO(), telnyx.IPConnectionListParams{})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", page)
```

## Create an Ip connection

Creates an IP connection.

`POST /ip_connections`

Optional: `active` (boolean), `anchorsite_override` (enum), `android_push_credential_id` (['string', 'null']), `call_cost_in_webhooks` (boolean), `connection_name` (string), `default_on_hold_comfort_noise_enabled` (boolean), `dtmf_type` (enum), `encode_contact_header_enabled` (boolean), `encrypted_media` (enum), `inbound` (object), `ios_push_credential_id` (['string', 'null']), `jitter_buffer` (object), `noise_suppression` (enum), `noise_suppression_details` (object), `onnet_t38_passthrough_enabled` (boolean), `outbound` (object), `rtcp_settings` (object), `tags` (array[string]), `transport_protocol` (enum), `webhook_api_version` (enum), `webhook_event_failover_url` (uri), `webhook_event_url` (uri), `webhook_timeout_secs` (['integer', 'null'])

```go
	ipConnection, err := client.IPConnections.New(context.TODO(), telnyx.IPConnectionNewParams{})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", ipConnection.Data)
```

## Retrieve an Ip connection

Retrieves the details of an existing ip connection.

`GET /ip_connections/{id}`

```go
	ipConnection, err := client.IPConnections.Get(context.TODO(), "id")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", ipConnection.Data)
```

## Update an Ip connection

Updates settings of an existing IP connection.

`PATCH /ip_connections/{id}`

Optional: `active` (boolean), `anchorsite_override` (enum), `android_push_credential_id` (['string', 'null']), `call_cost_in_webhooks` (boolean), `connection_name` (string), `default_on_hold_comfort_noise_enabled` (boolean), `dtmf_type` (enum), `encode_contact_header_enabled` (boolean), `encrypted_media` (enum), `inbound` (object), `ios_push_credential_id` (['string', 'null']), `jitter_buffer` (object), `noise_suppression` (enum), `noise_suppression_details` (object), `onnet_t38_passthrough_enabled` (boolean), `outbound` (object), `rtcp_settings` (object), `tags` (array[string]), `transport_protocol` (enum), `webhook_api_version` (enum), `webhook_event_failover_url` (uri), `webhook_event_url` (uri), `webhook_timeout_secs` (['integer', 'null'])

```go
	ipConnection, err := client.IPConnections.Update(
		context.TODO(),
		"id",
		telnyx.IPConnectionUpdateParams{},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", ipConnection.Data)
```

## Delete an Ip connection

Deletes an existing IP connection.

`DELETE /ip_connections/{id}`

```go
	ipConnection, err := client.IPConnections.Delete(context.TODO(), "id")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", ipConnection.Data)
```

## List Ips

Get all IPs belonging to the user that match the given filters.

`GET /ips`

```go
	page, err := client.IPs.List(context.TODO(), telnyx.IPListParams{})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", page)
```

## Create an Ip

Create a new IP object.

`POST /ips` — Required: `ip_address`

Optional: `connection_id` (string), `port` (integer)

```go
	ip, err := client.IPs.New(context.TODO(), telnyx.IPNewParams{
		IPAddress: "192.168.0.0",
	})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", ip.Data)
```

## Retrieve an Ip

Return the details regarding a specific IP.

`GET /ips/{id}`

```go
	ip, err := client.IPs.Get(context.TODO(), "6a09cdc3-8948-47f0-aa62-74ac943d6c58")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", ip.Data)
```

## Update an Ip

Update the details of a specific IP.

`PATCH /ips/{id}` — Required: `ip_address`

Optional: `connection_id` (string), `port` (integer)

```go
	ip, err := client.IPs.Update(
		context.TODO(),
		"6a09cdc3-8948-47f0-aa62-74ac943d6c58",
		telnyx.IPUpdateParams{
			IPAddress: "192.168.0.0",
		},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", ip.Data)
```

## Delete an Ip

Delete an IP.

`DELETE /ips/{id}`

```go
	ip, err := client.IPs.Delete(context.TODO(), "6a09cdc3-8948-47f0-aa62-74ac943d6c58")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", ip.Data)
```

## Get all outbound voice profiles

Get all outbound voice profiles belonging to the user that match the given filters.

`GET /outbound_voice_profiles`

```go
	page, err := client.OutboundVoiceProfiles.List(context.TODO(), telnyx.OutboundVoiceProfileListParams{})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", page)
```

## Create an outbound voice profile

Create an outbound voice profile.

`POST /outbound_voice_profiles` — Required: `name`

Optional: `billing_group_id` (uuid), `call_recording` (object), `calling_window` (object), `concurrent_call_limit` (['integer', 'null']), `daily_spend_limit` (string), `daily_spend_limit_enabled` (boolean), `enabled` (boolean), `max_destination_rate` (number), `service_plan` (enum), `tags` (array[string]), `traffic_type` (enum), `usage_payment_method` (enum), `whitelisted_destinations` (array[string])

```go
	outboundVoiceProfile, err := client.OutboundVoiceProfiles.New(context.TODO(), telnyx.OutboundVoiceProfileNewParams{
		Name: "office",
	})
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", outboundVoiceProfile.Data)
```

## Retrieve an outbound voice profile

Retrieves the details of an existing outbound voice profile.

`GET /outbound_voice_profiles/{id}`

```go
	outboundVoiceProfile, err := client.OutboundVoiceProfiles.Get(context.TODO(), "1293384261075731499")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", outboundVoiceProfile.Data)
```

## Updates an existing outbound voice profile.

`PATCH /outbound_voice_profiles/{id}` — Required: `name`

Optional: `billing_group_id` (uuid), `call_recording` (object), `calling_window` (object), `concurrent_call_limit` (['integer', 'null']), `daily_spend_limit` (string), `daily_spend_limit_enabled` (boolean), `enabled` (boolean), `max_destination_rate` (number), `service_plan` (enum), `tags` (array[string]), `traffic_type` (enum), `usage_payment_method` (enum), `whitelisted_destinations` (array[string])

```go
	outboundVoiceProfile, err := client.OutboundVoiceProfiles.Update(
		context.TODO(),
		"1293384261075731499",
		telnyx.OutboundVoiceProfileUpdateParams{
			Name: "office",
		},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", outboundVoiceProfile.Data)
```

## Delete an outbound voice profile

Deletes an existing outbound voice profile.

`DELETE /outbound_voice_profiles/{id}`

```go
	outboundVoiceProfile, err := client.OutboundVoiceProfiles.Delete(context.TODO(), "1293384261075731499")
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", outboundVoiceProfile.Data)
```
