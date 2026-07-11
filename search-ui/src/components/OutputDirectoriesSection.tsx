import { useState, useEffect } from "react";
import type { DirsValidationResponse } from "../types/config";

interface OutputDirectoriesSectionProps {
  outputDir: string;
  setOutputDir: (val: string) => void;
  tvOutputDir: string;
  setTvOutputDir: (val: string) => void;
  moviesOutputDir: string;
  setMoviesOutputDir: (val: string) => void;
  validationResults?: DirsValidationResponse | null;
  disabled?: boolean;
}

export default function OutputDirectoriesSection({
  outputDir,
  setOutputDir,
  tvOutputDir,
  setTvOutputDir,
  moviesOutputDir,
  setMoviesOutputDir,
  validationResults,
  disabled = false,
}: OutputDirectoriesSectionProps) {
  const [showInfoModal, setShowInfoModal] = useState(false);

  // Close modal on Escape key
  useEffect(() => {
    if (!showInfoModal) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowInfoModal(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [showInfoModal]);

  // Lock body scroll while modal is open
  useEffect(() => {
    if (showInfoModal) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = '' };
    }
  }, [showInfoModal]);

  const dirFields = [
    {
      key: "output_directory" as const,
      label: "IPTV Output Directory",
      value: outputDir,
      set: setOutputDir,
      placeholder: "./output",
    },
    {
      key: "tv_output_directory" as const,
      label: "TV Shows Output Directory",
      value: tvOutputDir,
      set: setTvOutputDir,
      placeholder: "./output/media/tv",
    },
    {
      key: "movies_output_directory" as const,
      label: "Movies Output Directory",
      value: moviesOutputDir,
      set: setMoviesOutputDir,
      placeholder: "./output/media/movies",
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-300">
          Output Directories
        </h3>
        <button
          type="button"
          onClick={() => setShowInfoModal(true)}
          className="text-gray-400 hover:text-gray-200 transition-colors inline-flex items-center gap-1 text-xs"
          aria-label="More info about output directories"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          How do these work?
        </button>
      </div>
      <p className="text-xs text-gray-400">
        Directories will be created if they don't exist.
      </p>
      {dirFields.map(({ key, label, value, set, placeholder }) => {
        const result = validationResults?.results[key];
        return (
          <div key={key}>
            <label className="block text-sm text-gray-400 mb-1">
              {label}
            </label>
            <input
              type="text"
              value={value}
              onChange={(e) => set(e.target.value)}
              placeholder={placeholder}
              disabled={disabled}
              className={`w-full px-3 py-2 bg-gray-900 border rounded text-sm text-gray-200 placeholder-gray-500 focus:outline-none ${
                result && !result.valid
                  ? "border-red-500 focus:border-red-500"
                  : result && result.valid
                    ? "border-green-500 focus:border-green-500"
                    : "border-gray-600 focus:border-blue-500"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
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

      {/* Info Modal */}
      {showInfoModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
          onClick={() => setShowInfoModal(false)}
        >
          <div
            className="bg-gray-900 rounded-xl border border-gray-700 shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-700 flex-shrink-0">
              <h2 className="text-lg font-bold text-white">About Output Directories</h2>
              <button
                onClick={() => setShowInfoModal(false)}
                className="text-gray-400 hover:text-white transition-colors p-1"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-white mb-2">Local to the IPTV Container</h3>
                <p className="text-sm text-gray-300">
                  These directory paths are <span className="text-blue-400 font-medium">inside the iptv-alchemy container</span>. They are not paths on your host machine or in your media server container.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-white mb-2">Docker Volume Mounting</h3>
                <p className="text-sm text-gray-300 mb-3">
                  To use these directories with Emby or Jellyfin, you need to mount them in your <code className="bg-gray-800 px-1.5 py-0.5 rounded text-xs">docker-compose.yml</code>. We recommend using a parent directory (like <code className="bg-gray-800 px-1.5 py-0.5 rounded text-xs">./output</code>) so you can set permissions appropriately for all subdirectories.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-white mb-2">Example docker-compose.yml</h3>
                <pre className="bg-gray-950 border border-gray-700 rounded-lg p-4 text-xs text-gray-300 overflow-x-auto">
{`version: '3.8'
services:
  iptv-alchemy:
    image: your-iptv-alchemy:latest
    volumes:
      - ./output:/app/output
    # ... other config

  emby:
    image: emby/embyserver:latest
    volumes:
      - ./output/media/tv:/media/tv:ro
      - ./output/media/movies:/media/movies:ro
    # ... other config`}
                </pre>
                <p className="text-xs text-gray-400 mt-2">
                  Note: <code className="bg-gray-800 px-1 py-0.5 rounded">:ro</code> mounts the volume as read-only, which is recommended for media servers.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-white mb-2">Configuring Your Media Server</h3>
                <p className="text-sm text-gray-300 mb-3">
                  In your media server (Emby or Jellyfin), you need to configure your library to point to the mounted paths:
                </p>
                <ul className="text-sm text-gray-300 space-y-1 list-disc list-inside">
                  <li><span className="text-white">TV Shows:</span> Add a library pointing to <code className="bg-gray-800 px-1.5 py-0.5 rounded text-xs">/media/tv</code></li>
                  <li><span className="text-white">Movies:</span> Add a library pointing to <code className="bg-gray-800 px-1.5 py-0.5 rounded text-xs">/media/movies</code></li>
                </ul>
              </div>

              <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                <p className="text-xs text-gray-400">
                  <strong className="text-white">Need more help?</strong> Consult the{" "}
                  <a href="https://emby.media/installation/docker.html" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">
                    Emby documentation
                  </a>{" "}
                  or{" "}
                  <a href="https://jellyfin.org/docs/general/administration/docker/" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">
                    Jellyfin documentation
                  </a>{" "}
                  for detailed setup instructions.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
