import { SignIn } from "@clerk/nextjs";
import { Logo } from "@/components/logo";

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-bg-base">
      <header className="flex h-14 items-center px-6">
        <Logo size="sm" />
      </header>
      <div className="flex flex-1 items-center justify-center px-5 py-16">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h1 className="text-xl font-medium tracking-tight text-white">
              Welcome back
            </h1>
            <p className="mt-1.5 text-sm text-text-secondary">
              Sign in to continue your job search
            </p>
          </div>
          <SignIn
            routing="path"
            path="/sign-in"
            signUpUrl="/sign-up"
            forceRedirectUrl="/onboarding"
          />
        </div>
      </div>
    </div>
  );
}
