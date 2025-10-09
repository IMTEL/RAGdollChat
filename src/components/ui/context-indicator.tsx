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
        className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-700 transition-colors w-full"
      >
        <FileText className="w-3 h-3" />
        <span>
          {contexts.length} source{contexts.length > 1 ? "s" : ""} referenced
        </span>
        {isExpanded ? (
          <ChevronUp className="w-3 h-3 ml-auto" />
        ) : (
          <ChevronDown className="w-3 h-3 ml-auto" />
        )}
      </button>

      {isExpanded && (
        <div className="mt-2 space-y-2">
          {contexts.map((ctx, idx) => (
            <div
              key={idx}
              className="bg-gray-50 rounded-md p-2 text-xs border border-gray-200"
            >
              <div className="flex items-start justify-between mb-1">
                <div className="font-medium text-gray-700 flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  {ctx.document_name}
                </div>
                <div className="text-gray-500 text-[10px]">
                  {ctx.category} • Chunk {ctx.chunk_index}
                </div>
              </div>
              <div className="text-gray-600 mt-1 max-h-32 overflow-y-auto text-[11px] leading-relaxed">
                {ctx.content}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
