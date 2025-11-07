"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, FileText } from "lucide-react";

interface ContextUsed {
  document_name: string;
  category: string;
  chunk_index: number;
  content: string;
}

interface ContextIndicatorProps {
  contexts: ContextUsed[];
}

export default function ContextIndicator({ contexts }: ContextIndicatorProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!contexts || contexts.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 border-t border-gray-200 pt-2">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center gap-2 text-xs text-gray-500 transition-colors hover:text-gray-700"
      >
        <FileText className="h-3 w-3" />
        <span>
          {contexts.length} source{contexts.length > 1 ? "s" : ""} referenced
        </span>
        {isExpanded ? (
          <ChevronUp className="ml-auto h-3 w-3" />
        ) : (
          <ChevronDown className="ml-auto h-3 w-3" />
        )}
      </button>

      {isExpanded && (
        <div className="mt-2 space-y-2">
          {contexts.map((ctx, idx) => (
            <div
              key={idx}
              className="rounded-md border border-gray-200 bg-gray-50 p-2 text-xs"
            >
              <div className="mb-1 flex items-start justify-between">
                <div className="flex items-center gap-1 font-medium text-gray-700">
                  <FileText className="h-3 w-3" />
                  {ctx.document_name}
                </div>
                <div className="text-[10px] text-gray-500">
                  {ctx.category} • Chunk {ctx.chunk_index}
                </div>
              </div>
              <div className="mt-1 max-h-32 overflow-y-auto text-[11px] leading-relaxed text-gray-600">
                {ctx.content}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
