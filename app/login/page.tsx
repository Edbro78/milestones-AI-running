import { LoginForm } from "@/components/LoginForm";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center px-4 py-16">
      <div className="mx-auto w-full max-w-5xl">
        <LoginForm />
      </div>
    </main>
  );
}
