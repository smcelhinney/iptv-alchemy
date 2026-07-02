import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchConfig, updateConfig } from "../lib/api";
import type { AppConfig } from "../types/config";
import OutputDirectoriesSection from "./OutputDirectoriesSection";
import OpenSubtitlesFields from "./OpenSubtitlesFields";

interface FormData {
  xtream_server_url: string;
  xtream_username: string;
  xtream_password: string;
  emby_server_url: string;
  emby_api_key: string;
  jellyfin_server_url: string;
  jellyfin_api_key: string;
  tmdb_api_key: string;
  opensubtitles_api_key: string;
  opensubtitles_username: string;
  opensubtitles_password: string;
  output_directory: string;
  tv_output_directory: string;
  movies_output_directory: string;
}

function toFormData(cfg: AppConfig): FormData {
  return {
    xtream_server_url: cfg.xtream_server_url ?? "",
    xtream_username: cfg.xtream_username ?? "",
    xtream_password: cfg.xtream_password ?? "",
    emby_server_url: cfg.emby_server_url ?? "",
    emby_api_key: cfg.emby_api_key ?? "",
    jellyfin_server_url: cfg.jellyfin_server_url ?? "",
    jellyfin_api_key: cfg.jellyfin_api_key ?? "",
    tmdb_api_key: cfg.tmdb_api_key ?? "",
    opensubtitles_api_key: cfg.opensubtitles_api_key ?? "",
    opensubtitles_username: cfg.opensubtitles_username ?? "",
    opensubtitles_password: cfg.opensubtitles_password ?? "",
    output_directory: cfg.output_directory ?? "./output",
    tv_output_directory: cfg.tv_output_directory ?? "./output/media/tv",
    movies_output_directory: cfg.movies_output_directory ?? "./output/media/movies",
  };
}

export default function ConfigPanel() {
  const queryClient = useQueryClient();

  const { data: config, isLoading, isError } = useQuery({
    queryKey: ["config"],
    queryFn: fetchConfig,
  });

  const [form, setForm] = useState<FormData | null>(null);

  // Populate local form state once config loads
  const loadedForm = config ? toFormData(config) : null;
  if (loadedForm && !form) {
    setForm(loadedForm);
  }

  const saveMutation = useMutation({
    mutationFn: updateConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config"] });
    },
  });

  if (isLoading) {
    return <div className="text-gray-400">Loading configuration...</div>;
  }

  if (isError || !form) {
    return <div className="text-red-400">Failed to load configuration.</div>;
  }

  const set = (key: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => (prev ? { ...prev, [key]: e.target.value } : prev));
  };

  const setDirect = (key: keyof FormData) => (value: string) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const handleSave = () => {
    saveMutation.mutate({ ...form });
  };

  return (
    <div className="max-w-2xl space-y-6">
      {/* Xtream Config */}
      <section className="bg-gray-800 rounded-lg border border-gray-700 p-5">
        <h3 className="text-lg font-semibold mb-4">Xtream Config</h3>
        <div className="space-y-3">
          <Field label="Server URL" value={form.xtream_server_url} onChange={set("xtream_server_url")} placeholder="http://example.com" />
          <Field label="Username" value={form.xtream_username} onChange={set("xtream_username")} />
          <Field label="Password" value={form.xtream_password} onChange={set("xtream_password")} type="password" />
        </div>
      </section>

      {/* Media Server Config with Tabs */}
      <section className="bg-gray-800 rounded-lg border border-gray-700 p-5">
        <h3 className="text-lg font-semibold mb-4">Media Server Config</h3>
        <MediaServerConfigSection form={form} set={set} />
      </section>

      {/* TMDB */}
      <section className="bg-gray-800 rounded-lg border border-gray-700 p-5">
        <h3 className="text-lg font-semibold mb-4">TMDB</h3>
        <p className="text-sm text-gray-400 mb-3">
          API key for The Movie Database metadata enrichment.
          Get one at{" "}
          <a
            href="https://www.themoviedb.org/settings/api"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 underline"
          >
            themoviedb.org/settings/api
          </a>
          .
        </p>
        <Field
          label="API Key"
          value={form.tmdb_api_key}
          onChange={set("tmdb_api_key")}
          type="password"
          placeholder="Your TMDB API key"
        />
      </section>

      {/* OpenSubtitles */}
      <section className="bg-gray-800 rounded-lg border border-gray-700 p-5">
        <OpenSubtitlesFields
          apiKey={form.opensubtitles_api_key}
          username={form.opensubtitles_username}
          password={form.opensubtitles_password}
          onApiKeyChange={(v) => setDirect("opensubtitles_api_key")(v)}
          onUsernameChange={(v) => setDirect("opensubtitles_username")(v)}
          onPasswordChange={(v) => setDirect("opensubtitles_password")(v)}
        />
      </section>

      {/* Output Directories */}
      <section className="bg-gray-800 rounded-lg border border-gray-700 p-5">
        <OutputDirectoriesSection
          outputDir={form.output_directory}
          setOutputDir={setDirect("output_directory")}
          tvOutputDir={form.tv_output_directory}
          setTvOutputDir={setDirect("tv_output_directory")}
          moviesOutputDir={form.movies_output_directory}
          setMoviesOutputDir={setDirect("movies_output_directory")}
        />
      </section>

      {/* Save button */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={saveMutation.isPending}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm font-medium transition-colors"
        >
          {saveMutation.isPending ? "Saving..." : "Save"}
        </button>
        {saveMutation.isSuccess && (
          <span className="text-green-400 text-sm">Saved</span>
        )}
        {saveMutation.isError && (
          <span className="text-red-400 text-sm">Failed to save</span>
        )}
      </div>
    </div>
  );
}

function MediaServerConfigSection({
  form,
  set,
}: {
  form: FormData;
  set: (key: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  const [activeTab, setActiveTab] = useState<'emby' | 'jellyfin'>('emby');

  return (
    <div className="space-y-4">
      {/* Tab Headers */}
      <div className="flex border-b border-gray-700">
        <button
          type="button"
          onClick={() => setActiveTab('emby')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'emby'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          Emby
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('jellyfin')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'jellyfin'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          Jellyfin
        </button>
      </div>

      {/* Tab Content */}
      <div className="space-y-3">
        {activeTab === 'emby' && (
          <>
            <Field label="Server URL" value={form.emby_server_url} onChange={set("emby_server_url")} placeholder="http://emby:8096" />
            <Field label="API Key" value={form.emby_api_key} onChange={set("emby_api_key")} type="password" />
          </>
        )}
        {activeTab === 'jellyfin' && (
          <>
            <Field label="Server URL" value={form.jellyfin_server_url} onChange={set("jellyfin_server_url")} placeholder="http://jellyfin:8096" />
            <Field label="API Key" value={form.jellyfin_api_key} onChange={set("jellyfin_api_key")} type="password" />
          </>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm text-gray-400 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500"
      />
    </div>
  );
}
