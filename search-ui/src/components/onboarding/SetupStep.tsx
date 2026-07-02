import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  fetchConfig,
  updateConfig,
  validateIptvCredentials,
  validateOutputDirs,
} from "../../lib/api";
import type { DirsValidationResponse } from "../../types/config";
import OutputDirectoriesSection from "../OutputDirectoriesSection";
import OpenSubtitlesFields from "../OpenSubtitlesFields";

interface Props {
  onNext: () => void;
}

export default function SetupStep({ onNext }: Props) {
  const { data: config } = useQuery({
    queryKey: ["config"],
    queryFn: fetchConfig,
  });

  // IPTV fields
  const [serverUrl, setServerUrl] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // Media Server fields
  const [embyServerUrl, setEmbyServerUrl] = useState("");
  const [embyApiKey, setEmbyApiKey] = useState("");
  const [jellyfinServerUrl, setJellyfinServerUrl] = useState("");
  const [jellyfinApiKey, setJellyfinApiKey] = useState("");
  const [activeServerTab, setActiveServerTab] = useState<'emby' | 'jellyfin'>('emby');

  // TMDB field (optional)
  const [tmdbApiKey, setTmdbApiKey] = useState("");

  // OpenSubtitles fields (optional)
  const [opensubtitlesApiKey, setOpensubtitlesApiKey] = useState("");
  const [opensubtitlesUsername, setOpensubtitlesUsername] = useState("");
  const [opensubtitlesPassword, setOpensubtitlesPassword] = useState("");

  // Output dir fields
  const [outputDir, setOutputDir] = useState("");
  const [tvOutputDir, setTvOutputDir] = useState("");
  const [moviesOutputDir, setMoviesOutputDir] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [dirResults, setDirResults] = useState<DirsValidationResponse | null>(null);

  // Populate from config once loaded
  useEffect(() => {
    if (config && !serverUrl) {
      setServerUrl(config.xtream_server_url ?? "");
      setUsername(config.xtream_username ?? "");
      setPassword(config.xtream_password ?? "");
      setEmbyServerUrl(config.emby_server_url ?? "");
      setEmbyApiKey(config.emby_api_key ?? "");
      setJellyfinServerUrl(config.jellyfin_server_url ?? "");
      setJellyfinApiKey(config.jellyfin_api_key ?? "");
      setTmdbApiKey(config.tmdb_api_key ?? "");
      setOpensubtitlesApiKey(config.opensubtitles_api_key ?? "");
      setOpensubtitlesUsername(config.opensubtitles_username ?? "");
      setOpensubtitlesPassword(config.opensubtitles_password ?? "");
      setOutputDir(config.output_directory ?? "./output");
      setTvOutputDir(config.tv_output_directory ?? "./output/media/tv");
      setMoviesOutputDir(config.movies_output_directory ?? "./output/media/movies");
    }
  }, [config]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveMediaServerMutation = useMutation({
    mutationFn: () =>
      updateConfig({
        emby_server_url: embyServerUrl,
        emby_api_key: embyApiKey,
        jellyfin_server_url: jellyfinServerUrl,
        jellyfin_api_key: jellyfinApiKey,
        tmdb_api_key: tmdbApiKey,
        opensubtitles_api_key: opensubtitlesApiKey,
        opensubtitles_username: opensubtitlesUsername,
        opensubtitles_password: opensubtitlesPassword,
      }),
  });

  const validateIptvMutation = useMutation({
    mutationFn: () =>
      validateIptvCredentials({
        xtream_server_url: serverUrl,
        xtream_username: username,
        xtream_password: password,
      }),
  });

  const validateDirsMutation = useMutation({
    mutationFn: () =>
      validateOutputDirs({
        output_directory: outputDir,
        tv_output_directory: tvOutputDir,
        movies_output_directory: moviesOutputDir,
      }),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setDirResults(null);

    // Validate IPTV credentials
    try {
      const iptvResult = await validateIptvMutation.mutateAsync();
      if (!iptvResult.valid) {
        setError(iptvResult.error ?? "IPTV validation failed");
        return;
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "IPTV validation failed");
      return;
    }

    // Validate output directories
    try {
      const dirsResult = await validateDirsMutation.mutateAsync();
      setDirResults(dirsResult);
      if (!dirsResult.valid) {
        setError("One or more directories are invalid");
        return;
      }
    } catch {
      setError("Directory validation request failed");
      return;
    }

    // Save Media Server config
    saveMediaServerMutation.mutate();

    // All valid
    onNext();
  };

  const isPending =
    validateIptvMutation.isPending || validateDirsMutation.isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* IPTV Connection */}
      <div>
        <h2 className="text-lg font-semibold mb-1">IPTV Connection</h2>
        <p className="text-sm text-gray-400">
          Enter your Xtream Codes API credentials to connect to your IPTV
          provider.
        </p>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Server URL</label>
          <input
            type="text"
            value={serverUrl}
            onChange={(e) => setServerUrl(e.target.value)}
            placeholder="http://example.com"
            className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500"
            required
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500"
            required
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500"
            required
          />
        </div>
      </div>

      {/* Media Server Integration with Tabs */}
      <div className="space-y-3 pt-4 border-t border-gray-700">
        <h3 className="text-sm font-medium text-gray-300">
          Media Server Integration (optional)
        </h3>

        {/* Tab Headers */}
        <div className="flex border-b border-gray-700">
          <button
            type="button"
            onClick={() => setActiveServerTab('emby')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeServerTab === 'emby'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            Emby
          </button>
          <button
            type="button"
            onClick={() => setActiveServerTab('jellyfin')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeServerTab === 'jellyfin'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            Jellyfin
          </button>
        </div>

        {/* Tab Content */}
        <div className="space-y-3 pt-2">
          {activeServerTab === 'emby' && (
            <>
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Emby Server URL
                </label>
                <input
                  type="text"
                  value={embyServerUrl}
                  onChange={(e) => setEmbyServerUrl(e.target.value)}
                  placeholder="http://emby:8096"
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Emby API Key
                </label>
                <input
                  type="password"
                  value={embyApiKey}
                  onChange={(e) => setEmbyApiKey(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </>
          )}
          {activeServerTab === 'jellyfin' && (
            <>
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Jellyfin Server URL
                </label>
                <input
                  type="text"
                  value={jellyfinServerUrl}
                  onChange={(e) => setJellyfinServerUrl(e.target.value)}
                  placeholder="http://jellyfin:8096"
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Jellyfin API Key
                </label>
                <input
                  type="password"
                  value={jellyfinApiKey}
                  onChange={(e) => setJellyfinApiKey(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* TMDB Integration (optional) */}
      <div className="space-y-3 pt-4 border-t border-gray-700">
        <h3 className="text-sm font-medium text-gray-300">
          TMDB (optional)
        </h3>
        <p className="text-xs text-gray-500">
          API key for The Movie Database metadata enrichment.
        </p>
        <div>
          <label className="block text-sm text-gray-400 mb-1">API Key</label>
          <input
            type="password"
            value={tmdbApiKey}
            onChange={(e) => setTmdbApiKey(e.target.value)}
            placeholder="Your TMDB API key"
            className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* OpenSubtitles Integration (optional) */}
      <div className="space-y-3 pt-4 border-t border-gray-700">
        <h3 className="text-sm font-medium text-gray-300">
          OpenSubtitles (optional)
        </h3>
        <p className="text-xs text-gray-500">
          Configure now or skip and add later via Admin → Configuration.
        </p>
        <OpenSubtitlesFields
          apiKey={opensubtitlesApiKey}
          username={opensubtitlesUsername}
          password={opensubtitlesPassword}
          onApiKeyChange={setOpensubtitlesApiKey}
          onUsernameChange={setOpensubtitlesUsername}
          onPasswordChange={setOpensubtitlesPassword}
          showHeader={false}
        />
      </div>

      {/* Output Directories */}
      <div className="pt-4 border-t border-gray-700">
        <OutputDirectoriesSection
          outputDir={outputDir}
          setOutputDir={setOutputDir}
          tvOutputDir={tvOutputDir}
          setTvOutputDir={setTvOutputDir}
          moviesOutputDir={moviesOutputDir}
          setMoviesOutputDir={setMoviesOutputDir}
          validationResults={dirResults}
        />
      </div>

      {error && (
        <div className="px-3 py-2 bg-red-900/30 border border-red-700 rounded text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm font-medium transition-colors"
        >
          {isPending ? "Validating..." : "Validate & Continue"}
        </button>
      </div>
    </form>
  );
}
