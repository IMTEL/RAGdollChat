import { Message, MessageContent } from "./message";

type Props = {
    messages: string[];
    agentName?: string;
};


export default function MessagesView({ messages, agentName }: Props) {
    const mask = 'linear-gradient(to bottom, transparent 0, black 5rem, black calc(100% - 0.5rem), transparent 100%)';

    return (
        <div
            className="flex-1 overflow-y-scroll w-full flex justify-center h-full"
            style={{ WebkitMaskImage: mask, maskImage: mask }}
        >
            <div className="flex flex-col space-y-2 p-4 pt-20 w-[75vw] h-full">
                {messages.map((msg, i) => (
                    i % 2 !== 0 ? 
                    <Message key={i} from={"user"}>
                        <MessageContent className="border">{msg}</MessageContent>
                    </Message>
                    : (
                    <Message key={i} from={"assistant"}>
                        <div className="flex flex-col">
                            {agentName && (
                                <div className="text-xs text-gray-500 mb-1">{agentName}</div>
                            )}
                            <MessageContent className="border-gray-300 border-1">{msg}</MessageContent>
                        </div>
                    </Message>
                    )
                ))}
            </div>
        </div>
    );
}