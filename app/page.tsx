import { MarketplaceDashboard } from "@/components/marketplace-dashboard";
import { getMlConnectionStatus } from "@/lib/mercado-livre";

export default async function Home({
  searchParams
}: {
  searchParams?: Promise<{ ml?: string }>;
}) {
  const mlStatus = await getMlConnectionStatus();
  const params = await searchParams;

  return <MarketplaceDashboard mlStatus={mlStatus} mlMessage={getMlMessage(params?.ml)} />;
}

function getMlMessage(status?: string) {
  if (status === "connected") {
    return { kind: "success" as const, text: "Mercado Livre conectado. Agora vamos consultar os recursos disponiveis para sua conta." };
  }

  if (status === "missing_code") {
    return { kind: "warning" as const, text: "O callback voltou sem codigo de autorizacao." };
  }

  if (status === "invalid_state") {
    return { kind: "warning" as const, text: "O estado do OAuth nao confere. Tente conectar novamente." };
  }

  if (status === "token_error") {
    return {
      kind: "warning" as const,
      text: "Nao foi possivel trocar o codigo por token. Confira redirect URI, client id e secret."
    };
  }

  return null;
}
