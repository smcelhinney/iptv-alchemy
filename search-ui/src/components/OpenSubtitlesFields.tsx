import { useState } from "react";

interface OpenSubtitlesFieldsProps {
  apiKey: string;
  username: string;
  password: string;
  onApiKeyChange: (v: string) => void;
  onUsernameChange: (v: string) => void;
  onPasswordChange: (v: string) => void;
  /**
   * Render the section header with the "Why are three values required?" link.
   * Defaults to true. Set false when embedding inside a section that already
   * provides its own header.
   */
  showHeader?: boolean;
}

export default function OpenSubtitlesFields({
  apiKey,
  username,
  password,
  onApiKeyChange,
  onUsernameChange,
  onPasswordChange,
  showHeader = true,
}: OpenSubtitlesFieldsProps) {
  const [showInfo, setShowInfo] = useState(false);

  return (
    <div className="space-y-4">
      {showHeader && (
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">OpenSubtitles</h3>
          <button
            type="button"
            onClick={() => setShowInfo(true)}
            className="text-gray-400 hover:text-gray-200 transition-colors inline-flex items-center gap-1 text-xs"
            aria-label="More info about OpenSubtitles credentials"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Why are three values required?
          </button>
        </div>
      )}

      <div className="space-y-3">
        <Field
          label="API Key"
          value={apiKey}
          onChange={(e) => onApiKeyChange(e.target.value)}
          type="password"
          placeholder="Application API key from opensubtitles.com"
        />
        <Field
          label="Username"
          value={username}
          onChange={(e) => onUsernameChange(e.target.value)}
        />
        <Field
          label="Password"
          value={password}
          onChange={(e) => onPasswordChange(e.target.value)}
          type="password"
        />
      </div>

      {showInfo && <OpenSubtitlesInfoModal onClose={() => setShowInfo(false)} />}
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

function OpenSubtitlesInfoModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 rounded-xl border border-gray-700 shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-700 flex-shrink-0">
          <h2 className="text-base font-bold text-white">OpenSubtitles credentials</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-sm text-gray-300">
          <p>
            OpenSubtitles uses two separate authentication layers, so all three
            values are required to download subtitles:
          </p>

          <div className="space-y-3">
            <div>
              <p className="text-white font-medium">API Key — identifies your application</p>
              <p className="mt-1 text-gray-400">
                Required on <em>every</em> API call. Register a consumer at{" "}
                <a
                  href="https://www.opensubtitles.com/consumers"
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-400 hover:underline"
                >
                  opensubtitles.com/consumers
                </a>{" "}
                to get one. Without it, no endpoint — including login — will respond.
              </p>
            </div>
            <div>
              <p className="text-white font-medium">Username &amp; Password — your account</p>
              <p className="mt-1 text-gray-400">
                Used by <code className="text-gray-200">/login</code> (with the API
                Key in the header) to obtain a bearer token. The token authorises
                the <code className="text-gray-200">/download</code> endpoint and
                counts subtitle downloads against your daily quota.
              </p>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg border border-gray-700 p-3 text-xs text-gray-400">
            <p>
              <span className="text-gray-200 font-medium">Tip:</span> searching
              for subtitles only needs the API Key. The username/password pair is
              only required when you download and link a subtitle to a movie or
              episode.
            </p>
          </div>
        </div>

        <div className="p-4 border-t border-gray-700 flex justify-end flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm font-medium transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
