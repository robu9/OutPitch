import Link from "next/link";
import { Logo } from "@/components/logo";

export function MarketingFooter() {
  return (
    <footer className="border-t border-border bg-background py-12">
      <div className="mx-auto max-w-6xl px-5">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-8 pb-8 border-b border-border">
          <div className="space-y-3">
            <Logo size="sm" href="/" />
            <p className="text-sm text-muted-foreground max-w-xs">
              Job outreach with memory.
            </p>
          </div>

          <div className="flex gap-12 text-sm">
            <ul className="space-y-2 text-muted-foreground">
              <li><a href="#how-it-works" className="hover:text-white transition-colors">How it works</a></li>
              <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
            </ul>
            <ul className="space-y-2 text-muted-foreground">
              <li><Link href="/sign-in" className="hover:text-white transition-colors">Sign in</Link></li>
              <li><Link href="/sign-up" className="hover:text-white transition-colors">Sign up</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-6 text-xs text-muted-foreground">
          © {new Date().getFullYear()} Outpitch
        </div>
      </div>
    </footer>
  );
}
