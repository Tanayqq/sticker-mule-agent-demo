/**
 * Core type definitions for the agent architecture.
 * Designed to mirror standard LLM tool-calling conventions (OpenAI/Anthropic tool schemas).
 */

export interface ToolParameterSchema {
  type: string;
  description: string;
  required?: boolean;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, ToolParameterSchema>;
    required: string[];
  };
}

export interface ValidationResult<T = unknown> {
  isValid: boolean;
  data?: T;
  error?: string;
}

export interface ToolExecutionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface Tool<TArgs = Record<string, unknown>, TResult = unknown> {
  definition: ToolDefinition;
  validateArgs: (rawArgs: Record<string, unknown>) => ValidationResult<TArgs>;
  execute: (args: TArgs) => Promise<ToolExecutionResult<TResult>>;
}

/**
 * Type alias for heterogeneous collections of tools (e.g. registries or agent options).
 */
export type AnyTool = Tool<any, unknown>;

export type Role = "user" | "assistant" | "tool";

export interface Message {
  role: Role;
  content: string;
  name?: string; // For tool responses
}

export interface ToolCallAction {
  type: "tool_call";
  toolName: string;
  args: Record<string, unknown>;
}

export interface FinalResponseAction {
  type: "final_response";
  message: string;
}

export type AgentDecision = ToolCallAction | FinalResponseAction;

/**
 * Pluggable Planner abstraction.
 * To integrate a real LLM (OpenAI, Anthropic, Gemini, etc.), implement this interface.
 */
export interface Planner {
  plan(history: Message[], tools: ToolDefinition[]): Promise<AgentDecision>;
}

export interface AgentExecutionStep {
  stepNumber: number;
  action: AgentDecision;
  validationError?: string;
  observation?: ToolExecutionResult;
}

export interface AgentRunResult {
  finalResponse: string;
  steps: AgentExecutionStep[];
}
