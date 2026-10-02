/**
 * Domain tools for Sticker Mule-style order operations.
 * Each tool implements strict parameter validation and execution against mock data.
 */

import { Tool, ToolDefinition, ValidationResult, ToolExecutionResult, AnyTool } from "./types.js";
import { MOCK_ORDERS, MOCK_PRODUCTION_STATUSES, OrderRecord, ProductionTrackingRecord } from "./mockData.js";

// Helper regex to validate Sticker Mule order ID format (e.g. SM-12345)
const ORDER_ID_REGEX = /^SM-\d{5}$/i;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// 1. Tool: getOrderDetails
interface GetOrderDetailsArgs {
  orderId: string;
}

const getOrderDetailsDefinition: ToolDefinition = {
  name: "getOrderDetails",
  description: "Retrieves simulated order metadata, line items (e.g., custom stickers, mailers), quantities, totals, and recipient info from mock store.",
  parameters: {
    type: "object",
    properties: {
      orderId: {
        type: "string",
        description: "The unique order identifier in the format 'SM-XXXXX' (e.g. SM-84920).",
      },
    },
    required: ["orderId"],
  },
};

export const getOrderDetailsTool: Tool<GetOrderDetailsArgs, OrderRecord> = {
  definition: getOrderDetailsDefinition,
  validateArgs: (rawArgs: Record<string, unknown>): ValidationResult<GetOrderDetailsArgs> => {
    const orderId = rawArgs["orderId"];
    if (typeof orderId !== "string" || !orderId.trim()) {
      return { isValid: false, error: "Argument 'orderId' is required and must be a non-empty string." };
    }
    const normalized = orderId.trim().toUpperCase();
    if (!ORDER_ID_REGEX.test(normalized)) {
      return { isValid: false, error: `Invalid orderId format '${orderId}'. Expected format like 'SM-12345'.` };
    }
    return { isValid: true, data: { orderId: normalized } };
  },
  execute: async ({ orderId }: GetOrderDetailsArgs): Promise<ToolExecutionResult<OrderRecord>> => {
    const order = MOCK_ORDERS[orderId];
    if (!order) {
      return {
        success: false,
        error: `Order with ID '${orderId}' not found in mock store.`,
      };
    }
    return {
      success: true,
      data: order,
    };
  },
};

// 2. Tool: getProductionStatus
interface GetProductionStatusArgs {
  orderId: string;
}

const getProductionStatusDefinition: ToolDefinition = {
  name: "getProductionStatus",
  description: "Retrieves simulated factory and proof review status (proof approval, printing, die-cutting, packaging, carrier transit).",
  parameters: {
    type: "object",
    properties: {
      orderId: {
        type: "string",
        description: "The unique order identifier in the format 'SM-XXXXX' (e.g. SM-84920).",
      },
    },
    required: ["orderId"],
  },
};

export const getProductionStatusTool: Tool<GetProductionStatusArgs, ProductionTrackingRecord> = {
  definition: getProductionStatusDefinition,
  validateArgs: (rawArgs: Record<string, unknown>): ValidationResult<GetProductionStatusArgs> => {
    const orderId = rawArgs["orderId"];
    if (typeof orderId !== "string" || !orderId.trim()) {
      return { isValid: false, error: "Argument 'orderId' is required and must be a non-empty string." };
    }
    const normalized = orderId.trim().toUpperCase();
    if (!ORDER_ID_REGEX.test(normalized)) {
      return { isValid: false, error: `Invalid orderId format '${orderId}'. Expected format like 'SM-12345'.` };
    }
    return { isValid: true, data: { orderId: normalized } };
  },
  execute: async ({ orderId }: GetProductionStatusArgs): Promise<ToolExecutionResult<ProductionTrackingRecord>> => {
    const status = MOCK_PRODUCTION_STATUSES[orderId];
    if (!status) {
      return {
        success: false,
        error: `Production record for '${orderId}' not found in simulated tracking.`,
      };
    }
    return {
      success: true,
      data: status,
    };
  },
};

// 3. Tool: getCustomerOrders
interface GetCustomerOrdersArgs {
  customerEmail: string;
}

interface CustomerOrdersResult {
  customerEmail: string;
  orderIds: string[];
}

const getCustomerOrdersDefinition: ToolDefinition = {
  name: "getCustomerOrders",
  description: "Finds all active order IDs associated with a customer's email address from simulated mock records.",
  parameters: {
    type: "object",
    properties: {
      customerEmail: {
        type: "string",
        description: "The customer's email address used during checkout.",
      },
    },
    required: ["customerEmail"],
  },
};

export const getCustomerOrdersTool: Tool<GetCustomerOrdersArgs, CustomerOrdersResult> = {
  definition: getCustomerOrdersDefinition,
  validateArgs: (rawArgs: Record<string, unknown>): ValidationResult<GetCustomerOrdersArgs> => {
    const email = rawArgs["customerEmail"];
    if (typeof email !== "string" || !email.trim()) {
      return { isValid: false, error: "Argument 'customerEmail' is required and must be a string." };
    }
    const normalized = email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(normalized)) {
      return { isValid: false, error: `Invalid email address format: '${email}'.` };
    }
    return { isValid: true, data: { customerEmail: normalized } };
  },
  execute: async ({ customerEmail }: GetCustomerOrdersArgs): Promise<ToolExecutionResult<CustomerOrdersResult>> => {
    const matchedOrders = Object.values(MOCK_ORDERS).filter(
      (order) => order.customerEmail.toLowerCase() === customerEmail
    );

    return {
      success: true,
      data: {
        customerEmail,
        orderIds: matchedOrders.map((o) => o.orderId),
      },
    };
  },
};

// Tool Registry
export const TOOL_REGISTRY: Record<string, AnyTool> = {
  getOrderDetails: getOrderDetailsTool,
  getProductionStatus: getProductionStatusTool,
  getCustomerOrders: getCustomerOrdersTool,
};

export const TOOL_DEFINITIONS: ToolDefinition[] = Object.values(TOOL_REGISTRY).map(
  (tool) => tool.definition
);
