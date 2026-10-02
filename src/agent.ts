/**
 * Core Agent implementation.
 *
 * Implements the cycle:
 * request -> planner -> tool selection -> argument validation -> tool execution -> observation -> next action/final response.
 *
 * Exposes a pluggable Planner interface so that the deterministic RuleBasedPlanner
 * can be replaced by an LLM (e.g. OpenAI, Anthropic, Gemini) with zero changes to the loop.
 */

import {
  Message,
  ToolDefinition,
  Planner,
  AgentDecision,
  AgentRunResult,
  AgentExecutionStep,
  AnyTool,
} from "./types.js";
import { OrderRecord, ProductionTrackingRecord } from "./mockData.js";

/**
 * Deterministic RuleBasedPlanner.
 * Uses the initial customer request plus subsequent tool observations to plan
 * actions for this deterministic demonstration without requiring an API key.
 * Serves as an educational, zero-API-key placeholder for a real LLM.
 */
export class RuleBasedPlanner implements Planner {
  async plan(history: Message[], _tools: ToolDefinition[]): Promise<AgentDecision> {
    const userMessage = history.find((m) => m.role === "user")?.content ?? "";
    const toolMessages = history.filter((m) => m.role === "tool");

    // Case 1: Prior tool call yielded a result, decide whether next step or final answer is needed
    if (toolMessages.length > 0) {
      const lastToolMsg = toolMessages[toolMessages.length - 1];

      // If we just fetched customer orders by email, chain into fetching details for the discovered order
      if (lastToolMsg.name === "getCustomerOrders") {
        try {
          const parsed = JSON.parse(lastToolMsg.content);
          if (parsed.success && Array.isArray(parsed.data?.orderIds) && parsed.data.orderIds.length > 0) {
            const firstOrderId = parsed.data.orderIds[0];
            return {
              type: "tool_call",
              toolName: "getOrderDetails",
              args: { orderId: firstOrderId },
            };
          } else {
            return {
              type: "final_response",
              message: `I looked up orders associated with ${parsed.data?.customerEmail ?? "your email"}, but found no matching records in our system. Please verify the email or contact support.`,
            };
          }
        } catch {
          return {
            type: "final_response",
            message: "Unable to parse order lookup response.",
          };
        }
      }

      // If we just got production status
      if (lastToolMsg.name === "getProductionStatus") {
        try {
          const parsed = JSON.parse(lastToolMsg.content);
          if (parsed.success && parsed.data) {
            const record = parsed.data as ProductionTrackingRecord;
            return {
              type: "final_response",
              message: `Order ${record.orderId} is currently in the '${record.currentStage}' stage. ${record.notes} Estimated ship date: ${record.estimatedShipDate}.`,
            };
          } else {
            return {
              type: "final_response",
              message: `I couldn't retrieve production status: ${parsed.error ?? "Record not found"}.`,
            };
          }
        } catch {
          return {
            type: "final_response",
            message: "Encountered an issue processing production tracking details.",
          };
        }
      }

      // If we just got order details
      if (lastToolMsg.name === "getOrderDetails") {
        try {
          const parsed = JSON.parse(lastToolMsg.content);
          if (parsed.success && parsed.data) {
            const order = parsed.data as OrderRecord;
            const itemSummary = order.items
              .map((item) => `${item.quantity}x ${item.name} (${item.size})`)
              .join(", ");
            return {
              type: "final_response",
              message: `Found order ${order.orderId} for ${order.customerName}: contains ${itemSummary}. Total: $${order.total.toFixed(2)}. Status: ${order.status.replace("_", " ")}.`,
            };
          } else {
            return {
              type: "final_response",
              message: `I couldn't find order details: ${parsed.error ?? "Order not found"}.`,
            };
          }
        } catch {
          return {
            type: "final_response",
            message: "Encountered an issue processing order details.",
          };
        }
      }
    }

    // Case 2: Initial user message routing
    // Check if an order ID like SM-12345 is mentioned
    const orderIdMatch = userMessage.match(/\bSM-\d{5}\b/i);
    // Check if an invalid order token is provided (e.g., "order ABC")
    const invalidOrderMatch = userMessage.match(/\border\s+([A-Za-z0-9-]+)\b/i);

    // Check if email is mentioned
    const emailMatch = userMessage.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);

    // Intent: Production status / shipping / tracking
    const isStatusIntent = /status|shipped|tracking|production|proof/i.test(userMessage);

    if (orderIdMatch) {
      const orderId = orderIdMatch[0].toUpperCase();
      if (isStatusIntent) {
        return {
          type: "tool_call",
          toolName: "getProductionStatus",
          args: { orderId },
        };
      } else {
        return {
          type: "tool_call",
          toolName: "getOrderDetails",
          args: { orderId },
        };
      }
    }

    // If an invalid order token was provided (demonstrating validation error handling)
    if (invalidOrderMatch && !emailMatch) {
      const token = invalidOrderMatch[1];
      return {
        type: "tool_call",
        toolName: "getOrderDetails",
        args: { orderId: token },
      };
    }

    // Email lookup intent
    if (emailMatch) {
      return {
        type: "tool_call",
        toolName: "getCustomerOrders",
        args: { customerEmail: emailMatch[0] },
      };
    }

    // Default response if no recognized pattern
    return {
      type: "final_response",
      message: "I can help you check order status, look up order details, or find orders by email. Please provide your order number (e.g., SM-84920) or email address.",
    };
  }
}

/**
 * Agent orchestrator.
 */
export class Agent {
  private planner: Planner;
  private tools: Map<string, AnyTool>;
  private toolDefinitions: ToolDefinition[];
  private maxSteps: number;

  constructor(options: {
    planner: Planner;
    tools: AnyTool[];
    maxSteps?: number;
  }) {
    this.planner = options.planner;
    this.tools = new Map(options.tools.map((t) => [t.definition.name, t]));
    this.toolDefinitions = options.tools.map((t) => t.definition);
    this.maxSteps = options.maxSteps ?? 5;
  }

  async run(customerRequest: string): Promise<AgentRunResult> {
    const history: Message[] = [{ role: "user", content: customerRequest }];
    const steps: AgentExecutionStep[] = [];

    for (let stepCount = 1; stepCount <= this.maxSteps; stepCount++) {
      // 1. Planner decides the next action based on conversation history
      const decision = await this.planner.plan(history, this.toolDefinitions);

      // 2. Final response path: termination of loop
      if (decision.type === "final_response") {
        steps.push({
          stepNumber: stepCount,
          action: decision,
        });
        return {
          finalResponse: decision.message,
          steps,
        };
      }

      // 3. Tool execution path
      if (decision.type === "tool_call") {
        const tool = this.tools.get(decision.toolName);

        if (!tool) {
          const errorMsg = `Tool '${decision.toolName}' is not registered.`;
          steps.push({
            stepNumber: stepCount,
            action: decision,
            validationError: errorMsg,
          });
          history.push({
            role: "tool",
            name: decision.toolName,
            content: JSON.stringify({ success: false, error: errorMsg }),
          });
          continue;
        }

        // 4. Validate tool arguments before executing
        const validation = tool.validateArgs(decision.args);
        if (!validation.isValid) {
          const validationError = validation.error ?? "Invalid tool arguments.";
          steps.push({
            stepNumber: stepCount,
            action: decision,
            validationError,
          });
          // Inform the planner of the validation failure so it can respond or adapt
          history.push({
            role: "tool",
            name: decision.toolName,
            content: JSON.stringify({ success: false, error: validationError }),
          });
          continue;
        }

        // 5. Execute tool with validated arguments
        const observation = await tool.execute(validation.data);

        steps.push({
          stepNumber: stepCount,
          action: decision,
          observation,
        });

        // 6. Record observation into history for next reasoning step
        history.push({
          role: "tool",
          name: decision.toolName,
          content: JSON.stringify(observation),
        });
      }
    }

    // Fallback if maxSteps reached
    const fallbackResponse = "I have reached the maximum number of reasoning steps without a final answer.";
    return {
      finalResponse: fallbackResponse,
      steps,
    };
  }
}
