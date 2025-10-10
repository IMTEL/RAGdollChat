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

export interface Role {
  name: string
  description: string
  subset_of_corpa: number[]
}

type Props = {
  roles: Role[];
  value?: string | null;
  onChange?: (id: string) => void;
};

export default function RoleSelector({ roles, value, onChange }: Props) {
  const selected = roles.find((a) => a.name === value) ?? null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          {selected ? selected.name : "roles"}
          <ChevronDown className="h-4 w-4 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-64 rounded-xl shadow-lg bg-white"
        align="start"
        sideOffset={8}
      >
        <DropdownMenuSeparator />
        {roles.map((a) => (
          <DropdownMenuItem
            className="p-2"
            key={a.name}
            onSelect={(e) => {
              e.preventDefault();
              onChange?.(a.name)
            }}
          >
            {
                // what is this for?
            /* {value === a.id && (
              <Check className="absolute left-2 top-2 h-4 w-4" />
            )} */
            } 
            {a.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
