'use client';
import Image from "next/image";
import { Dropzone, DropzoneContent, DropzoneEmptyState } from '@/components/ui/shadcn-io/dropzone';
import { useState } from "react";
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button";

export default function Home() {
  const [files, setFiles] = useState<File[] | undefined>();
  const [isUploading, setIsUploading] = useState(false); // Add loading state

  const handleDrop = async (acceptedFiles: File[]) => {
    setFiles(acceptedFiles);
    const file = acceptedFiles[0];
    if (!file) return;

    setIsUploading(true);

    // 1. Create FormData
    const formData = new FormData();
    formData.append("file", file);
    formData.append("owner_user_id", "test-user"); // Replace with Clerk ID later

    try {
      // 2. Send to Backend
      const response = await fetch("http://localhost:8000/v1/jobs/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Upload failed");

      const data = await response.json();
      console.log("Job Created:", data);
      // Navigate to dashboard or show success message here

    } catch (error) {
      console.error(error);
      alert("Error uploading file");
    } finally {
      setIsUploading(false);
    }
  };
  return (
    <main className="flex max-w-3xl mx-auto flex-col items-center justify-between p-14">
      <h1 className="text-4xl font-black mb-4">Upload a Paper</h1>
      <h3 className="text-md text-muted-foreground font-light mb-6 w-2/3 mx-auto text-center">Summarize research papers, create flashcards, and take quizzes</h3>
      <div className="flex flex-col items-center justify-center bg-white py-5 px-10 rounded-md border border-gray-200 w-3/4">
        <Dropzone
          maxFiles={1}
          onDrop={handleDrop}
          onError={console.error}
          src={files}
          className="h-52"
        >
          <DropzoneEmptyState />
          <DropzoneContent />
        </Dropzone>
        <Separator className="my-5" />
        <Input type="text" placeholder="Paste an arkXiv link here" className="bg-gray-50 py-5" />
      </div>
      <Button className="w-3/4 my-5 py-5 text-sm rounded-lg">Submit & Analze</Button>
      <div className="text-muted-foreground *:[a]:hover:text-primary text-center text-xs text-balance *:[a]:underline *:[a]:underline-offset-4">
        By uploading , you agree to our <a href="#">Terms of Service</a>{" "}
        and <a href="#">Privacy Policy</a>.
      </div>
    </main>
  );
}
