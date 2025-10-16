"use client";

import React from "react";
import { forwardRef, type ComponentPropsWithoutRef } from "react";
import TextareaAutosize from "react-textarea-autosize";

export const AutoTextarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentPropsWithoutRef<typeof TextareaAutosize>
>(({ className = "", ...props }, ref) => (
  <TextareaAutosize
    ref={ref}
    className={
      `min-h-[44px] w-full rounded-xl border bg-background px-3 py-2 text-sm shadow-sm
            outline-none ring-2 ring-ring
            focus-visible:ring-2 focus-visible:ring-primary
            disabled:cursor-not-allowed disabled:opacity-50 resize-none ` +
      className
    }
    {...props}
  />
));
AutoTextarea.displayName = "AutoTextarea";
