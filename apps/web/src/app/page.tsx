"use client";
import React from "react";
import { Dropzone, DropzoneContent, DropzoneEmptyState } from "@/components/ui/shadcn-io/dropzone";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useMutation } from "@tanstack/react-query";

export default function Home() {
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
  const [link, setLink] = React.useState<string>("");
  const handleDrop = async (acceptedFiles: File[]) => {
    if (!acceptedFiles?.length) {
      throw new Error("No file selected");
    }
    const file = acceptedFiles[0];

    const formData = new FormData();
    formData.append("file", file);
    formData.append("owner_user_id", "test-user"); // Replace with Clerk ID later

    try {
      const response = await fetch(`${apiBase}/v1/jobs/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Upload failed");
      }

      return response.json();
    } catch (error) {
      console.error("Upload failed", error);
      throw error;
    }
  };
  const handlePasteLink = async (link: string) => {
    const response = await fetch(`${apiBase}/v1/jobs/link`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: link,
        owner_user_id: "test-user", // Replace with Clerk ID later
      }),
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || "Link submission failed");
    }

    return response.json();
  }
  const mutation = useMutation({
    mutationFn: handleDrop,
    onSuccess: (data) => {
      console.log("File uploaded successfully:", data);
    },
    onError: (error) => {
      console.error("Error uploading file:", error);
      alert("Error uploading file");
    },
  });

  const linkMutation = useMutation({
    mutationFn: handlePasteLink,
    onSuccess: (data) => {
      console.log("Link submitted successfully:", data);
    },
    onError: (error) => {
      console.error("Error submitting link:", error);
      alert("Error submitting link");
    },
  });


  return (
    <main className="flex max-w-3xl mx-auto flex-col items-center justify-between p-14">
      <h1 className="text-4xl font-black mb-4">Upload a Paper</h1>
      <h3 className="text-md text-muted-foreground font-light mb-6 w-2/3 mx-auto text-center">Summarize research papers, create flashcards, and take quizzes</h3>
      <div className="flex flex-col items-center justify-center bg-white py-5 px-10 rounded-md border border-gray-200 w-3/4">
        <Dropzone
          maxFiles={1}
          onDrop={(files) => mutation.mutate(files)}
          onError={console.error}
          className="h-52"
        >
          <DropzoneEmptyState />
          <DropzoneContent />
        </Dropzone>
        <Separator className="my-5" />
        <Input type="text" placeholder="Paste an arXiv link here" className="bg-gray-50 py-5" onChange={(e) => setLink(e.target.value)} />
      </div>
      <Button onClick={
        () => {
          linkMutation.mutate(link);
        }
      } className="w-3/4 my-5 py-5 text-sm rounded-lg" disabled={mutation.isPending}>
        {mutation.isPending ? "Uploading..." : "Submit & Analyze"}
      </Button>
      <div className="text-muted-foreground *:[a]:hover:text-primary text-center text-xs text-balance *:[a]:underline *:[a]:underline-offset-4">
        By uploading , you agree to our <a href="#">Terms of Service</a>{" "}
        and <a href="#">Privacy Policy</a>.
      </div>
    </main>
  );
}
