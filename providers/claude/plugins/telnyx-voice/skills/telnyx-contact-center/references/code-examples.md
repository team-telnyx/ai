# Code Examples — Telnyx Contact Center (AIF-273)

Complete webhook server implementations for the contact center flow. Each example handles: `call.initiated` → `call.answered` → `call.gather.ended` → `call.bridged` → `call.hangup` → `call.recording.saved`.

---

## Node.js / Express

```javascript
const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());
app.use(express.raw({ type: 'application/json' }));

const TELNYX_API = 'https://api.telnyx.com/v2';
const TELNYX_API_KEY = process.env.TELNYX_API_KEY;
const WEBHOOK_PORT = process.env.PORT || 3000;

// In-memory call state store (use Redis/DB in production)
const callStore = new Map(); // callControlId -> { customerLeg, agentLeg, department, state, recording }

// Departments mapped to DTMF digits
const DEPARTMENTS = {
  '1': { name: 'Sales', agent_number: process.env.SALES_AGENT_NUMBER },
  '2': { name: 'Support', agent_number: process.env.SUPPORT_AGENT_NUMBER },
  '3': { name: 'Billing', agent_number: process.env.BILLING_AGENT_NUMBER },
};

const authHeader = { Authorization: `Bearer ${TELNYX_API_KEY}` };

async function telnyxPost(path, body) {
  return axios.post(`${TELNYX_API}${path}`, body, { headers: { ...authHeader, 'Content-Type': 'application/json' } });
}

async function telnyxGet(path) {
  return axios.get(`${TELNYX_API}${path}`, { headers: authHeader });
}

function findCallForRecording(payload) {
  const ids = new Set([
    payload.call_control_id,
    payload.call_leg_id,
    payload.leg_id,
  ].filter(Boolean));

  for (const [custId, entry] of callStore) {
    if (ids.has(custId) || ids.has(entry.customerLeg) || ids.has(entry.agentLeg) || entry.callSessionId === payload.call_session_id) {
      return { callId: custId, call: entry };
    }
  }
  return { callId: null, call: null };
}

// --- Webhook endpoint ---
app.post('/webhook', (req, res) => {
  // Acknowledge immediately — Telnyx expects fast 200
  res.status(200).json({ ok: true });

  const event = req.body;
  const { event_type, payload } = event.data || {};

  setImmediate(() => {
    handleEvent(event_type, payload).catch(err => {
      console.error(`Error handling ${event_type}:`, err.message);
    });
  });
});

async function handleEvent(eventType, payload) {
  let callId = payload.call_control_id || payload.call_leg_id || payload.leg_id;

  switch (eventType) {
    case 'call.initiated': {
      // FRIC-001: Check direction — only answer incoming calls
      if (payload.direction === 'outgoing') {
        console.log(`Outgoing leg ${callId} — skipping IVR`);
        return;
      }
      console.log(`Incoming call from ${payload.from} to ${payload.to}`);
      callStore.set(callId, {
        customerLeg: callId,
        agentLeg: null,
        department: null,
        state: 'ringing',
        recording: null,
        callSessionId: payload.call_session_id,
        from: payload.from,
        to: payload.to,
      });
      await telnyxPost(`/calls/${callId}/actions/answer`, {});
      break;
    }

    case 'call.answered': {
      const call = callStore.get(callId);
      if (!call) {
        // Agent leg answered — find customer leg and bridge
        for (const [custId, entry] of callStore) {
          if (entry.agentLeg === callId) {
            try {
              await telnyxPost(`/calls/${custId}/actions/bridge`, {
                call_control_id: callId,
              });
            } catch (err) {
              // FRIC-004: Retry once for transient 422
              if (err.response && err.response.status === 422) {
                console.log('Bridge 422 — retrying once');
                await telnyxPost(`/calls/${custId}/actions/bridge`, {
                  call_control_id: callId,
                });
              } else {
                throw err;
              }
            }
            break;
          }
        }
        return;
      }
      if (call.state === 'answered') return;

      call.state = 'answered';
      // Start IVR gather using speak (TTS)
      await telnyxPost(`/calls/${callId}/actions/gather_using_speak`, {
        payload: 'Welcome to the contact center. Press 1 for Sales, 2 for Support, 3 for Billing.',
        voice: 'female',
        maximum_digits: 1,
        timeout_millis: 10000,
      });
      break;
    }

    case 'call.gather.ended': {
      const call = callStore.get(callId);
      if (!call) return;

      if (call.state === 'voicemail_prompt') {
        if (payload.digits === '1') {
          call.state = 'voicemail';
          await telnyxPost(`/calls/${callId}/actions/record_start`, {
            format: 'mp3',
            channels: 'single',
            transcription: true,
          });
          await telnyxPost(`/calls/${callId}/actions/speak`, {
            payload: 'Please leave your message after the tone. You may hang up when finished.',
            voice: 'female',
          });
        } else {
          await telnyxPost(`/calls/${callId}/actions/hangup`, {});
        }
        return;
      }

      // Dedup: reject redelivered gather if agent dial is already in progress
      if (call.state === 'dialing_agent' || call.state === 'bridged') return;

      if (payload.status === 'timeout' || !payload.digits) {
        // No DTMF — replay menu
        await telnyxPost(`/calls/${callId}/actions/gather_using_speak`, {
          payload: 'Please press 1 for Sales, 2 for Support, 3 for Billing.',
          voice: 'female',
          maximum_digits: 1,
          timeout_millis: 10000,
        });
        return;
      }

      const dept = DEPARTMENTS[payload.digits];
      if (!dept) {
        // Invalid DTMF — replay menu
        await telnyxPost(`/calls/${callId}/actions/gather_using_speak`, {
          payload: 'Invalid selection. Press 1 for Sales, 2 for Support, 3 for Billing.',
          voice: 'female',
          maximum_digits: 1,
          timeout_millis: 10000,
        });
        return;
      }

      call.department = dept.name;
      call.state = 'dialing_agent';

      // FRIC-004: Build agent state BEFORE dialing
      call.agentLeg = null; // Will be set when call.initiated for outgoing fires

      // Dial agent
      const dialRes = await telnyxPost('/calls', {
        connection_id: process.env.CALL_CONTROL_APP_ID,
        to: dept.agent_number,
        from: call.to,
        timeout_secs: 30,
      });

      call.agentLeg = dialRes.data.data.call_control_id;
      console.log(`Dialing agent for ${dept.name}: ${call.agentLeg}`);
      break;
    }

    case 'call.bridged': {
      // Start recording
      await telnyxPost(`/calls/${callId}/actions/record_start`, {
        format: 'mp3',
        channels: 'single',
        transcription: true,
      });

      const call = callStore.get(callId);
      if (call) call.state = 'bridged';
      break;
    }

    case 'call.hangup': {
      let call = callStore.get(callId);

      // If hangup is from agent leg, find the customer leg
      if (!call) {
        for (const [custId, entry] of callStore) {
          if (entry.agentLeg === callId) {
            call = entry;
            callId = custId;
            break;
          }
        }
      }
      if (!call) break;

      // FRIC-008: Cancel agent leg if still ringing
      if (call.agentLeg && call.agentLeg !== callId && call.state !== 'bridged') {
        try {
          await telnyxPost(`/calls/${call.agentLeg}/actions/hangup`, {});
        } catch (e) {
          // Agent leg may already be gone — ignore
        }
      }

      // FRIC-007: If customer was queued and agent didn't answer, offer voicemail
      if (call && call.state === 'dialing_agent' && payload.hangup_source !== 'caller') {
        console.log('Agent no-answer — offering voicemail');
        await telnyxPost(`/calls/${callId}/actions/gather_using_speak`, {
          payload: 'No agent is available. Press 1 to leave a voicemail, or hang up to end the call.',
          voice: 'female',
          maximum_digits: 1,
          timeout_millis: 10000,
        });
        call.state = 'voicemail_prompt';
        return;
      }

      // Save prior state before overwriting — TTL depends on whether recording is expected
      const priorState = call ? call.state : null;
      if (call) {
        call.state = 'hungup';
        call.duration = payload.duration;
        call.hangupCause = payload.hangup_cause;
        call.hangupSource = payload.hangup_source;
      }

      console.log(`Call hung up: ${payload.hangup_cause} by ${payload.hangup_source}`);
      if (priorState === 'bridged' || priorState === 'voicemail') {
        // Keep bridged/voicemail calls briefly so recording/transcription callbacks can update metrics.
        setTimeout(() => callStore.delete(callId), 10 * 60 * 1000);
      } else {
        setTimeout(() => callStore.delete(callId), 60000);
      }
      break;
    }

    case 'call.recording.saved': {
      // FRIC-006: Recording arrives after hangup — update retroactively
      const { call } = findCallForRecording(payload);
      if (call) {
        call.recording = payload.recording_url || payload.recording_urls?.mp3 || payload.public_recording_urls?.mp3 || null;
        call.state = 'completed';
        console.log(`Recording saved: ${call.recording}`);
        console.log(`Metrics: dept=${call.department}, duration=${call.duration}s, recording=${!!call.recording}`);
      }
      break;
    }

    case 'call.recording.transcription.saved': {
      const { call } = findCallForRecording(payload);
      if (call) {
        call.transcription = payload.transcription || payload.transcription_text || payload.transcription_url || null;
        console.log(`Transcription saved for dept=${call.department}`);
      }
      break;
    }

    default:
      console.log(`Unhandled event: ${eventType}`);
  }
}

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.listen(WEBHOOK_PORT, () => {
  console.log(`Contact Center webhook server running on port ${WEBHOOK_PORT}`);
});
```

### Installation (Node.js)

```bash
npm init -y
npm install express axios
TELNYX_API_KEY=your-key-here \
CALL_CONTROL_APP_ID=your-app-id \
SALES_AGENT_NUMBER=+1XXXXXXXXXX \
SUPPORT_AGENT_NUMBER=+1XXXXXXXXXX \
BILLING_AGENT_NUMBER=+1XXXXXXXXXX \
node server.js
```

---

## Python / Flask

```python
import os
import json
import logging
import requests
from flask import Flask, request, jsonify
from threading import Thread

app = Flask(__name__)

TELNYX_API = 'https://api.telnyx.com/v2'
TELNYX_API_KEY = os.environ.get('TELNYX_API_KEY', '')
WEBHOOK_PORT = int(os.environ.get('PORT', 3000))

# In-memory call state store
call_store = {}

DEPARTMENTS = {
    '1': {'name': 'Sales', 'agent_number': os.environ.get('SALES_AGENT_NUMBER', '')},
    '2': {'name': 'Support', 'agent_number': os.environ.get('SUPPORT_AGENT_NUMBER', '')},
    '3': {'name': 'Billing', 'agent_number': os.environ.get('BILLING_AGENT_NUMBER', '')},
}

AUTH_HEADER = {'Authorization': f'Bearer {TELNYX_API_KEY}'}


def telnyx_post(path, body):
    url = f'{TELNYX_API}{path}'
    headers = {**AUTH_HEADER, 'Content-Type': 'application/json'}
    return requests.post(url, json=body, headers=headers)


def handle_event(event_type, payload):
    call_id = payload.get('call_control_id')
    if not call_id:
        return

    if event_type == 'call.initiated':
        # FRIC-001: Only answer incoming calls
        if payload.get('direction') == 'outgoing':
            logging.info(f'Outgoing leg {call_id} — skipping IVR')
            return
        logging.info(f'Incoming call from {payload.get("from")} to {payload.get("to")}')
        call_store[call_id] = {
            'customer_leg': call_id,
            'agent_leg': None,
            'department': None,
            'state': 'ringing',
            'recording': None,
            'from': payload.get('from'),
            'to': payload.get('to'),
        }
        telnyx_post(f'/calls/{call_id}/actions/answer', {})

    elif event_type == 'call.answered':
        call = call_store.get(call_id)
        if not call:
            # Agent leg answered — find customer leg and bridge
            for cust_id, entry in call_store.items():
                if entry.get('agent_leg') == call_id:
                    try:
                        telnyx_post(f'/calls/{cust_id}/actions/bridge', {
                            'call_control_id': call_id,
                        })
                    except Exception as e:
                        # FRIC-004: Retry once for transient 422
                        if getattr(getattr(e, 'response', None), 'status_code', 0) == 422:
                            logging.info('Bridge 422 — retrying once')
                            telnyx_post(f'/calls/{cust_id}/actions/bridge', {
                                'call_control_id': call_id,
                            })
                        else:
                            raise
                    break
            return
        if call['state'] == 'answered':
            return
        call['state'] = 'answered'
        telnyx_post(f'/calls/{call_id}/actions/gather_using_speak', {
            'payload': 'Welcome to the contact center. Press 1 for Sales, 2 for Support, 3 for Billing.',
            'voice': 'female',
            'maximum_digits': 1,
            'timeout_millis': 10000,
        })

    elif event_type == 'call.gather.ended':
        call = call_store.get(call_id)
        if not call:
            return
        # Dedup: reject redelivered gather if agent dial is already in progress
        if call.get('state') in ('dialing_agent', 'bridged'):
            return
        if payload.get('status') == 'timeout' or not payload.get('digits'):
            telnyx_post(f'/calls/{call_id}/actions/gather_using_speak', {
                'payload': 'Please press 1 for Sales, 2 for Support, 3 for Billing.',
                'voice': 'female',
                'maximum_digits': 1,
                'timeout_millis': 10000,
            })
            return
        dept = DEPARTMENTS.get(payload.get('digits'))
        if not dept:
            telnyx_post(f'/calls/{call_id}/actions/gather_using_speak', {
                'payload': 'Invalid selection. Press 1 for Sales, 2 for Support, 3 for Billing.',
                'voice': 'female',
                'maximum_digits': 1,
                'timeout_millis': 10000,
            })
            return
        call['department'] = dept['name']
        call['state'] = 'dialing_agent'
        # FRIC-004: Build state before dialing
        dial_res = telnyx_post('/calls', {
            'connection_id': os.environ.get('CALL_CONTROL_APP_ID', ''),
            'to': dept['agent_number'],
            'from': call['to'],
            'timeout_secs': 30,
        })
        call['agent_leg'] = dial_res.json().get('data', {}).get('call_control_id')
        logging.info(f'Dialing agent for {dept["name"]}: {call["agent_leg"]}')

    elif event_type == 'call.bridged':
        telnyx_post(f'/calls/{call_id}/actions/record_start', {
            'format': 'mp3',
            'channels': 'single',
            'transcription': True,
        })
        call = call_store.get(call_id)
        if call:
            call['state'] = 'bridged'

    elif event_type == 'call.hangup':
        call = call_store.get(call_id)
        # If hangup is from agent leg, find the customer leg
        if not call:
            for cust_id, entry in call_store.items():
                if entry.get('agent_leg') == call_id:
                    call = entry
                    call_id = cust_id
                    break
        if not call:
            return
        # FRIC-008: Cancel agent leg if still ringing
        if call.get('agent_leg') and call['agent_leg'] != call_id and call['state'] != 'bridged':
            try:
                telnyx_post(f'/calls/{call["agent_leg"]}/actions/hangup', {})
            except Exception:
                pass
        if call:
            call['state'] = 'hungup'
            call['duration'] = payload.get('duration')
        logging.info(f'Call hung up: {payload.get("hangup_cause")} by {payload.get("hangup_source")}')

    elif event_type == 'call.recording.saved':
        # FRIC-006: Recording arrives after hangup
        call = call_store.get(call_id)
        if call:
            call['recording'] = payload.get('recording_url')
            call['state'] = 'completed'
            logging.info(f'Recording saved: {payload.get("recording_url")}')


@app.route('/webhook', methods=['POST'])
def webhook():
    # Acknowledge immediately
    event = request.get_json(silent=True) or {}
    event_type = event.get('data', {}).get('event_type')
    payload = event.get('data', {}).get('payload', {})
    # Process asynchronously
    Thread(target=handle_event, args=(event_type, payload)).start()
    return jsonify({'ok': True}), 200


@app.route('/health')
def health():
    return jsonify({'status': 'ok'})


if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO)
    app.run(host='0.0.0.0', port=WEBHOOK_PORT)
```

### Installation (Python)

```bash
pip install flask requests
TELNYX_API_KEY=your-key-here \
CALL_CONTROL_APP_ID=your-app-id \
SALES_AGENT_NUMBER=+1XXXXXXXXXX \
SUPPORT_AGENT_NUMBER=+1XXXXXXXXXX \
BILLING_AGENT_NUMBER=+1XXXXXXXXXX \
python server.py
```

---

## Ruby / Sinatra

```ruby
require 'sinatra'
require 'net/http'
require 'json'
require 'logger'

set :port, ENV['PORT'] || 3000
set :bind, '0.0.0.0'

TELNYX_API = 'https://api.telnyx.com/v2'.freeze
TELNYX_API_KEY = ENV['TELNYX_API_KEY']

DEPARTMENTS = {
  '1' => { name: 'Sales', agent_number: ENV['SALES_AGENT_NUMBER'] },
  '2' => { name: 'Support', agent_number: ENV['SUPPORT_AGENT_NUMBER'] },
  '3' => { name: 'Billing', agent_number: ENV['BILLING_AGENT_NUMBER'] }
}.freeze

# Thread-safe call store
class ThreadSafeHash
  def initialize; @store = {}; @mutex = Mutex.new; end
  def get(key); @mutex.synchronize { @store[key] }; end
  def set(key, val); @mutex.synchronize { @store[key] = val }; end
  def delete(key); @mutex.synchronize { @store.delete(key) }; end
  def each(&block); @mutex.synchronize { @store.each(&block) }; end
end

CALL_STORE = ThreadSafeHash.new

def telnyx_post(path, body)
  uri = URI("#{TELNYX_API}#{path}")
  http = Net::HTTP.new(uri.host, uri.port)
  http.use_ssl = true
  req = Net::HTTP::Post.new(uri)
  req['Authorization'] = "Bearer #{TELNYX_API_KEY}"
  req['Content-Type'] = 'application/json'
  req.body = body.to_json
  http.request(req)
end

post '/webhook' do
  content_type :json
  event = JSON.parse(request.body.read)
  event_type = event.dig('data', 'event_type')
  payload = event.dig('data', 'payload')

  Thread.new do
    begin
      handle_event(event_type, payload)
    rescue => e
      Logger.new($stdout).error("Error handling #{event_type}: #{e.message}")
    end
  end

  { ok: true }.to_json
end

def handle_event(event_type, payload)
  call_id = payload['call_control_id']
  return unless call_id

  case event_type
  when 'call.initiated'
    # FRIC-001: Skip outgoing legs
    return if payload['direction'] == 'outgoing'

    CALL_STORE.set(call_id, {
      customer_leg: call_id,
      agent_leg: nil,
      department: nil,
      state: 'ringing',
      recording: nil,
      from: payload['from'],
      to: payload['to']
    })
    telnyx_post("/calls/#{call_id}/actions/answer", {})

  when 'call.answered'
    call = CALL_STORE.get(call_id)
    unless call
      # Agent leg answered — find customer leg and bridge
      CALL_STORE.each do |cust_id, entry|
        if entry[:agent_leg] == call_id
          begin
            telnyx_post("/calls/#{cust_id}/actions/bridge", {
              call_control_id: call_id
            })
          rescue => e
            # FRIC-004: Retry once for transient 422
            raise unless e.respond_to?(:response) && e.response&.code == '422'
            Logger.new($stdout).info('Bridge 422 — retrying once')
            telnyx_post("/calls/#{cust_id}/actions/bridge", {
              call_control_id: call_id
            })
          end
          break
        end
      end
      return
    end
    return if call[:state] == 'answered'

    call[:state] = 'answered'
    telnyx_post("/calls/#{call_id}/actions/gather_using_speak", {
      payload: 'Welcome to the contact center. Press 1 for Sales, 2 for Support, 3 for Billing.',
      voice: 'female',
      maximum_digits: 1,
      timeout_millis: 10000
    })

  when 'call.gather.ended'
    call = CALL_STORE.get(call_id)
    return unless call

    # Dedup: reject redelivered gather if agent dial is already in progress
    return if %w[dialing_agent bridged].include?(call[:state])

    menu = 'Press 1 for Sales, 2 for Support, 3 for Billing.'

    if payload['status'] == 'timeout' || payload['digits'].to_s.empty?
      telnyx_post("/calls/#{call_id}/actions/gather_using_speak", {
        payload: menu, voice: 'female', maximum_digits: 1, timeout_millis: 10000
      })
      return
    end

    dept = DEPARTMENTS[payload['digits']]
    unless dept
      telnyx_post("/calls/#{call_id}/actions/gather_using_speak", {
        payload: 'Invalid selection. ' + menu,
        voice: 'female', maximum_digits: 1, timeout_millis: 10000
      })
      return
    end

    call[:department] = dept[:name]
    call[:state] = 'dialing_agent'

    # FRIC-004: Build state before dialing
    res = telnyx_post('/calls', {
      connection_id: ENV['CALL_CONTROL_APP_ID'],
      to: dept[:agent_number],
      from: call[:to],
      timeout_secs: 30
    })
    call[:agent_leg] = JSON.parse(res.body).dig('data', 'call_control_id')

  when 'call.bridged'
    telnyx_post("/calls/#{call_id}/actions/record_start", {
      format: 'mp3', channels: 'single', transcription: true
    })
    call = CALL_STORE.get(call_id)
    call[:state] = 'bridged' if call

  when 'call.hangup'
    call = CALL_STORE.get(call_id)
    # If hangup is from agent leg, find the customer leg
    if call.nil?
      CALL_STORE.each do |cust_id, entry|
        if entry[:agent_leg] == call_id
          call = entry
          call_id = cust_id
          break
        end
      end
    end
    return if call.nil?
    # FRIC-008: Cancel agent leg
    if call[:agent_leg] && call[:agent_leg] != call_id && call[:state] != 'bridged'
      begin
        telnyx_post("/calls/#{call[:agent_leg]}/actions/hangup", {})
      rescue
        # Agent leg may already be gone
      end
    end
    if call
      call[:state] = 'hungup'
      call[:duration] = payload['duration']
    end

  when 'call.recording.saved'
    # FRIC-006: Update retroactively
    call = CALL_STORE.get(call_id)
    if call
      call[:recording] = payload['recording_url']
      call[:state] = 'completed'
    end
  end
end

get '/health' do
  content_type :json
  { status: 'ok' }.to_json
end
```

### Installation (Ruby)

```bash
gem install sinatra
TELNYX_API_KEY=your-key-here \
CALL_CONTROL_APP_ID=your-app-id \
SALES_AGENT_NUMBER=+1XXXXXXXXXX \
SUPPORT_AGENT_NUMBER=+1XXXXXXXXXX \
BILLING_AGENT_NUMBER=+1XXXXXXXXXX \
ruby server.rb
```

---

## PHP

```php
<?php
// Contact Center webhook server — PHP
// Requires PHP 8.0+ and built-in server or Apache/Nginx with PHP-FPM

$TELNYX_API = 'https://api.telnyx.com/v2';
$TELNYX_API_KEY = getenv('TELNYX_API_KEY');
$WEBHOOK_PORT = getenv('PORT') ?: 3000;

$DEPARTMENTS = [
    '1' => ['name' => 'Sales', 'agent_number' => getenv('SALES_AGENT_NUMBER')],
    '2' => ['name' => 'Support', 'agent_number' => getenv('SUPPORT_AGENT_NUMBER')],
    '3' => ['name' => 'Billing', 'agent_number' => getenv('BILLING_AGENT_NUMBER')],
];

// File-based call store (use Redis/DB in production)
$STORE_FILE = sys_get_temp_dir() . '/telnyx_call_store.json';

function loadStore() {
    global $STORE_FILE;
    if (file_exists($STORE_FILE)) {
        return json_decode(file_get_contents($STORE_FILE), true) ?: [];
    }
    return [];
}

function saveStore($store) {
    global $STORE_FILE;
    file_put_contents($STORE_FILE, json_encode($store));
}

function telnyxPost($path, $body) {
    global $TELNYX_API, $TELNYX_API_KEY;
    $ch = curl_init($TELNYX_API . $path);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => [
            'Authorization: Bearer ' . $TELNYX_API_KEY,
            'Content-Type: application/json',
        ],
        CURLOPT_POSTFIELDS => json_encode($body),
    ]);
    $response = curl_exec($ch);
    curl_close($ch);
    return json_decode($response, true);
}

// Route handling (use with PHP built-in server: php -S 0.0.0.0:3000 server.php)
$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

if ($path === '/health' && $method === 'GET') {
    header('Content-Type: application/json');
    echo json_encode(['status' => 'ok']);
    return;
}

if ($path === '/webhook' && $method === 'POST') {
    // Acknowledge immediately
    header('Content-Type: application/json');
    http_response_code(200);
    echo json_encode(['ok' => true]);

    // Process asynchronously (fastcgi_finish_request for non-blocking)
    if (function_exists('fastcgi_finish_request')) {
        fastcgi_finish_request();
    }

    $event = json_decode(file_get_contents('php://input'), true);
    $eventType = $event['data']['event_type'] ?? '';
    $payload = $event['data']['payload'] ?? [];
    $callId = $payload['call_control_id'] ?? '';

    if (!$callId) return;

    switch ($eventType) {
        case 'call.initiated':
            // FRIC-001: Skip outgoing
            if ($payload['direction'] === 'outgoing') break;
            $store = loadStore();
            $store[$callId] = [
                'customer_leg' => $callId,
                'agent_leg' => null,
                'department' => null,
                'state' => 'ringing',
                'recording' => null,
                'from' => $payload['from'],
                'to' => $payload['to'],
            ];
            saveStore($store);
            telnyxPost("/calls/{$callId}/actions/answer", []);
            break;

        case 'call.answered':
            $store = loadStore();
            if (!isset($store[$callId])) {
                // Agent leg answered — find customer leg and bridge
                foreach ($store as $custId => $entry) {
                    if (isset($entry['agent_leg']) && $entry['agent_leg'] === $callId) {
                        $bridgeResult = telnyxPost("/calls/{$custId}/actions/bridge", [
                            'call_control_id' => $callId,
                        ]);
                        // FRIC-004: Retry once for transient 422
                        if (isset($bridgeResult['errors'])) {
                            telnyxPost("/calls/{$custId}/actions/bridge", [
                                'call_control_id' => $callId,
                            ]);
                        }
                        break;
                    }
                }
                break;
            }
            if ($store[$callId]['state'] === 'answered') break;
            $store[$callId]['state'] = 'answered';
            saveStore($store);
            telnyxPost("/calls/{$callId}/actions/gather_using_speak", [
                'payload' => 'Welcome to the contact center. Press 1 for Sales, 2 for Support, 3 for Billing.',
                'voice' => 'female',
                'maximum_digits' => 1,
                'timeout_millis' => 10000,
            ]);
            break;

        case 'call.gather.ended':
            $store = loadStore();
            if (!isset($store[$callId])) break;
            // Dedup: reject redelivered gather if agent dial is already in progress
            if (in_array($store[$callId]['state'] ?? '', ['dialing_agent', 'bridged'])) break;
            $menu = 'Press 1 for Sales, 2 for Support, 3 for Billing.';
            if (($payload['status'] ?? '') === 'timeout' || empty($payload['digits'])) {
                telnyxPost("/calls/{$callId}/actions/gather_using_speak", [
                    'payload' => $menu, 'voice' => 'female', 'maximum_digits' => 1, 'timeout_millis' => 10000,
                ]);
                break;
            }
            $dept = $DEPARTMENTS[$payload['digits']] ?? null;
            if (!$dept) {
                telnyxPost("/calls/{$callId}/actions/gather_using_speak", [
                    'payload' => 'Invalid selection. ' . $menu,
                    'voice' => 'female', 'maximum_digits' => 1, 'timeout_millis' => 10000,
                ]);
                break;
            }
            $store[$callId]['department'] = $dept['name'];
            $store[$callId]['state'] = 'dialing_agent';
            saveStore($store);
            // FRIC-004: Build state before dialing
            $res = telnyxPost('/calls', [
                'connection_id' => getenv('CALL_CONTROL_APP_ID'),
                'to' => $dept['agent_number'],
                'from' => $store[$callId]['to'],
                'timeout_secs' => 30,
            ]);
            $store[$callId]['agent_leg'] = $res['data']['call_control_id'] ?? null;
            saveStore($store);
            break;

        case 'call.bridged':
            telnyxPost("/calls/{$callId}/actions/record_start", [
                'format' => 'mp3', 'channels' => 'single', 'transcription' => true,
            ]);
            $store = loadStore();
            $store[$callId]['state'] = 'bridged';
            saveStore($store);
            break;

        case 'call.hangup':
            $store = loadStore();
            // If hangup is from agent leg, find the customer leg
            if (!isset($store[$callId])) {
                foreach ($store as $custId => $entry) {
                    if (($entry['agent_leg'] ?? null) === $callId) {
                        $callId = $custId;
                        break;
                    }
                }
            }
            // FRIC-008: Cancel agent leg
            if (isset($store[$callId]) && $store[$callId]['agent_leg'] && $store[$callId]['agent_leg'] !== $callId && $store[$callId]['state'] !== 'bridged') {
                telnyxPost("/calls/{$store[$callId]['agent_leg']}/actions/hangup", []);
            }
            if (isset($store[$callId])) {
                $store[$callId]['state'] = 'hungup';
                $store[$callId]['duration'] = $payload['duration'] ?? 0;
                saveStore($store);
            }
            break;

        case 'call.recording.saved':
            // FRIC-006: Update retroactively
            $store = loadStore();
            if (isset($store[$callId])) {
                $store[$callId]['recording'] = $payload['recording_url'] ?? null;
                $store[$callId]['state'] = 'completed';
                saveStore($store);
            }
            break;
    }
}
```

### Installation (PHP)

```bash
# Built-in server (development)
TELNYX_API_KEY=your-key-here \
CALL_CONTROL_APP_ID=your-app-id \
SALES_AGENT_NUMBER=+1XXXXXXXXXX \
SUPPORT_AGENT_NUMBER=+1XXXXXXXXXX \
BILLING_AGENT_NUMBER=+1XXXXXXXXXX \
php -S 0.0.0.0:3000 server.php
```

---

## Java / Spring Boot

```java
// Contact Center webhook server — Java Spring Boot
// pom.xml dependencies: spring-boot-starter-web, com.squareup.okhttp3:okhttp

package com.telnyx.contactcenter;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.*;
import okhttp3.*;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@SpringBootApplication
@RestController
public class ContactCenterApplication {

    private static final String TELNYX_API = "https://api.telnyx.com/v2";
    private static final String TELNYX_API_KEY = System.getenv("TELNYX_API_KEY");
    private static final String CCA_ID = System.getenv("CALL_CONTROL_APP_ID");

    private static final Map<String, Map<String, Object>> callStore = new ConcurrentHashMap<>();
    private static final ExecutorService executor = Executors.newCachedThreadPool();

    private static final Map<String, Map<String, String>> DEPARTMENTS = new ConcurrentHashMap<>();
    static {
        java.util.function.Function<String, String> env = System::getenv;
        DEPARTMENTS.put("1", new HashMap<>(Map.of("name", "Sales", "agent_number", env.apply("SALES_AGENT_NUMBER") != null ? env.apply("SALES_AGENT_NUMBER") : "")));
        DEPARTMENTS.put("2", new HashMap<>(Map.of("name", "Support", "agent_number", env.apply("SUPPORT_AGENT_NUMBER") != null ? env.apply("SUPPORT_AGENT_NUMBER") : "")));
        DEPARTMENTS.put("3", new HashMap<>(Map.of("name", "Billing", "agent_number", env.apply("BILLING_AGENT_NUMBER") != null ? env.apply("BILLING_AGENT_NUMBER") : "")));
    }

    private final OkHttpClient httpClient = new OkHttpClient();

    public static void main(String[] args) {
        SpringApplication.run(ContactCenterApplication.class, args);
    }

    @PostMapping("/webhook")
    public ResponseEntity<Map<String, Object>> webhook(@RequestBody Map<String, Object> event) {
        // Acknowledge immediately
        executor.submit(() -> {
            try {
                @SuppressWarnings("unchecked")
                Map<String, Object> data = (Map<String, Object>) event.get("data");
                String eventType = (String) data.get("event_type");
                @SuppressWarnings("unchecked")
                Map<String, Object> payload = (Map<String, Object>) data.get("payload");
                handleEvent(eventType, payload);
            } catch (Exception e) {
                System.err.println("Error handling event: " + e.getMessage());
            }
        });
        return ResponseEntity.ok(Map.of("ok", true));
    }

    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> health() {
        return ResponseEntity.ok(Map.of("status", "ok"));
    }

    private void handleEvent(String eventType, Map<String, Object> payload) throws IOException {
        String callId = (String) payload.get("call_control_id");
        if (callId == null) return;

        switch (eventType) {
            case "call.initiated" -> {
                // FRIC-001: Skip outgoing legs
                if ("outgoing".equals(payload.get("direction"))) return;
                System.out.println("Incoming call from " + payload.get("from"));
                HashMap<String, Object> entry = new HashMap<>();
                entry.put("customer_leg", callId);
                entry.put("agent_leg", null);
                entry.put("department", null);
                entry.put("state", "ringing");
                entry.put("recording", null);
                entry.put("from", payload.get("from"));
                entry.put("to", payload.get("to"));
                callStore.put(callId, entry);
                telnyxPost("/calls/" + callId + "/actions/answer", "{}");
            }
            case "call.answered" -> {
                Map<String, Object> call = callStore.get(callId);
                if (call == null) {
                    // Agent leg answered — find customer leg and bridge
                    for (Map.Entry<String, Map<String, Object>> e : callStore.entrySet()) {
                        if (callId.equals(e.getValue().get("agent_leg"))) {
                            try {
                                telnyxPost("/calls/" + e.getKey() + "/actions/bridge",
                                    "{\"call_control_id\":\"" + callId + "\"}");
                            } catch (IOException ex) {
                                // FRIC-004: Retry once for transient 422
                                System.out.println("Bridge failed — retrying once");
                                telnyxPost("/calls/" + e.getKey() + "/actions/bridge",
                                    "{\"call_control_id\":\"" + callId + "\"}");
                            }
                            break;
                        }
                    }
                    return;
                }
                if ("answered".equals(call.get("state"))) return;
                call.put("state", "answered");
                telnyxPost("/calls/" + callId + "/actions/gather_using_speak",
                    "{\"payload\":\"Welcome to the contact center. Press 1 for Sales, 2 for Support, 3 for Billing.\",\"voice\":\"female\",\"maximum_digits\":1,\"timeout_millis\":10000}");
            }
            case "call.gather.ended" -> {
                Map<String, Object> call = callStore.get(callId);
                if (call == null) return;
                // Dedup: reject redelivered gather if agent dial is already in progress
                String callState = (String) call.get("state");
                if ("dialing_agent".equals(callState) || "bridged".equals(callState)) return;
                String status = (String) payload.get("status");
                String digits = (String) payload.get("digits");
                String menu = "Press 1 for Sales, 2 for Support, 3 for Billing.";
                if ("timeout".equals(status) || digits == null || digits.isEmpty()) {
                    telnyxPost("/calls/" + callId + "/actions/gather_using_speak",
                        "{\"payload\":\"" + menu + "\",\"voice\":\"female\",\"maximum_digits\":1,\"timeout_millis\":10000}");
                    return;
                }
                Map<String, String> dept = DEPARTMENTS.get(digits);
                if (dept == null) {
                    telnyxPost("/calls/" + callId + "/actions/gather_using_speak",
                        "{\"payload\":\"Invalid selection. " + menu + "\",\"voice\":\"female\",\"maximum_digits\":1,\"timeout_millis\":10000}");
                    return;
                }
                call.put("department", dept.get("name"));
                call.put("state", "dialing_agent");
                // FRIC-004: Build state before dialing
                String dialBody = String.format(
                    "{\"connection_id\":\"%s\",\"to\":\"%s\",\"from\":\"%s\",\"timeout_secs\":30}",
                    CCA_ID, dept.get("agent_number"), call.get("to"));
                String res = telnyxPost("/calls", dialBody);
                // Parse call_control_id from response (simplified)
                call.put("agent_leg", extractCallControlId(res));
            }
            case "call.bridged" -> {
                telnyxPost("/calls/" + callId + "/actions/record_start",
                    "{\"format\":\"mp3\",\"channels\":\"single\",\"transcription\":true}");
                Map<String, Object> call = callStore.get(callId);
                if (call != null) call.put("state", "bridged");
            }
            case "call.hangup" -> {
                Map<String, Object> call = callStore.get(callId);
                // If hangup is from agent leg, find the customer leg
                if (call == null) {
                    for (Map.Entry<String, Map<String, Object>> entry : callStore.entrySet()) {
                        if (callId.equals(entry.getValue().get("agent_leg"))) {
                            call = entry.getValue();
                            callId = entry.getKey();
                            break;
                        }
                    }
                }
                if (call == null) break;
                // FRIC-008: Cancel agent leg
                if (call.get("agent_leg") != null && !callId.equals(call.get("agent_leg")) && !"bridged".equals(call.get("state"))) {
                    try {
                        telnyxPost("/calls/" + call.get("agent_leg") + "/actions/hangup", "{}");
                    } catch (Exception e) {
                        // Agent leg may already be gone
                    }
                }
                if (call != null) {
                    call.put("state", "hungup");
                    call.put("duration", payload.get("duration"));
                }
                System.out.println("Call hung up: " + payload.get("hangup_cause"));
            }
            case "call.recording.saved" -> {
                // FRIC-006: Update retroactively
                Map<String, Object> call = callStore.get(callId);
                if (call != null) {
                    call.put("recording", payload.get("recording_url"));
                    call.put("state", "completed");
                    System.out.println("Recording saved: " + payload.get("recording_url"));
                }
            }
            default -> System.out.println("Unhandled event: " + eventType);
        }
    }

    private String telnyxPost(String path, String jsonBody) throws IOException {
        RequestBody body = RequestBody.create(jsonBody, MediaType.parse("application/json"));
        Request request = new Request.Builder()
            .url(TELNYX_API + path)
            .addHeader("Authorization", "Bearer " + TELNYX_API_KEY)
            .addHeader("Content-Type", "application/json")
            .post(body)
            .build();
        try (Response response = httpClient.newCall(request).execute()) {
            return response.body() != null ? response.body().string() : "";
        }
    }

    private String extractCallControlId(String responseBody) {
        // Simple JSON extraction — use Jackson/Gson in production
        int idx = responseBody.indexOf("\"call_control_id\":\"");
        if (idx == -1) return null;
        int start = idx + "\"call_control_id\":\"".length();
        int end = responseBody.indexOf("\"", start);
        return responseBody.substring(start, end);
    }
}
```

### Installation (Java)

```bash
# pom.xml needs: spring-boot-starter-web, com.squareup.okhttp3:okhttp
mvn clean package
TELNYX_API_KEY=your-key-here \
CALL_CONTROL_APP_ID=your-app-id \
SALES_AGENT_NUMBER=+1XXXXXXXXXX \
SUPPORT_AGENT_NUMBER=+1XXXXXXXXXX \
BILLING_AGENT_NUMBER=+1XXXXXXXXXX \
java -jar target/contact-center-1.0.0.jar
```

---

## Go / net/http

```go
package main

import (
	"encoding/json"
	"io"
	"log"
	"net/http"
	"os"
	"sync"
	"bytes"
)

const (
	telnyxAPI   = "https://api.telnyx.com/v2"
	telnyxKey   = "TELNYX_API_KEY" // env var name
	ccaID       = "CALL_CONTROL_APP_ID"
)

type WebhookEvent struct {
	Data struct {
		EventType string                 `json:"event_type"`
		Payload   map[string]interface{} `json:"payload"`
	} `json:"data"`
}

type CallState struct {
	CustomerLeg string
	AgentLeg    string
	Department  string
	State       string
	Recording   string
	From        string
	To          string
	Duration    float64
}

var (
	callStore   = make(map[string]*CallState)
	storeMutex  sync.RWMutex
	httpClient  = &http.Client{}
)

var departments = map[string]struct {
	Name        string
	AgentNumber string
}{
	"1": {"Sales", ""},
	"2": {"Support", ""},
	"3": {"Billing", ""},
}

func init() {
	departments["1"] = struct {
		Name        string
		AgentNumber string
	}{"Sales", os.Getenv("SALES_AGENT_NUMBER")}
	departments["2"] = struct {
		Name        string
		AgentNumber string
	}{"Support", os.Getenv("SUPPORT_AGENT_NUMBER")}
	departments["3"] = struct {
		Name        string
		AgentNumber string
	}{"Billing", os.Getenv("BILLING_AGENT_NUMBER")}
}

func telnyxPost(path string, body map[string]interface{}) (map[string]interface{}, error) {
	jsonBody, _ := json.Marshal(body)
	req, _ := http.NewRequest("POST", telnyxAPI+path, bytes.NewBuffer(jsonBody))
	req.Header.Set("Authorization", "Bearer "+os.Getenv(telnyxKey))
	req.Header.Set("Content-Type", "application/json")

	resp, err := httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var result map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&result)
	return result, nil
}

func handleEvent(eventType string, payload map[string]interface{}) {
	callID, ok := payload["call_control_id"].(string)
	if !ok || callID == "" {
		return
	}

	switch eventType {
	case "call.initiated":
		// FRIC-001: Skip outgoing legs
		if payload["direction"] == "outgoing" {
			log.Printf("Outgoing leg %s — skipping IVR", callID)
			return
		}
		from, _ := payload["from"].(string)
		to, _ := payload["to"].(string)
		log.Printf("Incoming call from %s to %s", from, to)

		storeMutex.Lock()
		callStore[callID] = &CallState{
			CustomerLeg: callID,
			State:       "ringing",
			From:        from,
			To:          to,
		}
		storeMutex.Unlock()

		go telnyxPost("/calls/"+callID+"/actions/answer", map[string]interface{}{})

	case "call.answered":
		storeMutex.RLock()
		call, exists := callStore[callID]
		storeMutex.RUnlock()
		if !exists {
			// Agent leg answered — find customer leg and bridge
			storeMutex.RLock()
			var custID string
			for id, c := range callStore {
				if c.AgentLeg == callID {
					custID = id
					break
				}
			}
			storeMutex.RUnlock()
			if custID != "" {
				go func() {
					_, err := telnyxPost("/calls/"+custID+"/actions/bridge", map[string]interface{}{
						"call_control_id": callID,
					})
					if err != nil {
						// FRIC-004: Retry once for transient 422
						log.Printf("Bridge failed — retrying once: %v", err)
						telnyxPost("/calls/"+custID+"/actions/bridge", map[string]interface{}{
							"call_control_id": callID,
						})
					}
				}()
			}
			return
		}
		if call.State == "answered" {
			return
		}

		storeMutex.Lock()
		call.State = "answered"
		storeMutex.Unlock()

		go telnyxPost("/calls/"+callID+"/actions/gather_using_speak", map[string]interface{}{
			"payload":        "Welcome to the contact center. Press 1 for Sales, 2 for Support, 3 for Billing.",
			"voice":          "female",
			"maximum_digits": 1,
			"timeout_millis":        10000,
		})

	case "call.gather.ended":
		storeMutex.RLock()
		call, exists := callStore[callID]
		storeMutex.RUnlock()
		if !exists {
			return
		}

		// Dedup: reject redelivered gather if agent dial is already in progress
		if call.State == "dialing_agent" || call.State == "bridged" {
			return
		}

		status, _ := payload["status"].(string)
		digits, _ := payload["digits"].(string)
		menu := "Press 1 for Sales, 2 for Support, 3 for Billing."

		if status == "timeout" || digits == "" {
			go telnyxPost("/calls/"+callID+"/actions/gather_using_speak", map[string]interface{}{
				"payload": menu, "voice": "female", "maximum_digits": 1, "timeout_millis": 10000,
			})
			return
		}

		dept, ok := departments[digits]
		if !ok {
			go telnyxPost("/calls/"+callID+"/actions/gather_using_speak", map[string]interface{}{
				"payload": "Invalid selection. " + menu, "voice": "female", "maximum_digits": 1, "timeout_millis": 10000,
			})
			return
		}

		storeMutex.Lock()
		call.Department = dept.Name
		call.State = "dialing_agent"
		storeMutex.Unlock()

		// FRIC-004: Build state before dialing
		go func() {
			res, err := telnyxPost("/calls", map[string]interface{}{
				"connection_id": os.Getenv(ccaID),
				"to":           dept.AgentNumber,
				"from":          call.To,
				"timeout_secs":  30,
			})
			if err != nil {
				log.Printf("Dial agent error: %v", err)
				return
			}
			if data, ok := res["data"].(map[string]interface{}); ok {
				if agentLeg, ok := data["call_control_id"].(string); ok {
					storeMutex.Lock()
					call.AgentLeg = agentLeg
					storeMutex.Unlock()
					log.Printf("Dialing agent for %s: %s", dept.Name, agentLeg)
				}
			}
		}()

	case "call.bridged":
		go telnyxPost("/calls/"+callID+"/actions/record_start", map[string]interface{}{
			"format": "mp3", "channels": "single", "transcription": true,
		})
		storeMutex.Lock()
		if call, ok := callStore[callID]; ok {
			call.State = "bridged"
		}
		storeMutex.Unlock()

	case "call.hangup":
		storeMutex.RLock()
		call, exists := callStore[callID]
		storeMutex.RUnlock()
		// If hangup is from agent leg, find the customer leg
		if !exists {
			storeMutex.RLock()
			for custID, entry := range callStore {
				if entry.AgentLeg == callID {
					callID = custID
					call = entry
					exists = true
					break
				}
			}
			storeMutex.RUnlock()
		}
		if !exists {
			return
		}
		// FRIC-008: Cancel agent leg if still ringing
		if call.AgentLeg != "" && call.AgentLeg != callID && call.State != "bridged" {
			go func() {
				telnyxPost("/calls/"+call.AgentLeg+"/actions/hangup", map[string]interface{}{})
			}()
		}
		if exists {
			storeMutex.Lock()
			call.State = "hungup"
			if dur, ok := payload["duration"].(float64); ok {
				call.Duration = dur
			}
			storeMutex.Unlock()
		}
		log.Printf("Call hung up: %v by %v", payload["hangup_cause"], payload["hangup_source"])

	case "call.recording.saved":
		// FRIC-006: Update retroactively
		storeMutex.Lock()
		if call, ok := callStore[callID]; ok {
			if url, ok := payload["recording_url"].(string); ok {
				call.Recording = url
			}
			call.State = "completed"
			log.Printf("Recording saved: %s", call.Recording)
		}
		storeMutex.Unlock()

	default:
		log.Printf("Unhandled event: %s", eventType)
	}
}

func webhookHandler(w http.ResponseWriter, r *http.Request) {
	body, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, "invalid body", http.StatusBadRequest)
		return
	}

	// Acknowledge after reading the body, then process asynchronously.
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]bool{"ok": true})

	go func() {
		var event WebhookEvent
		if err := json.Unmarshal(body, &event); err != nil {
			log.Printf("Parse error: %v", err)
			return
		}
		handleEvent(event.Data.EventType, event.Data.Payload)
	}()
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "3000"
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/webhook", webhookHandler)
	mux.HandleFunc("/health", healthHandler)

	log.Printf("Contact Center webhook server on :%s", port)
	log.Fatal(http.ListenAndServe(":"+port, mux))
}
```

### Installation (Go)

```bash
# No external dependencies — standard library only
TELNYX_API_KEY=your-key-here \
CALL_CONTROL_APP_ID=your-app-id \
SALES_AGENT_NUMBER=+1XXXXXXXXXX \
SUPPORT_AGENT_NUMBER=+1XXXXXXXXXX \
BILLING_AGENT_NUMBER=+1XXXXXXXXXX \
go run server.go
```
