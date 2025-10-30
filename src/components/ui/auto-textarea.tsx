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
      `bg-background ring-ring focus-visible:ring-primary min-h-[44px] w-full resize-none rounded-xl border px-3 py-2 text-sm shadow-sm ring-2 outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50 ` +
      className
    }
    {...props}
  />
));
AutoTextarea.displayName = "AutoTextarea";
