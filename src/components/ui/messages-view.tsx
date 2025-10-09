import { Message, MessageContent } from "./message";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import ContextIndicator from "./context-indicator";

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

  return (
    <div
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
