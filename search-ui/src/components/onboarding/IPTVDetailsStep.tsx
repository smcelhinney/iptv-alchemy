import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { fetchConfig, validateIptvCredentials } from "../../lib/api";

interface Props {
  onNext: () => void;
}

export default function IPTVDetailsStep({ onNext }: Props) {
  const { data: config } = useQuery({
    queryKey: ["config"],
    queryFn: fetchConfig,
  });

  const [serverUrl, setServerUrl] = useState(config?.xtream_server_url ?? "");
  const [username, setUsername] = useState(config?.xtream_username ?? "");
  const [password, setPassword] = useState(config?.xtream_password ?? "");

  // Populate from config once loaded
  const populated = config !== undefined;
  if (populated && !serverUrl && !username && !password) {
    setServerUrl(config.xtream_server_url ?? "");
    setUsername(config.xtream_username ?? "");
    setPassword(config.xtream_password ?? "");
  }

  const [error, setError] = useState<string | null>(null);

  const validateMutation = useMutation({
    mutationFn: () =>
      validateIptvCredentials({
        xtream_server_url: serverUrl,
        xtream_username: username,
        xtream_password: password,
      }),
    onSuccess: (result) => {
      if (result.valid) {
        setError(null);
        onNext();
      } else {
        setError(result.error ?? "Validation failed");
      }
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    validateMutation.mutate();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold mb-1">IPTV Connection</h2>
        <p className="text-sm text-gray-400">
          Enter your Xtream Codes API credentials to connect to your IPTV provider.
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

      {error && (
        <div className="px-3 py-2 bg-red-900/30 border border-red-700 rounded text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={validateMutation.isPending}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm font-medium transition-colors"
        >
          {validateMutation.isPending ? "Validating..." : "Validate & Continue"}
        </button>
      </div>
    </form>
  );
}
