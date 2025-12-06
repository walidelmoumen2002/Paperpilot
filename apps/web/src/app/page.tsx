"use client";
import React from "react";
import { Dropzone, DropzoneContent, DropzoneEmptyState } from "@/components/ui/shadcn-io/dropzone";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useMutation } from "@tanstack/react-query";
import { Check } from "lucide-react";

export default function Home() {
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
  const [link, setLink] = React.useState<string>("");
  const [jobId, setJobId] = React.useState<string | null>(null);
  const [jobStatus, setJobStatus] = React.useState<string | null>(null);
  const [jobProgress, setJobProgress] = React.useState<number>(0);
  const [showStepper, setShowStepper] = React.useState(false);
  const containerWidth = showStepper ? "max-w-4xl" : "max-w-3xl";

  const handleDrop = async (acceptedFiles: File[]) => {
    if (!acceptedFiles?.length) {
      throw new Error("No file selected");
    }
    const file = acceptedFiles[0];

    const formData = new FormData();
    formData.append("file", file);
    formData.append("owner_user_id", "test-user");

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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: link,
        owner_user_id: "test-user",
      }),
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || "Link submission failed");
    }

    return response.json();
  }

  const handleJobProgress = (data: any) => {
    setShowStepper(true);
    const id =
      data?.id ??
      data?.job_id ??
      data?.jobId ??
      data?.job?.id ??
      data?.job?.job_id ??
      data?.job?.jobId;

    if (id) {
      setJobId(String(id));
    }

    const status = data?.status ?? data?.job?.status ?? "processing";
    setJobStatus(status);
    setJobProgress(
      typeof data?.progress === "number"
        ? data.progress
        : typeof data?.job?.progress === "number"
          ? data.job.progress
          : 0
    );

    if (status === "done") {
      return;
    }
  };

  const UploadSection = () => (
    <div className="w-full flex flex-col items-center">
      <h1 className="text-4xl font-black mb-4">Upload a Paper</h1>
      <h3 className="text-md text-muted-foreground font-light mb-6 w-2/3 mx-auto text-center">
        Summarize research papers, create flashcards, and take quizzes
      </h3>

      <div className="flex flex-col items-center justify-center bg-white py-5 px-10 rounded-md border border-gray-200 w-3/4 shadow-sm">
        <Dropzone
          maxFiles={1}
          onDrop={(files) => fileMutation.mutate(files)}
          onError={console.error}
          className="h-52 w-full"
        >
          <DropzoneEmptyState />
          <DropzoneContent />
        </Dropzone>
        <Separator className="my-5" />
        <Input
          type="text"
          placeholder="Paste an arXiv link here"
          className="bg-gray-50 py-5"
          value={link}
          onChange={(e) => setLink(e.target.value)}
        />
      </div>

      <Button
        onClick={() => linkMutation.mutate(link)}
        className="w-3/4 my-5 py-5 text-sm rounded-lg"
        disabled={isProcessing}
      >
        {isProcessing ? "Uploading..." : "Submit & Analyze"}
      </Button>

      <div className="text-muted-foreground text-center text-xs text-balance">
        By uploading, you agree to our <a href="#" className="underline underline-offset-4 hover:text-primary">Terms of Service</a> and <a href="#" className="underline underline-offset-4 hover:text-primary">Privacy Policy</a>.
      </div>
    </div>
  );

  const fileMutation = useMutation({
    mutationFn: handleDrop,
    onSuccess: (data) => {
      console.log("File uploaded successfully:", data);
      handleJobProgress(data);
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
      handleJobProgress(data);
    },
    onError: (error) => {
      console.error("Error submitting link:", error);
      alert("Error submitting link");
    },
  });

  const isProcessing =
    fileMutation.isPending ||
    linkMutation.isPending ||
    jobStatus === "processing" ||
    jobStatus === "queued";

  React.useEffect(() => {
    if (!jobId) return;
    if (jobStatus === "done" || jobStatus === "error") return;

    let cancelled = false;
    const intervalId = window.setInterval(async () => {
      try {
        const res = await fetch(`${apiBase}/v1/jobs/${jobId}`);
        if (!res.ok) {
          throw new Error("Failed to fetch job status");
        }
        const job = await res.json();
        if (cancelled) return;

        const status = job?.status as string | undefined;
        const progress = typeof job?.progress === "number" ? job.progress : null;
        if (status) {
          setJobStatus(status);
          if (status === "done") {
            window.clearInterval(intervalId);
          }
          if (status === "error") {
            window.clearInterval(intervalId);
          }
        }
        if (progress !== null) {
          setJobProgress(progress);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to poll job status", err);
        }
      }
    }, 1000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [jobId, jobStatus, apiBase]);

  const processingSteps = [
    { key: "upload", title: "Upload", threshold: 10 },
    { key: "parse", title: "Parse", threshold: 30 },
    { key: "sectionize", title: "Sectionize", threshold: 60 },
    { key: "summarize", title: "Summarize", threshold: 90 },
    { key: "claims", title: "Claims", threshold: 92 },
    { key: "cards", title: "Cards", threshold: 94 },
    { key: "quiz", title: "Quiz", threshold: 96 },
  ];

  const progressValue = jobStatus === "done" ? 100 : jobProgress ?? 0;
  const firstIncompleteIndex =
    jobStatus === "done"
      ? -1
      : processingSteps.findIndex((step) => progressValue < step.threshold);

  const getStepState = (index: number) => {
    if (jobStatus === "done") return "completed" as const;
    const step = processingSteps[index];
    if (progressValue >= step.threshold) return "completed" as const;
    if (firstIncompleteIndex === -1) return "active" as const;
    if (firstIncompleteIndex === index) return "active" as const;
    return "queued" as const;
  };

  const stateDescription = (state: "completed" | "active" | "queued") => {
    if (state === "completed") return "Completed";
    if (state === "active") return "In Progress...";
    return "Queued";
  };

  return (
    <main className={`flex mx-auto flex-col items-center justify-between p-14 ${containerWidth}`}>
      <div className="w-full">
        {!showStepper ? (
          <UploadSection />
        ) : (
          <div className="flex flex-col items-center gap-12 py-6">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-extrabold">Processing Your Paper</h2>
              <p className="text-muted-foreground">
                This shouldn&apos;t take long. You can safely leave this page.
              </p>
            </div>

            <div className="relative w-full max-w-md mx-auto">
              <div className="absolute left-[14px] top-6 bottom-6 w-px bg-border" aria-hidden />
              <div className="flex flex-col gap-6">
                {processingSteps.map((step, index) => {
                  const state = getStepState(index);
                  const isCompleted = state === "completed";
                  const isActive = state === "active";

                  return (
                    <div key={step.key} className="relative flex items-start gap-4">
                      <div
                        className={[
                          "relative z-10 flex h-7 w-7 items-center justify-center rounded-full border",
                          isCompleted
                            ? "bg-primary border-primary text-primary-foreground"
                            : isActive
                              ? "bg-muted border-muted-foreground/40"
                              : "bg-background border-muted-foreground/30 text-muted-foreground",
                        ].join(" ")}
                      >
                        {isCompleted ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : isActive ? (
                          <span className="h-3 w-3 rounded-full bg-muted-foreground/60" />
                        ) : null}
                      </div>
                      <div className="space-y-0.5">
                        <div
                          className={[
                            "text-sm font-semibold",
                            isCompleted || isActive ? "text-foreground" : "text-muted-foreground",
                          ].join(" ")}
                        >
                          {step.title}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {stateDescription(state)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="w-full rounded-md border bg-muted/30 px-4 py-3 text-center text-sm text-muted-foreground">
              This process is non-blocking. We&apos;ll send you a notification when your paper is ready.
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
