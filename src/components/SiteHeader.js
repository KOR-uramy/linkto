import Link from 'next/link';

export default function SiteHeader() {
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link href="/" className="site-logo" aria-label="LinkTo 홈">
          LinkTo
        </Link>
      </div>
    </header>
  );
}
