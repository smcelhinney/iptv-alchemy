import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { fetchConfig, updateConfig, validateOutputDirs } from "../../lib/api";
import type { DirsValidationResponse } from "../../types/config";

interface Props {
  onNext: () => void;
  onBack: () => void;
}

export default function OutputDirsStep({ onNext, onBack }: Props) {
  const { data: config } = useQuery({
    queryKey: ["config"],
    queryFn: fetchConfig,
  });

  const [embyServerUrl, setEmbyServerUrl] = useState("");
  const [embyApiKey, setEmbyApiKey] = useState("");
  const [outputDir, setOutputDir] = useState("");
  const [tvOutputDir, setTvOutputDir] = useState("");
  const [moviesOutputDir, setMoviesOutputDir] = useState("");
  const [validationResults, setValidationResults] = useState<DirsValidationResponse | null>(null);

  // Populate from config once loaded
  useEffect(() => {
    if (config && !outputDir) {
      setEmbyServerUrl(config.emby_server_url ?? "");
      setEmbyApiKey(config.emby_api_key ?? "");
      setOutputDir(config.output_directory ?? "./output");
      setTvOutputDir(config.tv_output_directory ?? "./output/media/tv");
      setMoviesOutputDir(config.movies_output_directory ?? "./output/media/movies");
    }
  }, [config]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveEmbyMutation = useMutation({
    mutationFn: () =>
      updateConfig({
        emby_server_url: embyServerUrl,
        emby_api_key: embyApiKey,
      }),
  });

  const validateMutation = useMutation({
    mutationFn: () =>
      validateOutputDirs({
        output_directory: outputDir,
        tv_output_directory: tvOutputDir,
        movies_output_directory: moviesOutputDir,
      }),
    onSuccess: (result) => {
      setValidationResults(result);
      if (result.valid) {
        // Also save Emby config
        saveEmbyMutation.mutate();
        onNext();
      }
    },
    onError: () => {
      setValidationResults({
        valid: false,
        results: {
          output_directory: { valid: false, error: "Validation request failed" },
          tv_output_directory: { valid: false, error: "Validation request failed" },
          movies_output_directory: { valid: false, error: "Validation request failed" },
        },
      });
    },
  });

  const handleSave = () => {
    setValidationResults(null);
    validateMutation.mutate();
  };

  const dirFields = [
    { key: "output_directory" as const, label: "IPTV Output Directory", value: outputDir, set: setOutputDir },
    { key: "tv_output_directory" as const, label: "TV Shows Output Directory", value: tvOutputDir, set: setTvOutputDir },
    { key: "movies_output_directory" as const, label: "Movies Output Directory", value: moviesOutputDir, set: setMoviesOutputDir },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold mb-1">Output Directories</h2>
        <p className="text-sm text-gray-400">
          Configure where processed files are stored. Directories will be created if they don't exist.
        </p>
      </div>

      {/* Emby config */}
      <div className="space-y-3 pb-4 border-b border-gray-700">
        <h3 className="text-sm font-medium text-gray-300">Emby Integration (optional)</h3>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Emby Server URL</label>
          <input
            type="text"
            value={embyServerUrl}
            onChange={(e) => setEmbyServerUrl(e.target.value)}
            placeholder="http://emby:8096"
            className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Emby API Key</label>
          <input
            type="password"
            value={embyApiKey}
            onChange={(e) => setEmbyApiKey(e.target.value)}
            className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Directory fields */}
      <div className="space-y-3">
        {dirFields.map(({ key, label, value, set }) => {
          const result = validationResults?.results[key];
          return (
            <div key={key}>
              <label className="block text-sm text-gray-400 mb-1">{label}</label>
              <input
                type="text"
                value={value}
                onChange={(e) => set(e.target.value)}
                className={`w-full px-3 py-2 bg-gray-900 border rounded text-sm text-gray-200 placeholder-gray-500 focus:outline-none ${
                  result && !result.valid
                    ? "border-red-500 focus:border-red-500"
                    : result && result.valid
                      ? "border-green-500 focus:border-green-500"
                      : "border-gray-600 focus:border-blue-500"
                }`}
                required
              />
              {result && !result.valid && (
                <p className="mt-1 text-xs text-red-400">{result.error}</p>
              )}
              {result && result.valid && (
                <p className="mt-1 text-xs text-green-400">Directory ready</p>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex justify-between pt-4 border-t border-gray-700">
        <button
          onClick={onBack}
          className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 transition-colors"
        >
          Back
        </button>
        <button
          onClick={handleSave}
          disabled={validateMutation.isPending}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm font-medium transition-colors"
        >
          {validateMutation.isPending ? "Validating..." : "Save & Continue"}
        </button>
      </div>
    </div>
  );
}
