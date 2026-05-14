'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

const LINKS = [
  { href: '/strategies', label: 'Strategies' },
  { href: '/sessions', label: 'Sessions' },
  { href: '/calendar', label: 'Calendar' },
];

export default function Nav() {
  const { user, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.push('/');
  }

  return (
    <nav className="nav">
      <Link href="/" className="nav-brand">BackTPal</Link>
      <div className="nav-links">
        {user ? (
          <>
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={pathname.startsWith(link.href) ? 'active' : ''}
              >
                {link.label}
              </Link>
            ))}
            <button className="nav-signout" onClick={handleSignOut}>Sign out</button>
          </>
        ) : (
          <>
            <Link href="/login" className="nav-link">
              Log in
            </Link>
            <Link href="/register" className="nav-signup">
              Sign up
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
