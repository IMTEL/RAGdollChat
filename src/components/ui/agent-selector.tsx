"use client";

import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  Label,
} from "@radix-ui/react-dropdown-menu";
import { Button } from "@/components/ui/button";
import { Check, ChevronDown } from "lucide-react";

export type Agent = { id: string; name: string };

type Props = {
  agents: Agent[];
  value?: string | null;
  onChange?: (id: string) => void;
};

export default function AgentSelector({ agents, value, onChange }: Props) {
  const selected = agents.find((a) => a.id === value) ?? null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          {selected ? selected.name : "Agents"}
          <ChevronDown className="h-4 w-4 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-64 rounded-xl shadow-lg"
        align="start"
        sideOffset={8}
      >
        <DropdownMenuSeparator />
        {agents.map((a) => (
          <DropdownMenuItem
            className="p-2"
            key={a.id}
            onSelect={(e) => {
              e.preventDefault();
              onChange?.(a.id);
            }}
          >
            {value === a.id && (
              <Check className="absolute left-2 top-2 h-4 w-4" />
            )}
            {a.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
