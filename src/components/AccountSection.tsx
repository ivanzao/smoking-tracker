import { UseSyncAPI } from '@/hooks/useSync';

interface AccountSectionProps {
  sync: UseSyncAPI;
  titleClassName: string;
}

function syncSummary({ syncing, failed, pending, status }: UseSyncAPI): string {
  if (status === 'expired') return 'Sem login: salvando só neste aparelho';
  if (syncing) return 'Sincronizando…';
  if (failed) return 'Não foi possível sincronizar. Tentamos de novo ao voltar para o app';
  if (pending > 0) return `${pending} ${pending === 1 ? 'registro' : 'registros'} a enviar`;
  return 'Tudo sincronizado';
}

export const AccountSection = ({ sync, titleClassName }: AccountSectionProps) => {
  const handleSignOut = () => {
    if (sync.pending > 0) {
      const label = sync.pending === 1 ? '1 registro ainda não enviado' : `${sync.pending} registros ainda não enviados`;
      if (!window.confirm(`Você tem ${label}. Sair apaga isso deste aparelho. Sair mesmo assim?`)) return;
    }
    void sync.signOut();
  };

  return (
    <section>
      <h2 className={titleClassName}>Conta</h2>
      <div className="bg-card border-2 border-border shadow-brutal p-4 space-y-3">
        <div className="min-w-0">
          <p className="text-sm font-bold truncate">{sync.email}</p>
          <p className="text-[10px] text-muted-foreground">{syncSummary(sync)}</p>
        </div>
        <button
          onClick={handleSignOut}
          className="w-full py-2.5 border-2 border-border shadow-brutal-sm text-[11px] font-bold uppercase tracking-wide active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-transform"
        >
          Sair da conta
        </button>
      </div>
    </section>
  );
};
