"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Mail } from "lucide-react";

export default function LoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/dashboard");
    }
  }, [status, router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-white to-brand-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-lg">
        <div className="flex items-center justify-center">
          <div className="rounded-full bg-brand-100 p-3">
            <Mail className="h-8 w-8 text-brand-600" />
          </div>
        </div>
        <h1 className="mt-6 text-center text-2xl font-bold text-slate-900">
          Sign in to InboxAI
        </h1>
        <p className="mt-2 text-center text-sm text-slate-600">
          We&apos;ll request access to read, label, and send Gmail on your behalf.
        </p>

        <button
          onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
          disabled={status === "loading"}
          className="mt-8 flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 font-medium text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continue with Google
        </button>

        <p className="mt-6 text-center text-xs text-slate-500">
          By signing in, you agree to let InboxAI read your Gmail metadata and
          message contents for analysis. Tokens stay in your session only.
        </p>
      </div>
    </main>
  );
}
