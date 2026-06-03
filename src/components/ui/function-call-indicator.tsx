"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Wrench } from "lucide-react";

interface FunctionCall {
  name: string;
  arguments: Record<string, unknown>;
}

interface FunctionCallIndicatorProps {
  functionCalls: FunctionCall[];
}

export default function FunctionCallIndicator({
  functionCalls,
}: FunctionCallIndicatorProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!functionCalls || functionCalls.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 border-t border-gray-200 pt-2">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full cursor-pointer items-center gap-2 text-xs text-gray-500 transition-colors hover:text-gray-700"
      >
        <Wrench className="h-3 w-3" />
        <span>
          {functionCalls.length} function
          {functionCalls.length > 1 ? "s" : ""} requested
        </span>
        {isExpanded ? (
          <ChevronUp className="ml-auto h-3 w-3" />
        ) : (
          <ChevronDown className="ml-auto h-3 w-3" />
        )}
      </button>

      {isExpanded && (
        <div className="mt-2 space-y-2">
          {functionCalls.map((functionCall, index) => (
            <div
              key={`${functionCall.name}-${index}`}
              className="rounded-md border border-gray-200 bg-gray-50 p-2 text-xs"
            >
              <div className="mb-1 flex items-center gap-1 font-medium text-gray-700">
                <Wrench className="h-3 w-3" />
                {functionCall.name}
              </div>
              <pre className="mt-1 max-h-32 overflow-y-auto rounded bg-white p-2 text-[11px] leading-relaxed text-gray-600">
                {JSON.stringify(functionCall.arguments || {}, null, 2)}
              </pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
