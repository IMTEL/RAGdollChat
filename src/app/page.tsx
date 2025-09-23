"use client";

import ChatInput from "@/components/ui/user-promt";

export default function ChatOnlyPage() {
  return (
    <main className="min-h-screen bg-background">
      <ChatInput onSend={(msg) => console.log("send:", msg)} />
    </main>
  );
}
