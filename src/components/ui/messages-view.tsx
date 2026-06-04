import { Message, MessageContent } from "./message";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import ContextIndicator from "./context-indicator";
import { useEffect, useRef } from "react";
import FunctionCallIndicator from "./function-call-indicator";

interface ContextUsed {
  document_name: string;
  category: string;
  chunk_index: number;
  content: string;
}

interface ChatMessage {
  role: "user" | "agent";
  content: string;
  contextUsed?: ContextUsed[];
  functionCalls?: FunctionCall[];
}

interface FunctionCall {
  name: string;
  arguments: Record<string, unknown>;
}

const extractJsonObject = (value: string): Record<string, unknown> | null => {
  const trimmed = value.trim();
  const withoutFence = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  const startIndex = withoutFence.indexOf("{");
  if (startIndex === -1) return null;

  let inString = false;
  let escapeNext = false;
  let depth = 0;

  for (let index = startIndex; index < withoutFence.length; index += 1) {
    const char = withoutFence[index];
    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    if (char === "\\") {
      escapeNext = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        try {
          const parsed = JSON.parse(withoutFence.slice(startIndex, index + 1));
          return parsed && typeof parsed === "object" && !Array.isArray(parsed)
            ? parsed
            : null;
        } catch {
          return null;
        }
      }
    }
  }

  return null;
};

const normalizeAgentMessageForDisplay = (message: ChatMessage) => {
  const parsed = extractJsonObject(message.content);
  if (!parsed || typeof parsed.message !== "string") {
    return {
      content: message.content,
      functionCalls: message.functionCalls || [],
    };
  }

  const parsedFunctionCalls = Array.isArray(parsed.functions)
    ? (parsed.functions as FunctionCall[])
    : [];

  return {
    content: parsed.message,
    functionCalls:
      message.functionCalls && message.functionCalls.length > 0
        ? message.functionCalls
        : parsedFunctionCalls,
  };
};

type Props = {
  messages: ChatMessage[];
  agentName?: string;
  isLoading: boolean;
};

export default function MessagesView({
  messages,
  agentName,
  isLoading,
}: Props) {
  const mask =
    "linear-gradient(to bottom, transparent 0, black 5rem, black calc(100% - 0.5rem), transparent 100%)";

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const userScrolledRef = useRef(false);

  // Check if user is scrolled to bottom
  const isScrolledToBottom = () => {
    const container = scrollContainerRef.current;
    if (!container) return true;

    const threshold = 50; // pixels from bottom to consider "at bottom"
    const scrollTop = container.scrollTop;
    const scrollHeight = container.scrollHeight;
    const clientHeight = container.clientHeight;

    return scrollHeight - scrollTop - clientHeight < threshold;
  };

  // Handle scroll events to track if user manually scrolled
  const handleScroll = () => {
    userScrolledRef.current = !isScrolledToBottom();
  };

  // Auto-scroll when messages change, but only if user was at bottom
  useEffect(() => {
    if (!userScrolledRef.current || isScrolledToBottom()) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      userScrolledRef.current = false;
    }
  }, [messages, isLoading]);

  return (
    <div
      ref={scrollContainerRef}
      onScroll={handleScroll}
      className="flex h-full w-full flex-1 justify-center overflow-y-scroll"
      style={{ WebkitMaskImage: mask, maskImage: mask }}
    >
      <div className="flex h-full w-[75vw] flex-col space-y-2 p-4 pt-20">
        {messages.map((msg, i) =>
          msg.role === "agent" ? (
            agentMessage(agentName, msg, i)
          ) : (
            <div key={i} className="markdown-content">
              <Message from={"user"}>
                <MessageContent className="border">
                  {msg.content}
                </MessageContent>
              </Message>
            </div>
          )
        )}
        {isLoading &&
          agentMessage(
            agentName,
            { role: "agent", content: "" },
            undefined,
            <div
              className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-transparent"
              aria-label="Loading"
            />
          )}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}

function agentMessage(
  agentName: string | undefined,
  message: ChatMessage,
  key?: number,
  customContent?: React.ReactNode
) {
  const normalizedMessage = normalizeAgentMessageForDisplay(message);
  const displayContent = customContent || normalizedMessage.content;
  const functionCalls = normalizedMessage.functionCalls;

  return (
    <Message from={"assistant"} key={key}>
      <div className="flex flex-col">
        {agentName && (
          <div className="mb-1 text-xs text-gray-500">{agentName}</div>
        )}
        <MessageContent className="border-1 border-gray-300">
          {typeof displayContent === "string" ? (
            <>
              <div className="markdown-content">
                <ReactMarkdown
                  rehypePlugins={[rehypeSanitize]}
                  remarkPlugins={[remarkGfm]}
                >
                  {displayContent}
                </ReactMarkdown>
              </div>
              {message.contextUsed && message.contextUsed.length > 0 && (
                <ContextIndicator contexts={message.contextUsed} />
              )}
              {functionCalls && functionCalls.length > 0 && (
                <FunctionCallIndicator functionCalls={functionCalls} />
              )}
            </>
          ) : (
            displayContent
          )}
        </MessageContent>
      </div>
    </Message>
  );
}
