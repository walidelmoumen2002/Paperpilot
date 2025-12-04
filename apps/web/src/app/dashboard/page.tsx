"use client";

import { useState } from "react";

import { Spinner } from "@/components/ui/spinner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";

type Job = {
  id?: string;
  status: string;
  progress?: number;
  error_message?: string | null;
  created_at?: string;
  updated_at?: string;
};

export default function Page() {
  const pageSize = 10;
  const [page, setPage] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const fetchJobs = async (offset: number): Promise<Job[]> => {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/v1/jobs?offset=${offset}&limit=${pageSize}`,
      {
        method: "GET",
      }
    );
    if (!response.ok) {
      throw new Error("Failed to fetch jobs");
    }
    return response.json();
  };

  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ["jobs", page],
    queryFn: () => fetchJobs(page * pageSize),
    keepPreviousData: true,
  });

  const showToast = (title: string, description?: string) =>
    toast(title, { description });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/v1/jobs/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        throw new Error("Failed to delete job");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      showToast("Job deleted", "The job was removed.");
    },
    onError: () => {
      showToast("Failed to delete job", "Please try again.");
    },
  });

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget);
    } finally {
      setDialogOpen(false);
      setDeleteTarget(null);
    }
  };

  if (isLoading && !data) {
    return (
      <div className="flex h-full min-h-[50vh] items-center justify-center">
        <Spinner className="h-12 w-12 text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full min-h-[50vh] items-center justify-center text-sm text-destructive">
        Failed to load jobs.
      </div>
    );
  }

  const jobs = data ?? [];
  const hasNext = jobs.length === pageSize;

  const copyId = async (id?: string) => {
    if (!id) return;
    await navigator.clipboard.writeText(id);
    showToast("ID copied", "Copied to your clipboard.");
  };

  return (
    <div className="w-5/6 m-auto mt-10 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Recent uploads</h2>
          <p className="text-sm text-muted-foreground">
            Track job status, progress, and errors.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0 || isFetching}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page + 1}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => p + 1)}
            disabled={!hasNext || isFetching}
          >
            Next
          </Button>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[200px]">ID</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Progress</TableHead>
            <TableHead>Updated</TableHead>
            <TableHead className="w-[180px] text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {jobs.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                No jobs yet.
              </TableCell>
            </TableRow>
          ) : (
            jobs.map((job, id) => (
              <TableRow key={job.id ?? id}>
                <TableCell className="font-medium truncate">{job.id ?? "—"}</TableCell>
                <TableCell className="capitalize">{job.status}</TableCell>
                <TableCell>{job.progress ?? 0}%</TableCell>
                <TableCell>
                  {job.updated_at
                    ? new Date(job.updated_at).toLocaleString()
                    : "—"}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        window.open(
                          `${process.env.NEXT_PUBLIC_API_URL}/v1/jobs/${job.id}`,
                          "_blank"
                        )
                      }
                      disabled={!job.id}
                    >
                      View
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => copyId(job.id)} disabled={!job.id}>
                      Copy ID
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        if (!job.id) return;
                        setDeleteTarget(job.id);
                        setDialogOpen(true);
                      }}
                      disabled={!job.id}
                    >
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      {isFetching && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner className="h-4 w-4" />
          Loading…
        </div>
      )}
      <AlertDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogTrigger asChild>
          <span />
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete job?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the job and its stored file. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleteMutation.isLoading}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {deleteMutation.isLoading ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
