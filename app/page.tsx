import {
  ArrowDownUp,
  BarChart3,
  Bell,
  Clock3,
  ExternalLink,
  Gauge,
  Lock,
  PackageSearch,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  TrendingUp
} from "lucide-react";
import { getMlConnectionStatus } from "@/lib/mercado-livre";

const marketplaceNav = [
  { name: "Dashboard", status: "ativo", icon: Gauge },
  { name: "Mercado Livre", status: "ativo", icon: ShoppingBag },
  { name: "Amazon", status: "em breve", icon: Lock },
  { name: "Shopee", status: "em breve", icon: Lock }
];

const categories = [
  { name: "Eletronicos", products: 20, signal: "forte", change: "+18%" },
  { name: "Casa e cozinha", products: 16, signal: "moderado", change: "+9%" },
  { name: "Ferramentas", products: 12, signal: "estavel", change: "+4%" },
  { name: "Beleza", products: 18, signal: "forte", change: "+21%" }
];

const products = [
  {
    rank: 1,
    title: "Fone Bluetooth com cancelamento ativo",
    category: "Eletronicos",
    price: "R$ 189,90",
    trend: "Busca crescente",
    score: 94
  },
  {
    rank: 2,
    title: "Kit organizador hermetico para cozinha",
    category: "Casa e cozinha",
    price: "R$ 74,50",
    trend: "Mais desejado",
    score: 88
  },
  {
    rank: 3,
    title: "Parafusadeira 12V com maleta",
    category: "Ferramentas",
    price: "R$ 219,00",
    trend: "Ranking recorrente",
    score: 82
  },
  {
    rank: 4,
    title: "Escova secadora bivolt compacta",
    category: "Beleza",
    price: "R$ 129,99",
    trend: "Popular",
    score: 79
  }
];

const searches = ["smartwatch feminino", "air fryer 5 litros", "camera wifi", "mochila executiva"];

export default async function Home({
  searchParams
}: {
  searchParams?: Promise<{ ml?: string }>;
}) {
  const mlStatus = await getMlConnectionStatus();
  const params = await searchParams;
  const mlMessage = getMlMessage(params?.ml);

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="Navegacao principal">
        <div className="brand">
          <div className="brand-mark">
            <PackageSearch size={22} />
          </div>
          <div>
            <strong>Products Finder</strong>
            <span>Monitor pessoal</span>
          </div>
        </div>

        <nav className="nav-list">
          {marketplaceNav.map((item) => {
            const Icon = item.icon;
            const locked = item.status !== "ativo";

            return (
              <a
                href={locked ? undefined : "#mercado-livre"}
                aria-disabled={locked}
                className={locked ? "nav-item locked" : "nav-item active"}
                key={item.name}
              >
                <Icon size={18} />
                <span>{item.name}</span>
                {locked && <small>Em breve</small>}
              </a>
            );
          })}
        </nav>

        <div className="sidebar-note">
          <ShieldCheck size={18} />
          <span>Sem login proprio. O OAuth do Mercado Livre fica isolado no servidor.</span>
        </div>
      </aside>

      <section className="content">
        <header className="topbar">
          <div>
            <p className="eyebrow">Mercado Livre primeiro</p>
            <h1>Acompanhe produtos, tendencias e sinais de oportunidade.</h1>
          </div>
          <div className="top-actions">
            <a
              className={mlStatus.isConfigured ? "connect-button" : "connect-button disabled"}
              href={mlStatus.isConfigured ? "/api/ml/auth" : undefined}
              aria-disabled={!mlStatus.isConfigured}
            >
              <Bell size={18} />
              <span>{mlStatus.isConnected ? "Reconectar ML" : "Conectar ML"}</span>
            </a>
          </div>
        </header>

        {mlMessage && <div className={`status-banner ${mlMessage.kind}`}>{mlMessage.text}</div>}

        {!mlStatus.isConfigured && (
          <div className="status-banner warning">
            Configure `MERCADO_LIVRE_CLIENT_ID`, `MERCADO_LIVRE_CLIENT_SECRET` e
            `MERCADO_LIVRE_REDIRECT_URI` no `.env.local`.
          </div>
        )}

        <section className="metric-grid" aria-label="Resumo">
          <Metric icon={TrendingUp} label="Sinais ativos" value="42" detail="+13 esta semana" />
          <Metric icon={BarChart3} label="Categorias" value="4" detail="monitoramento inicial" />
          <Metric icon={ArrowDownUp} label="Score medio" value="86" detail="potencial de demanda" />
          <Metric icon={Clock3} label="Atualizacao" value="Manual" detail="coleta real vem depois" />
        </section>

        <section className="workspace" id="mercado-livre">
          <div className="panel main-panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Mercado Livre</p>
                <h2>Produtos em destaque</h2>
              </div>
              <div className="search-box">
                <Search size={18} />
                <span>Buscar produto ou categoria</span>
              </div>
            </div>

            <div className="product-table" role="table" aria-label="Produtos recomendados">
              <div className="table-row table-head" role="row">
                <span>Rank</span>
                <span>Produto</span>
                <span>Categoria</span>
                <span>Preco</span>
                <span>Score</span>
              </div>
              {products.map((product) => (
                <div className="table-row" role="row" key={product.title}>
                  <span className="rank">#{product.rank}</span>
                  <span>
                    <strong>{product.title}</strong>
                    <small>{product.trend}</small>
                  </span>
                  <span>{product.category}</span>
                  <span>{product.price}</span>
                  <span>
                    <meter min="0" max="100" value={product.score} />
                    <b>{product.score}</b>
                  </span>
                </div>
              ))}
            </div>
          </div>

          <aside className="side-panel">
            <div className="panel">
              <div className="panel-header compact">
                <h2>Categorias</h2>
                <Sparkles size={18} />
              </div>
              <div className="category-list">
                {categories.map((category) => (
                  <div className="category-item" key={category.name}>
                    <div>
                      <strong>{category.name}</strong>
                      <span>{category.products} produtos rastreados</span>
                    </div>
                    <small>{category.change}</small>
                  </div>
                ))}
              </div>
            </div>

            <div className="panel">
              <div className="panel-header compact">
                <h2>Buscas em alta</h2>
                <ExternalLink size={18} />
              </div>
              <div className="tag-list">
                {searches.map((search) => (
                  <span key={search}>{search}</span>
                ))}
              </div>
            </div>
          </aside>
        </section>
      </section>
    </main>
  );
}

function getMlMessage(status?: string) {
  if (status === "connected") {
    return { kind: "success", text: "Mercado Livre conectado. As rotas de API ja podem usar o token." };
  }

  if (status === "missing_code") {
    return { kind: "warning", text: "O callback voltou sem codigo de autorizacao." };
  }

  if (status === "invalid_state") {
    return { kind: "warning", text: "O estado do OAuth nao confere. Tente conectar novamente." };
  }

  if (status === "token_error") {
    return { kind: "warning", text: "Nao foi possivel trocar o codigo por token. Confira redirect URI, client id e secret." };
  }

  return null;
}

function Metric({
  icon: Icon,
  label,
  value,
  detail
}: {
  icon: typeof TrendingUp;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article className="metric-card">
      <Icon size={20} />
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}
