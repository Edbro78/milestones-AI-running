import { LoginForm } from "@/components/LoginForm";

export default function LoginPage() {
  return (
    <main
      className="app-min-h flex items-center justify-center"
      style={{
        paddingTop: "max(3rem, env(safe-area-inset-top))",
        paddingBottom: "max(3rem, env(safe-area-inset-bottom))",
        paddingLeft: "max(1rem, env(safe-area-inset-left))",
        paddingRight: "max(1rem, env(safe-area-inset-right))",
      }}
    >
      <div className="mx-auto w-full max-w-5xl">
        <LoginForm />
      </div>
    </main>
  );
}
