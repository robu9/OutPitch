import Link from "next/link";
import { Logo } from "@/components/logo";

const columns = [
  {
    title: "Product",
    links: [
      { href: "#how-it-works", label: "How it works" },
      { href: "#features", label: "Features" },
      { href: "#pricing", label: "Pricing" },
      { href: "#faq", label: "FAQ" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "#", label: "About" },
      { href: "#", label: "Blog" },
      { href: "#", label: "Careers" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "#", label: "Privacy" },
      { href: "#", label: "Terms" },
    ],
  },
];

export function MarketingFooter() {
  return (
    <footer className="border-t border-border bg-bg-base py-16">
      <div className="mx-auto max-w-5xl px-5 md:px-8">
        <div className="grid gap-10 sm:grid-cols-2 md:grid-cols-4">
          <div>
            <Logo size="sm" />
            <p className="mt-4 text-sm text-text-secondary text-pretty">
              AI job outreach with memory. Built for people actively searching
              for their next role.
            </p>
          </div>
          {columns.map((col) => (
            <div key={col.title}>
              <h3 className="text-sm font-medium text-white">{col.title}</h3>
              <ul className="mt-4 space-y-2">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-text-secondary transition-colors hover:text-white"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 sm:flex-row">
          <p className="text-xs text-text-secondary">
            © {new Date().getFullYear()} Outpitch. All rights reserved.
          </p>
          <div className="flex gap-4">
            <Link
              href="/sign-in"
              className="text-xs text-text-secondary hover:text-white"
            >
              Log in
            </Link>
            <Link
              href="/sign-up"
              className="text-xs text-text-secondary hover:text-white"
            >
              Sign up
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
