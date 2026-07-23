"use client";

import React, { useEffect, useState } from "react";
import {
  Settings, Check,
  Trash2, Upload, Loader2, Save, Eye, FileImage
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { API_BASE_URL, apiFetch } from "@/lib/api";

// Shape of the settings form state, persisted via /api/settings.
interface SettingsForm {
  large_image: string;
  small_image: string;
  fevico_image: string;
  login_image: string;
  survey_start_image: string;
  survey_end_image: string;
  loader_image: string;
  showCopy: boolean;
  cpi: string;
  show_client_api: boolean;
  show_setting: boolean;
}

// Fields of SettingsForm that hold an uploadable branding image URL.
type SettingsImageField =
  | "large_image"
  | "small_image"
  | "fevico_image"
  | "login_image"
  | "survey_start_image"
  | "survey_end_image"
  | "loader_image";

// Shape of each entry returned by GET /api/settings.
interface SettingApiItem {
  param: string;
  value: string;
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Track upload status of each field
  const [uploadingField, setUploadingField] = useState<string | null>(null);

  // Settings State Form
  const [form, setForm] = useState<SettingsForm>({
    large_image: "",
    small_image: "",
    fevico_image: "",
    login_image: "",
    survey_start_image: "",
    survey_end_image: "",
    loader_image: "",
    showCopy: false,
    cpi: "",
    show_client_api: false,
    show_setting: false
  });

  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`${API_BASE_URL}/api/settings`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.settings) {
          const loaded: Record<string, string | boolean> = {};
          data.settings.forEach((item: SettingApiItem) => {
            if (item.param === "showCopy" || item.param === "show_client_api" || item.param === "show_setting") {
              loaded[item.param] = item.value === "1";
            } else {
              loaded[item.param] = item.value || "";
            }
          });

          setForm({
            large_image: (loaded.large_image as string) || "",
            small_image: (loaded.small_image as string) || "",
            fevico_image: (loaded.fevico_image as string) || "",
            login_image: (loaded.login_image as string) || "",
            survey_start_image: (loaded.survey_start_image as string) || "",
            survey_end_image: (loaded.survey_end_image as string) || "",
            loader_image: (loaded.loader_image as string) || "",
            showCopy: (loaded.showCopy as boolean) || false,
            cpi: (loaded.cpi as string) || "",
            show_client_api: (loaded.show_client_api as boolean) || false,
            show_setting: (loaded.show_setting as boolean) || false
          });
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load settings data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Standard fetch-on-mount/param-change pattern: this function's own
    // setState calls are flagged by this rule as if the effect itself sets
    // state, but fetching data on mount/param change is exactly React's
    // documented "synchronize with an external system" use case, not the
    // render-derived-value anti-pattern this rule targets.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadSettings();
  }, []);

  const handleCheckboxChange = (key: string, checked: boolean) => {
    setForm((prev) => ({ ...prev, [key]: checked } as SettingsForm));
  };

  const handleInputChange = (key: string, val: string) => {
    setForm((prev) => ({ ...prev, [key]: val } as SettingsForm));
  };

  const handleRemoveImage = (key: string) => {
    setForm((prev) => ({ ...prev, [key]: "" } as SettingsForm));
    toast.info(`Removed branding parameter: ${key}`);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, key: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (< 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Maximum allowed logo upload size is 5MB.");
      return;
    }

    setUploadingField(key);
    toast.info(`Uploading file to branding asset storage...`);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await apiFetch(`${API_BASE_URL}/api/settings/upload`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          const mediaUrl = data.media ? `${API_BASE_URL}${data.media}` : data.media;
          setForm((prev) => ({ ...prev, [key]: mediaUrl } as SettingsForm));
          toast.success("Branding image uploaded successfully!");
        } else {
          toast.error(data.message || "Upload failed");
        }
      } else {
        toast.error("Server upload endpoint error");
      }
    } catch (err) {
      console.error(err);
      toast.error("Network error uploading logo");
    } finally {
      setUploadingField(null);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await apiFetch(`${API_BASE_URL}/api/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          toast.success("Settings parameters successfully saved!");
          // Reload settings to ensure everything is in sync
          loadSettings();
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("Error submitting settings form");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-3">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
        <span className="text-sm font-medium text-zinc-500">Querying settings registry...</span>
      </div>
    );
  }

  const renderUploadRow = (label: string, fieldKey: SettingsImageField, description: string) => {
    const assetUrl = form[fieldKey];
    const isUploading = uploadingField === fieldKey;

    return (
      <div className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-150 gap-4">
        <div className="space-y-1">
          <Label className="text-sm font-bold text-zinc-800 dark:text-zinc-200">{label}</Label>
          <p className="text-xs text-zinc-400 max-w-sm">{description}</p>
        </div>

        <div className="flex items-center gap-2">
          {assetUrl ? (
            <>
              <a
                href={assetUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3 h-9 rounded-md border border-zinc-200 bg-white text-zinc-600 hover:text-zinc-700 text-xs font-semibold shadow-sm"
              >
                <Eye size={14} />
                <span>Preview</span>
              </a>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleRemoveImage(fieldKey)}
                size="sm"
                className="text-red-600 hover:text-red-700 hover:bg-red-50 border-zinc-200 h-9"
              >
                <Trash2 size={14} />
              </Button>
            </>
          ) : (
            <div className="relative">
              <input
                type="file"
                id={`upload-${fieldKey}`}
                accept="image/*"
                onChange={(e) => handleFileUpload(e, fieldKey)}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                disabled={isUploading}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex items-center gap-1.5 border-zinc-200 h-9 shadow-sm"
                disabled={isUploading}
              >
                {isUploading ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Upload size={14} />
                )}
                <span>Upload Logo</span>
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <form onSubmit={handleFormSubmit} className="space-y-6">
      {/* 1. Header */}
      <div className="flex justify-between items-center pb-2 border-b border-zinc-200">
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight flex items-center gap-2">
            <Settings className="h-6 w-6 text-zinc-500" />
            General Settings
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Configure system branding logos, file loaders, toggles, and default parameters.
          </p>
        </div>
        <div className="shrink-0">
          <Button
            type="submit"
            disabled={saving}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-sm"
          >
            {saving ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Save size={15} />
            )}
            <span>Save Settings</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Brand Asset Uploads */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-zinc-200 shadow-sm bg-white dark:bg-zinc-900">
            <CardHeader className="py-4 border-b border-zinc-100 bg-zinc-50/50">
              <CardTitle className="text-sm font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <FileImage size={16} />
                Branding & Logos Registry
              </CardTitle>
              <CardDescription className="text-xs">
                Upload customized graphic assets to match corporate branding profiles.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {renderUploadRow("Large Logo", "large_image", "Main dashboard brand logo shown in wide layouts (e.g. sidebar).")}
              {renderUploadRow("Small Logo", "small_image", "Compact dashboard logo shown in minimized sidebars.")}
              {renderUploadRow("Favicon Icon", "fevico_image", "The icon shown in browser tab shortcuts.")}
              {renderUploadRow("Login Background Image", "login_image", "Background wallpaper graphic rendered on the admin portal login screen.")}
              {renderUploadRow("Survey Loading Screen", "survey_start_image", "Landing cover page seen by survey respondents during screening initialization.")}
              {renderUploadRow("Survey Completed Wallpaper", "survey_end_image", "The background visual rendering seen upon successful routing completion.")}
              {renderUploadRow("System Spinner Loader", "loader_image", "Animated GIF or static image loader shown while pages request database caches.")}
            </CardContent>
          </Card>
        </div>

        {/* Right Col: Parameters & Toggles */}
        <div className="space-y-6">
          {/* Settings Parameters */}
          <Card className="border-zinc-200 shadow-sm bg-white dark:bg-zinc-900">
            <CardHeader className="py-4 border-b border-zinc-100 bg-zinc-50/50">
              <CardTitle className="text-sm font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <Settings size={16} />
                Feasibility Parameters
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="cpiInput" className="text-xs font-bold text-zinc-600 dark:text-zinc-400">
                  CPI Limit For Torfaq Fetch Data
                </Label>
                <Input
                  id="cpiInput"
                  placeholder="e.g. 1.50"
                  value={form.cpi}
                  onChange={(e) => handleInputChange("cpi", e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </CardContent>
          </Card>

          {/* Visibility Toggles */}
          <Card className="border-zinc-200 shadow-sm bg-white dark:bg-zinc-900">
            <CardHeader className="py-4 border-b border-zinc-100 bg-zinc-50/50">
              <CardTitle className="text-sm font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <Check className="h-4 w-4" />
                Feature Visibility Toggles
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between p-3 rounded-md bg-zinc-50 dark:bg-zinc-950 border border-zinc-150">
                <div className="space-y-0.5">
                  <Label htmlFor="toggleCopy" className="text-xs font-bold text-zinc-700 dark:text-zinc-300 cursor-pointer">
                    Show Copy Button
                  </Label>
                  <p className="text-[10px] text-zinc-400">Enables rapid duplication widgets in grids.</p>
                </div>
                <input
                  type="checkbox"
                  id="toggleCopy"
                  checked={form.showCopy}
                  onChange={(e) => handleCheckboxChange("showCopy", e.target.checked)}
                  className="rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-md bg-zinc-50 dark:bg-zinc-950 border border-zinc-150">
                <div className="space-y-0.5">
                  <Label htmlFor="toggleClient" className="text-xs font-bold text-zinc-700 dark:text-zinc-300 cursor-pointer">
                    Show Client API Tab
                  </Label>
                  <p className="text-[10px] text-zinc-400">Toggles visibility of client API imports in header.</p>
                </div>
                <input
                  type="checkbox"
                  id="toggleClient"
                  checked={form.show_client_api}
                  onChange={(e) => handleCheckboxChange("show_client_api", e.target.checked)}
                  className="rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-md bg-zinc-50 dark:bg-zinc-950 border border-zinc-150">
                <div className="space-y-0.5">
                  <Label htmlFor="toggleSetting" className="text-xs font-bold text-zinc-700 dark:text-zinc-300 cursor-pointer">
                    Show Settings Tab
                  </Label>
                  <p className="text-[10px] text-zinc-400">Toggles visibility of general settings in header.</p>
                </div>
                <input
                  type="checkbox"
                  id="toggleSetting"
                  checked={form.show_setting}
                  onChange={(e) => handleCheckboxChange("show_setting", e.target.checked)}
                  className="rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  );
}
