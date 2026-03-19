"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        router.push("/dashboard");
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error || "Giriş başarısız");
      }
    } catch {
      setError("Bağlantı hatası");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-violet-500 flex items-center justify-center text-white font-bold text-lg">
            G
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold text-white">GrafikCem News AI</h1>
            <p className="text-slate-500 text-sm mt-1">Kişisel içerik paneli</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Şifre
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              autoFocus
              required
              className="w-full rounded-xl border border-slate-700/60 bg-slate-900 px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-slate-500 transition-colors"
            />
          </div>

          {error && (
            <p className="text-sm text-red-400 text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full rounded-xl bg-[#C8F135] py-3 text-sm font-bold text-slate-950 hover:bg-[#d4f54a] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {loading ? "Giriş yapılıyor..." : "Giriş Yap →"}
          </button>
        </form>
      </div>
    </div>
  );
}
