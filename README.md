# Safe Agentic Stock Trader

An AI agent for tokenized stocks on Base that can only execute after the proposed action passes
intent verification and hard policy checks. The agent proposes, the system decides, the user confirms.

## MVP scope

- Natural-language intent input with examples
- Deterministic intent → structured action parser (optional LLM adapter)
- Strict structured action schema
- Intent ↔ action consistency check (direction, ticker, amount, limit, max loss)
- Four fail-closed hard policies: max position, allowed tickers, direction, max loss
- Field-level provenance for ticker, amount, direction and constraints
- ALLOW / BLOCK decision with unique Decision ID and human-readable reasons
- User confirmation gate; no execution without explicit confirmation
- Demo Mode: full verification flow with simulated execution, no wallet required
- Connect Wallet + live Base execution path (signed in the browser)
- Policy settings, decision history, Intent vs Action comparison UI

## Quick start

```bash
cd sast-app
npm install
npm run dev
```

Open http://localhost:3000.

Checks:

```bash
npm test          # policy engine / scenarios (11 tests)
npm run lint
npm run build
```

## 45–60 second judge demo

1. On the home page, show the active policy: Max $50, Only Long, Max Loss $10, NVDA/TSLA/AAPL.
2. Click **Wrong direction** (a BLOCK scenario). The app returns BLOCK with two reasons and no
   confirmation button.
3. Click **Safe trade** (ALLOW scenario). Show the Decision ID, Intent vs Action table, policy
   checks and provenance.
4. Click **Confirm & Execute**, then **Yes — simulate execution**. Show the transaction hash and
   Decision ID on the execution screen.
5. Explain: without this layer the agent could have moved money on a mismatched intent; with it,
   execution only happens after ALLOW and explicit user confirmation.

All one-click demo scenarios enable Demo Mode automatically. No wallet is needed.

## Live execution on Base

Demo Mode never touches a chain. To enable real execution:

1. Turn Demo Mode off.
2. Connect an injected browser wallet (EIP-1193) and switch to Base.
3. Set a tokenized-stock ERC-20 address:

   ```bash
   NEXT_PUBLIC_TOKENIZED_STOCK_ADDRESS=0x...        # token contract on Base
   NEXT_PUBLIC_TOKEN_DECIMALS=6                     # token base-unit decimals
   ```

4. Confirm an ALLOW decision. The app builds an ERC-20 `transfer(account, amount)` call and asks
   the wallet to sign it. The transaction hash and BaseScan link appear on the execution screen.

Private keys never reach the server. `/api/execute` explicitly rejects live-mode requests; live
transactions are signed in the browser only.

To use Base Sepolia instead, call `executeOnBase(..., 84532)`; the wallet UI will switch/add that
chain. No token address is bundled — configure one for the chain you use.

## Optional LLM adapter

The default agent is deterministic so the demo is repeatable and every field has traceable
provenance. To use an LLM with forced JSON output, set:

```bash
AGENT_LLM_API_KEY=sk-...
AGENT_LLM_BASE_URL=https://api.openai.com/v1   # optional
AGENT_LLM_MODEL=gpt-4o-mini                    # optional
```

Any LLM failure falls back to the deterministic parser. LLM output is still validated by the
identical policy engine and can never bypass a hard rule.

## Verification order

1. Schema & sanity
2. Intent ↔ action consistency
3. Direction policy
4. Allowed tickers
5. Max position size
6. Max loss per trade
7. Provenance confidence

Incomplete or unverifiable data blocks. Every block returns human-readable reasons and rule codes.

## API

- `POST /api/verify` — `{ rawText, policy?, scenario? }` → Decision + policy + engine used
- `POST /api/agent` — `{ rawText, scenario?, deterministic? }` → proposed action + provenance only
- `POST /api/execute` — Demo Mode only; returns a simulated receipt (403 in live mode)

Decisions, policies and receipts are stored in the browser's localStorage, not on a server.

## Known limitations (MVP)

- The structured-action parser is rule-based; ambiguous or heavily paraphrased intents may be
  blocked rather than interpreted. This is intentional fail-closed behavior.
- The LLM adapter is optional; its output is checked by the same hard rules, but the MVP does not
  ship a separate JSON-schema verification dependency.
- Decision IDs are off-chain and not anchored on-chain.
- Live execution requires a real tokenized-stock token address; none is bundled.
