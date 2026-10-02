/**
 * Entry point and demonstration scenarios for the Sticker Mule Agent.
 * Runs 3 clear, educational scenarios exhibiting:
 *  1. Single-step status lookup
 *  2. Multi-step chaining (lookup by email -> retrieve order details)
 *  3. Tool argument validation failure handling
 */

import { Agent, RuleBasedPlanner } from "./agent.js";
import { TOOL_REGISTRY } from "./tools.js";
import { AgentRunResult } from "./types.js";

function printScenarioResult(title: string, userPrompt: string, result: AgentRunResult): void {
  console.log("================================================================================");
  console.log(`📌 SCENARIO: ${title}`);
  console.log(`💬 Customer Request: "${userPrompt}"`);
  console.log("--------------------------------------------------------------------------------");
  console.log("⚙️  Execution Flow:");

  result.steps.forEach((step) => {
    if (step.action.type === "tool_call") {
      console.log(`   Step ${step.stepNumber}: [Tool Call] -> ${step.action.toolName}`);
      console.log(`           Arguments: ${JSON.stringify(step.action.args)}`);
      if (step.validationError) {
        console.log(`           ❌ Validation Error: ${step.validationError}`);
      } else if (step.observation) {
        const obsStatus = step.observation.success ? "Success" : "Failed";
        console.log(`           ✅ Result (${obsStatus}): ${JSON.stringify(step.observation.data ?? step.observation.error)}`);
      }
    } else if (step.action.type === "final_response") {
      console.log(`   Step ${step.stepNumber}: [Final Response] Produced answer.`);
    }
  });

  console.log("--------------------------------------------------------------------------------");
  console.log(`🤖 Agent Response:`);
  console.log(`   "${result.finalResponse}"`);
  console.log("================================================================================\n");
}

async function main(): Promise<void> {
  console.log("\n================================================================================");
  console.log(" 📦 STICKER MULE AI AGENT ARCHITECTURE DEMO");
  console.log(" Note: Uses simulated/mock data for portfolio illustration.");
  console.log("================================================================================\n");

  const agent = new Agent({
    planner: new RuleBasedPlanner(),
    tools: Object.values(TOOL_REGISTRY),
    maxSteps: 5,
  });

  // Scenario 1: Direct production status query
  const scenario1Prompt = "Hi, what's the current production status of my sticker order SM-84920? Has it shipped?";
  const result1 = await agent.run(scenario1Prompt);
  printScenarioResult("Scenario 1: Single-Step Tool Execution (Production Status)", scenario1Prompt, result1);

  // Scenario 2: Multi-step chaining (Find orders by email -> Fetch details for order)
  const scenario2Prompt = "I placed an order under jane@example.com yesterday but lost the confirmation email. Can you check my order?";
  const result2 = await agent.run(scenario2Prompt);
  printScenarioResult("Scenario 2: Multi-Step Execution (getCustomerOrders -> getOrderDetails)", scenario2Prompt, result2);

  // Scenario 3: Validation error handling on malformed order ID
  const scenario3Prompt = "Can you check order ABC?";
  const result3 = await agent.run(scenario3Prompt);
  printScenarioResult("Scenario 3: Tool Argument Validation & Error Recovery", scenario3Prompt, result3);
}

main().catch((err) => {
  console.error("Execution error:", err);
  process.exit(1);
});
