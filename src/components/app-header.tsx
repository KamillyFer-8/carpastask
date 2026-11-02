import Link from "next/link";
import { AppLogo } from "./logo";
export function AppHeader() {
  return (
    <header className="app-header">
      <div className="header-inner">
        <Link href="/" className="brand" aria-label="CarpasTask home">
          <span className="brand-icon">
            <AppLogo />
          </span>
          <span>
            carpas<span className="wordmark-light">task</span>
            <span className="brand-dot">.</span>
          </span>
        </Link>
        <span className="header-note">
          <span className="tiny-dot" />
          Tasks / calendar
        </span>
      </div>
    </header>
  );
}
