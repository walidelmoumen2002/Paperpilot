"use client";

import { Spinner } from "@/components/ui/spinner";
import {
    Table,
    TableBody,
    TableCaption,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";

type Job = {
    id?: string;
    status: string;
    progress?: number;
    error_message?: string | null;
    created_at?: string;
    updated_at?: string;
};

export default function Page() {
    const fetchJobs = async (): Promise<Job[]> => {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/v1/jobs`, {
            method: "GET",
        });
        if (!response.ok) {
            throw new Error("Failed to fetch jobs");
        }
        const json = await response.json();
        // console.log("Fetched jobs:", json);
        return json;
    };

    const { data, isLoading, error } = useQuery({
        queryKey: ["jobs"],
        queryFn: fetchJobs,
    });

    if (isLoading) {
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

    return (
        <Table className="w-5/6 m-auto mt-10">
            <TableCaption>Recent uploads</TableCaption>
            <TableHeader>
                <TableRow>
                    <TableHead className="w-[200px]">ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Updated</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {jobs.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                            No jobs yet.
                        </TableCell>
                    </TableRow>
                ) : (
                    jobs.map((job, id) => (
                        <TableRow key={job.id ?? id}>
                            <TableCell className="font-medium">{job.id ?? "—"}</TableCell>
                            <TableCell className="capitalize">{job.status}</TableCell>
                            <TableCell>{job.progress ?? 0}%</TableCell>
                            <TableCell>
                                {job.updated_at
                                    ? new Date(job.updated_at).toLocaleString()
                                    : "—"}
                            </TableCell>
                        </TableRow>
                    ))
                )}
            </TableBody>
        </Table>
    );
}
