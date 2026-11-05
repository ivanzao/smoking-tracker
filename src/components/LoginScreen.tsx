import { FormEvent, useState } from 'react';
import { UseSyncAPI } from '@/hooks/useSync';

interface LoginScreenProps {
  sync: UseSyncAPI;
  /** Present when the app stays usable without login, as with an expired session. */
  onCancel?: () => void;
}

const FIELD =
  'w-full bg-background border-2 border-border p-3 text-base font-bold focus:outline-none focus:ring-2 focus:ring-ring';
const PRIMARY_BUTTON =
  'w-full py-3 bg-primary text-primary-foreground border-2 border-border shadow-brutal-sm font-bold uppercase tracking-wide text-sm active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-transform disabled:opacity-50';
const LINK_BUTTON = 'w-full py-2 text-xs font-bold uppercase tracking-wider hover:underline';

export const LoginScreen = ({ sync, onCancel }: LoginScreenProps) => {
  const [email, setEmail] = useState(sync.email ?? '');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSendCode = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const sent = await sync.sendCode(email.trim());
    setBusy(false);
    if (sent) setStep('code');
    else setError('Não foi possível enviar o código. Tente de novo em instantes.');
  };

  const handleVerify = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const verified = await sync.verifyCode(email.trim(), code.trim());
    setBusy(false);
    if (verified) onCancel?.();
    else setError('Código inválido ou expirado.');
  };

  return (
    <main className="fixed inset-0 z-[60] overflow-y-auto bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-sm bg-card border-2 border-border shadow-brutal p-6 space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">Smoking Tracker</h1>

        {step === 'email' ? (
          <form onSubmit={handleSendCode} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="login-email" className="text-xs font-bold uppercase tracking-wider">
                E-mail
              </label>
              <input
                id="login-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={FIELD}
              />
            </div>
            <button type="submit" disabled={busy} className={PRIMARY_BUTTON}>
              Enviar código
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerify} className="space-y-4">
            <p className="text-sm">Enviamos um código para {email}.</p>
            <div className="space-y-2">
              <label htmlFor="login-code" className="text-xs font-bold uppercase tracking-wider">
                Código
              </label>
              <input
                id="login-code"
                required
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className={FIELD + ' tracking-widest'}
              />
            </div>
            <button type="submit" disabled={busy} className={PRIMARY_BUTTON}>
              Entrar
            </button>
            <button
              type="button"
              onClick={() => {
                setStep('email');
                setCode('');
                setError(null);
              }}
              className={LINK_BUTTON}
            >
              Trocar e-mail ou reenviar
            </button>
          </form>
        )}

        {error && (
          <p role="alert" className="text-sm font-bold text-destructive">
            {error}
          </p>
        )}

        {onCancel && (
          <button type="button" onClick={onCancel} className={LINK_BUTTON}>
            Agora não
          </button>
        )}
      </div>
    </main>
  );
};
