'use client';

import './style.css';
import { useEffect, useState } from 'react';
import { getCsrfToken } from 'next-auth/react';

export default function LoginPage() {
  const [csrfToken, setCsrfToken] = useState<string | undefined>();

  useEffect(() => {
    let isMounted = true;

    getCsrfToken().then((token) => {
      if (isMounted) {
        setCsrfToken(token ?? undefined);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="login-page">
      <div className="login-box">
        <h1 className="login-title">馬偕後台登入</h1>
        <form action="/api/auth/callback/credentials" method="POST">
          <input type="hidden" name="csrfToken" value={csrfToken ?? ''} />
          <div className="input-group">
            <label htmlFor="username">帳號</label>
            <input type="text" id="username" name="username" required />
          </div>
          <div className="input-group">
            <label htmlFor="password">密碼</label>
            <input type="password" id="password" name="password" required />
          </div>
          <button type="submit" className="login-button" disabled={!csrfToken}>Login</button>
        </form>
      </div>
    </div>
  );
}
