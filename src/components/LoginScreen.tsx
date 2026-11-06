import { FormEvent, useState } from 'react';
import { UseSyncAPI } from '@/hooks/useSync';

interface LoginScreenProps {
  sync: UseSyncAPI;
  /** Present when the app stays usable without login, as with an expired session. */
  onCancel?: () => void;
}

const FIELD =
  'w-full rounded-md bg-input border border-border p-3 text-base font-medium focus-visible:border-foreground/60';
const PRIMARY_BUTTON =
  'w-full min-h-12 rounded-md bg-primary text-primary-foreground font-semibold text-sm active:scale-[0.98] transition-transform disabled:opacity-50';
const LINK_BUTTON = 'w-full min-h-11 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground';

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
      <div className="panel w-full max-w-sm p-6 space-y-4">
        <h1 className="text-2xl font-semibold">Smoking Tracker</h1>

        {step === 'email' ? (
          <form onSubmit={handleSendCode} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="login-email" className="section-title">
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
              <label htmlFor="login-code" className="section-title">
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
          <p role="alert" className="text-sm font-medium text-destructive">
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
