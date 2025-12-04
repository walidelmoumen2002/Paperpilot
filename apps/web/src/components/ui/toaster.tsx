"use client";

import { Toaster as SonnerToaster, type ToasterProps } from "sonner";

// Thin wrapper so we can control defaults and forward props from the App Router layout.
export function Toaster(props: ToasterProps) {
  return (
    <SonnerToaster
      toastOptions={{
        classNames: {
          toast: "border bg-background text-foreground",
          actionButton: "bg-primary text-primary-foreground",
          cancelButton: "bg-muted text-muted-foreground",
        },
      }}
      {...props}
    />
  );
}
