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
      <div className="panel p-4 space-y-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">{sync.email}</p>
          <p className="text-sm text-muted-foreground">{syncSummary(sync)}</p>
        </div>
        <button
          onClick={handleSignOut}
          className="w-full min-h-11 rounded-md bg-muted text-sm font-semibold active:scale-[0.98] transition-transform"
        >
          Sair da conta
        </button>
      </div>
    </section>
  );
};
