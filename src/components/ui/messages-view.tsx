import { Message, MessageContent } from "./message";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import ContextIndicator from "./context-indicator";
import { useEffect, useRef } from "react";

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
}

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
      className="flex-1 overflow-y-scroll w-full flex justify-center h-full"
      style={{ WebkitMaskImage: mask, maskImage: mask }}
    >
      <div className="flex flex-col space-y-2 p-4 pt-20 w-[75vw] h-full">
        {messages.map((msg, i) =>
          msg.role === "agent" ? (
            agentMessage(agentName, msg, i)
          ) : (
            <div key={i} className="markdown-content">
              <Message from={"user"}>
                <MessageContent className="border">{msg.content}</MessageContent>
              </Message>
            </div>
          ),
        )}
        {isLoading &&
          agentMessage(
            agentName,
            { role: "agent", content: "" },
            undefined,
            <div
              className="h-5 w-5 border-2 border-gray-300 border-t-transparent rounded-full animate-spin"
              aria-label="Loading"
            />,
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
  customContent?: React.ReactNode,
) {
  const displayContent = customContent || message.content;
  
  return (
    <Message from={"assistant"} key={key}>
      <div className="flex flex-col">
        {agentName && (
          <div className="text-xs text-gray-500 mb-1">{agentName}</div>
        )}
        <MessageContent className="border-gray-300 border-1">
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
            </>
          ) : (
            displayContent
          )}
        </MessageContent>
      </div>
    </Message>
  );
}
