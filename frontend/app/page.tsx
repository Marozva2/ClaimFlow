import Link from "next/link";


export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 p-6">
      <div className="max-w-2xl text-center">
        <h1 className="text-5xl font-bold">
          ClaimFlow
        </h1>

        <p className="mt-4 text-lg text-gray-600">
          A claims management platform for
          insurance operations.
        </p>

        <div className="mt-8 flex justify-center gap-4">
          <Link
            href="/login"
            className="rounded bg-black px-6 py-3 text-white"
          >
            Sign in
          </Link>

          <Link
            href="/register"
            className="rounded border bg-white px-6 py-3"
          >
            Create account
          </Link>
        </div>
      </div>
    </main>
  );
}