import Link from 'next/link';

export default function BackHomeButton() {
  return (
    <Link href="/" className="nav-back-button">
      回到首頁
    </Link>
  );
}
