"use client";

import React, { useEffect, useState } from "react";
import { Link2, Copy, Check } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

export default function ClientLinksPage() {
  const [origin, setOrigin] = useState("http://localhost:5000");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    // window.location isn't available during SSR, so the real origin can
    // only be read after mount, client-only - starts from the localhost
    // fallback above to match SSR output, corrected immediately here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOrigin(window.location.origin);
  }, []);

  const linksData = [
    {
      sn: 1,
      status: "Complete",
      url: `${origin}/client-redirect-url?status=complete&uid=xxx`,
      key: "complete"
    },
    {
      sn: 2,
      status: "Disqualify",
      url: `${origin}/client-redirect-url?status=disqualify&uid=xxx`,
      key: "disqualify"
    },
    {
      sn: 3,
      status: "Quota Full",
      url: `${origin}/client-redirect-url?status=quotaFull&uid=xxx`,
      key: "quotaFull"
    },
    {
      sn: 4,
      status: "Security Term",
      url: `${origin}/client-redirect-url?status=securityTerm&uid=xxx`,
      key: "securityTerm"
    }
  ];

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success(`${key} redirect link copied to clipboard`);
    setTimeout(() => {
      setCopiedKey(null);
    }, 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header Band */}
      <div className="flex justify-between items-center pb-2 border-b border-zinc-200">
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight flex items-center gap-2">
            <Link2 className="h-6 w-6 text-zinc-500" />
            Client Redirect Links
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Copy callback templates to supply client panels for postback mapping.
          </p>
        </div>
      </div>

      {/* Copy Links Card */}
      <Card className="border-zinc-200 shadow-sm overflow-hidden bg-white dark:bg-zinc-900">
        <CardHeader className="py-4 border-b border-zinc-100 dark:border-zinc-800">
          <CardTitle className="text-sm font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
            All Redirect Templates
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="border-collapse">
              <TableHeader className="bg-zinc-50/70 dark:bg-zinc-900">
                <TableRow className="border-b border-zinc-200">
                  <TableHead className="font-semibold text-zinc-600 h-10 w-12 text-center">SN</TableHead>
                  <TableHead className="font-semibold text-zinc-600 h-10 w-32">Status</TableHead>
                  <TableHead className="font-semibold text-zinc-600 h-10">Redirect URL Template</TableHead>
                  <TableHead className="font-semibold text-zinc-600 h-10 w-24 text-right pr-6">Copy</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {linksData.map((item) => {
                  const isCopied = copiedKey === item.key;
                  return (
                    <TableRow key={item.key} className="border-b border-zinc-150 hover:bg-zinc-50/50 transition-colors">
                      <TableCell className="text-center font-medium text-zinc-400 py-4">{item.sn}</TableCell>
                      <TableCell className="font-bold text-zinc-700 dark:text-zinc-300">{item.status}</TableCell>
                      <TableCell className="py-3">
                        <Input
                          readOnly
                          value={item.url}
                          className="font-mono text-xs bg-zinc-50 border-zinc-200 select-all cursor-pointer h-9"
                          onClick={(e) => (e.target as HTMLInputElement).select()}
                        />
                      </TableCell>
                      <TableCell className="text-right pr-6 py-3">
                        <Button
                          onClick={() => handleCopy(item.url, item.key)}
                          variant={isCopied ? "secondary" : "default"}
                          size="sm"
                          className="flex items-center gap-1.5 shadow-sm ml-auto"
                        >
                          {isCopied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                          <span>{isCopied ? "Copied" : "Copy"}</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
