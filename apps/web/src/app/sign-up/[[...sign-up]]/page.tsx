import { SignUp } from "@clerk/nextjs";
import { Logo } from "@/components/logo";

const clerkAppearance = {
  layout: {
    socialButtonsPlacement: "top" as const,
    socialButtonsVariant: "blockButton" as const,
  },
};

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-bg-base">
      <header className="flex h-14 items-center px-6">
        <Logo size="sm" />
      </header>
      <div className="flex flex-1 items-center justify-center px-5 py-16">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h1 className="text-xl font-medium tracking-tight text-foreground">
              Create your account
            </h1>
            <p className="mt-1.5 text-sm text-text-secondary">
              Continue with LinkedIn to import your experience and start outreach
            </p>
          </div>
          <SignUp
            routing="path"
            path="/sign-up"
            signInUrl="/sign-in"
            forceRedirectUrl="/onboarding"
            appearance={clerkAppearance}
          />
        </div>
      </div>
    </div>
  );
}
