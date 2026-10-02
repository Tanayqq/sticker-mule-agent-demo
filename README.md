# Sticker Mule AI Agent Demo (`sticker-mule-agent-demo`)

> **Portfolio Code Sample Notice**: This project is an educational, dependency-light portfolio demonstration built for an AI Agent Engineer application. It illustrates tool selection, parameter validation, multi-step orchestration, and structured final-response generation using TypeScript and simulated/mock data. It is **not** an autonomous production system and does not connect to live production APIs, databases, or third-party services.

---

## 1. What This Project Demonstrates

Custom manufacturing and e-commerce companies like **Sticker Mule** handle high volumes of customer inquiries spanning proof approvals, artwork setup, laser die-cutting, packaging, and shipping estimates.

This project demonstrates a clean, robust AI-agent architecture designed to process customer inquiries reliably:
- **Declarative Tool Definitions**: Standardized tool contracts matching production function-calling standards (OpenAI, Anthropic, Gemini).
- **Strict Parameter Validation**: Defense-in-depth verification before running any tool action to catch malformed inputs early.
- **Deterministic Multi-Step Agent Loop**: A step-by-step cycle that allows multi-hop task execution (e.g., finding order IDs from a customer email, then querying order items).
- **Pluggable Planner Interface**: Decouples the reasoning engine from execution. The deterministic `RuleBasedPlanner` is intentionally used so that the repository runs out-of-the-box without requiring an API key, while allowing an LLM provider to be plugged in later with zero changes to the loop or tools.
- **Zero Framework Bloat**: Pure TypeScript with standard Node.js libraries—no LangChain, no vector databases, no external network calls required.

---

## 2. Agent & Tool Architecture

```text
Customer Request
       │
       ▼
┌──────────────┐
│ Agent Loop   │ ◄──────────────────────────────┐
└──────┬───────┘                                │
       │ (1. Conversation History & Tool Schemas)│
       ▼                                        │
┌──────────────┐                                │
│   Planner    │                                │
└──────┬───────┘                                │
       │ (2. Next Action: Tool Call or Final)   │
       ├───► [Final Response] ──────────────────┼──► User Response
       │                                        │
       ▼ (3. Tool Call selected)                │
┌───────────────────────┐                       │
│ Parameter Validation  │───► [Invalid Args] ───┘ (Feedback error)
└──────┬────────────────┘
       │ (4. Valid Args)
       ▼
┌───────────────────────┐
│ Mock Tool Execution   │
└──────┬────────────────┘
       │ (5. Observation returned)
       └────────────────────────────────────────┘
```

### Key Components

- **`src/types.ts`**: Defines core contracts: `Tool`, `ToolDefinition`, `ValidationResult`, `Message`, and the `Planner` interface.
- **`src/tools.ts`**: Domain-specific tools implementing parameter schemas and strict validation against simulated data:
  - `getOrderDetails`: Fetches simulated items, sizes, quantities, and totals.
  - `getProductionStatus`: Fetches simulated factory stage (proof review, die-cutting, packaging, carrier transit).
  - `getCustomerOrders`: Looks up order IDs by customer email address from mock records.
- **`src/agent.ts`**:
  - `RuleBasedPlanner`: A deterministic planner matching intent and extracting slots from initial user requests and tool observations.
  - `Agent`: Orchestrates the execution loop, manages conversation history, validates arguments, invokes tools, and stops on completion or max step count.
- **`src/mockData.ts`**: Deterministic fixtures representing simulated customer orders and factory statuses.
- **`src/index.ts`**: Runs 3 realistic end-to-end customer interaction scenarios.

---

## 3. Why This Architecture Matters in Customer/Order Operations

1. **Safety & Predictability**: In order operations, agents must not guess or hallucinate order states or tracking numbers. Strict schemas and validation guarantee tools only execute with well-formed identifiers (e.g. `SM-XXXXX`).
2. **Context Continuity Across Steps**: Customers rarely provide all details upfront. A customer saying *"What's the status of the order under my email jane@example.com?"* cannot be resolved in a single lookup. The agent must orchestrate a sequence: first resolve the identity to an order ID, and then query the details.
3. **Auditability & Observability**: Every tool call, argument, validation check, and observation is recorded as an explicit step rather than buried inside opaque abstractions.
4. **Gradual LLM Adoption**: By isolating reasoning inside `Planner.plan(history, tools)`, an engineering team can write unit tests with `RuleBasedPlanner` first, and safely plug in an LLM provider when ready.

---

## 4. Multi-Step Orchestration (`getCustomerOrders` → `getOrderDetails`)

A single tool call is often insufficient for realistic customer operations. When a customer asks about their order using only an email address:
1. **Step 1**: The agent invokes `getCustomerOrders({ customerEmail: "jane@example.com" })`.
2. **Step 2**: The tool returns an observation containing the matched order identifier (`SM-91204`).
3. **Step 3**: The agent receives this observation into its history, determines that order items have not yet been retrieved, and plans a follow-up action: `getOrderDetails({ orderId: "SM-91204" })`.
4. **Step 4**: With the full itemized details available, the agent formulates a complete, structured final response for the customer.

This highlights true agent orchestration: dynamic decision-making conditioned on intermediate tool results rather than hardcoded monolithic scripts.

---

## 5. How to Install & Run

### Prerequisites
- Node.js (v18+ recommended; tested on v22)
- npm

### Installation
Clone or navigate to the repository directory and install the dev dependencies (`tsx` and `typescript`):

```bash
npm install
```

### Running the Demo

Run the interactive scenarios via `tsx`:

```bash
npm start
```

Or build and run the compiled JavaScript:

```bash
npm run build
npm run start:compiled
```

---

## 6. Example Interaction Output

```text
================================================================================
📌 SCENARIO: Scenario 2: Multi-Step Execution (getCustomerOrders -> getOrderDetails)
💬 Customer Request: "I placed an order under jane@example.com yesterday but lost the confirmation email. Can you check my order?"
--------------------------------------------------------------------------------
⚙️  Execution Flow:
   Step 1: [Tool Call] -> getCustomerOrders
           Arguments: {"customerEmail":"jane@example.com"}
           ✅ Result (Success): {"customerEmail":"jane@example.com","orderIds":["SM-91204"]}
   Step 2: [Tool Call] -> getOrderDetails
           Arguments: {"orderId":"SM-91204"}
           ✅ Result (Success): {"orderId":"SM-91204","customerEmail":"jane@example.com", ...}
   Step 3: [Final Response] Produced answer.
--------------------------------------------------------------------------------
🤖 Agent Response:
   "Found order SM-91204 for Jane Doe: contains 50x Custom Poly Mailers (10" x 13"), 2x Custom Packaging Tape (300 ft roll). Total: $145.00. Status: proof review."
================================================================================
```

---

## 7. Current Limitations

- **Deterministic Planner**: Uses a deterministic `RuleBasedPlanner` rather than a live LLM model so that anyone can clone and run the repository without an API key or billing setup.
- **Simulated / Mock Data**: All customer orders and factory statuses are stored in deterministic mock fixtures; there are no live Sticker Mule integrations or production database connections.
- **First-Match Order Selection**: When multiple orders are found under an account in the demo, the planner currently selects the first order ID for inspection rather than prompting for disambiguation.
- **Stateless Execution**: Each scenario runs in a fresh agent instance; persistent session storage across multiple turns is omitted to keep the code sample focused and easy to audit.
