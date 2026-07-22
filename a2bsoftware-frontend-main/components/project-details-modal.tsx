"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";

interface ProjectStatusDetail {
  id: string;
  parent_project_id: string | null;
  project_name: string;
  clientName?: string;
  project_manager?: string;
  salesManagers?: string;
  start_date?: string;
}

interface ProjectDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  data: ProjectStatusDetail[];
}

export default function ProjectDetailsModal({
  isOpen,
  onClose,
  title,
  data
}: ProjectDetailsModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[90vw] md:max-w-[75vw] lg:max-w-[65vw] max-h-[85vh] flex flex-col p-6 overflow-hidden bg-white dark:bg-zinc-950">
        <DialogHeader className="border-b border-zinc-100 dark:border-zinc-800 pb-3 flex-shrink-0">
          <DialogTitle className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
            Project List - {title} ({data.length})
          </DialogTitle>
          <DialogDescription className="text-xs text-zinc-500">
            List of surveys currently in "{title}" state.
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable table container */}
        <div className="flex-grow overflow-auto my-4 border border-zinc-200 dark:border-zinc-800 rounded-md">
          <Table>
            <TableHeader className="bg-zinc-50 dark:bg-zinc-900/50 sticky top-0 z-10 shadow-sm">
              <TableRow>
                <TableHead className="w-12 text-center font-bold">SN</TableHead>
                <TableHead className="font-bold">ID</TableHead>
                <TableHead className="font-bold">Parent</TableHead>
                <TableHead className="font-bold min-w-[200px]">Name</TableHead>
                <TableHead className="font-bold">Company</TableHead>
                <TableHead className="font-bold">PM / SM</TableHead>
                <TableHead className="font-bold">Start Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-zinc-500">
                    No projects found.
                  </TableCell>
                </TableRow>
              ) : (
                data.map((row, index) => {
                  const parentId = row.parent_project_id || "-";
                  const pm = row.project_manager || "NA";
                  const sm = row.salesManagers || "NA";

                  return (
                    <TableRow key={row.id || index} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30">
                      <TableCell className="text-center text-zinc-500 font-mono text-xs">{index + 1}</TableCell>
                      <TableCell className="font-medium text-xs font-mono">{row.id}</TableCell>
                      <TableCell className="text-xs font-mono">{parentId}</TableCell>
                      <TableCell className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                        {row.project_name}
                      </TableCell>
                      <TableCell className="text-xs">{row.clientName || "NA"}</TableCell>
                      <TableCell className="text-xs text-zinc-600 dark:text-zinc-400">
                        {pm} / {sm}
                      </TableCell>
                      <TableCell className="text-xs">{row.start_date || "NA"}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        <DialogFooter className="border-t border-zinc-100 dark:border-zinc-800 pt-3 flex-shrink-0">
          <Button onClick={onClose} className="bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
