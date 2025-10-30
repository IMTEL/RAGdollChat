"use client";

import { useState } from "react";
import { AutoTextarea } from "./auto-textarea";
import { Send } from "lucide-react";
import { Button } from "./button";

type Props = {
  onSend: (message: string) => void;
  disabled?: boolean;
  maxRows?: number;
  placeholder?: string;
};

export default function UserPromt({
  onSend,
  disabled = false,
  maxRows = 4,
  placeholder = "Ask me anything...",
}: Props) {
  const [value, setValue] = useState("");
  const [isComposing, setIsComposing] = useState(false);

  const send = () => {
    const hasContent = value.trim();
    if (!hasContent || disabled) return;

    onSend(value);
    setValue("");
  };

  return (
    <div className="fixed inset-x-10 bottom-0 z-50 border-t bg-white">
      <div className="mx-auto w-full max-w-4xl p-4">
        <div className="relative">
          <AutoTextarea
            id="user-prompt"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !isComposing) {
                e.preventDefault();
                send();
              }
            }}
            onCompositionStart={() => setIsComposing(true)}
            onCompositionEnd={() => setIsComposing(false)}
            rows={1}
            maxRows={maxRows}
            disabled={disabled}
            className="flex-1 resize-none overflow-y-auto border-0 bg-transparent p-0 pr-12 leading-6 [scrollbar-color:currentColor_transparent] [scrollbar-width:thin]"
          />
          <Button
            size="icon"
            type="button"
            onClick={send}
            disabled={!value.trim() || disabled}
            className="absolute top-1/2 right-2.5 h-8 w-8 -translate-y-1/2 rounded-full"
            variant="outline"
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
