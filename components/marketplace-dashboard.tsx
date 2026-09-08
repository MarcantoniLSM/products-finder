"use client";

import { useEffect, useMemo, useState } from "react";
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

type MlCategory = {
  id: string;
  name: string;
  total_items_in_this_category?: number;
};

type MlTrend = {
  keyword: string;
  url: string;
};

type MlItem = {
  id: string;
  title: string;
  permalink: string;
  price?: number;
  currency_id?: string;
  thumbnail?: string;
  sold_quantity?: number;
  available_quantity?: number;
};

type ProductSource = "search" | "highlights" | "";

type MlMessage = {
  kind: "success" | "warning";
  text: string;
} | null;

const marketplaceNav = [
  { name: "Dashboard", status: "ativo", icon: Gauge },
  { name: "Mercado Livre", status: "ativo", icon: ShoppingBag },
  { name: "Amazon", status: "em breve", icon: Lock },
  { name: "Shopee", status: "em breve", icon: Lock }
];

export function MarketplaceDashboard({
  mlStatus,
  mlMessage
}: {
  mlStatus: { isConfigured: boolean; isConnected: boolean };
  mlMessage: MlMessage;
}) {
  const [categories, setCategories] = useState<MlCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [query, setQuery] = useState("");
  const [trends, setTrends] = useState<MlTrend[]>([]);
  const [items, setItems] = useState<MlItem[]>([]);
  const [productSource, setProductSource] = useState<ProductSource>("");
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [categoryError, setCategoryError] = useState("");
  const [trendError, setTrendError] = useState("");
  const [debugToken, setDebugToken] = useState("");
  const [itemError, setItemError] = useState("");
  const limit = 50;

  const selectedCategoryName = useMemo(
    () => categories.find((category) => category.id === selectedCategory)?.name,
    [categories, selectedCategory]
  );

  useEffect(() => {
    if (!mlStatus.isConnected) {
      return;
    }

    void loadCategories();
  }, [mlStatus.isConnected]);

  useEffect(() => {
    if (!mlStatus.isConnected) {
      return;
    }

    void loadTrends(selectedCategory);
  }, [mlStatus.isConnected, selectedCategory]);

  useEffect(() => {
    if (!mlStatus.isConnected || (!selectedCategory && !query.trim())) {
      setItems([]);
      setTotal(0);
      return;
    }

    void loadItems({ nextOffset: offset });
  }, [mlStatus.isConnected, selectedCategory, offset]);

  async function loadCategories() {
    try {
      setCategoryError("");
      const response = await fetch("/api/ml/categories");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      setCategories(data.categories);
      setSelectedCategory(data.categories?.[0]?.id ?? "");
    } catch (caught) {
      setCategoryError(caught instanceof Error ? caught.message : "Nao foi possivel carregar categorias.");
    }
  }

  async function loadTrends(categoryId?: string) {
    try {
      setTrendError("");
      const params = categoryId ? `?categoryId=${encodeURIComponent(categoryId)}` : "";
      const response = await fetch(`/api/ml/trends${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      setTrends(Array.isArray(data.trends) ? data.trends : []);
    } catch (caught) {
      setTrends([]);
      setTrendError(getFriendlyMlError(caught, "Nao foi possivel carregar trends."));
      await loadDebugToken();
    }
  }

  async function loadDebugToken() {
    try {
      const response = await fetch("/api/ml/token");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      setDebugToken(data.accessToken ?? data.refreshToken ?? "");
    } catch {
      setDebugToken("");
    }
  }

  async function loadItems({ nextOffset = 0 }: { nextOffset?: number } = {}) {
    setLoading(true);
    setItemError("");

    try {
      const params = new URLSearchParams({
        limit: String(limit),
        offset: String(nextOffset)
      });

      if (selectedCategory) {
        params.set("categoryId", selectedCategory);
      }

      if (query.trim()) {
        params.set("q", query.trim());
      }

      const response = await fetch(`/api/ml/search?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      setItems(data.results ?? []);
      setTotal(data.paging?.total ?? 0);
      setProductSource(data.source ?? "search");
    } catch (caught) {
      setItems([]);
      setTotal(0);
      setProductSource("");
      setItemError(getFriendlyMlError(caught, "Nao foi possivel buscar produtos."));
    } finally {
      setLoading(false);
    }
  }

  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setOffset(0);
    void loadItems({ nextOffset: 0 });
  }

  function chooseCategory(categoryId: string) {
    setSelectedCategory(categoryId);
    setOffset(0);
  }

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
            Configure MERCADO_LIVRE_CLIENT_ID, MERCADO_LIVRE_CLIENT_SECRET e
            MERCADO_LIVRE_REDIRECT_URI no .env.local.
          </div>
        )}

        {categoryError && <div className="status-banner warning">{categoryError}</div>}

        <section className="metric-grid" aria-label="Resumo">
          <Metric icon={TrendingUp} label="Trends carregadas" value={String(trends.length)} detail="retorno do Mercado Livre" />
          <Metric icon={BarChart3} label="Categorias" value={String(categories.length)} detail="categorias raiz MLB" />
          <Metric icon={ArrowDownUp} label="Produtos" value={String(items.length)} detail={`${total} resultados encontrados`} />
          <Metric icon={Clock3} label="Pagina" value={`${offset / limit + 1}`} detail={`${limit} itens por pagina`} />
        </section>

        <section className="workspace" id="mercado-livre">
          <div className="panel main-panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Mercado Livre</p>
                <h2>{selectedCategoryName ?? "Produtos encontrados"}</h2>
                {productSource === "highlights" && (
                  <span className="source-note">Ranking de destaques por categoria</span>
                )}
              </div>
              <form className="filters" onSubmit={submitSearch}>
                <label>
                  <span>Categoria</span>
                  <select value={selectedCategory} onChange={(event) => chooseCategory(event.target.value)}>
                    <option value="">Todas</option>
                    {categories.map((category) => (
                      <option value={category.id} key={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Busca</span>
                  <div className="search-input">
                    <Search size={18} />
                    <input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Produto, termo ou marca"
                    />
                  </div>
                </label>
                <button type="submit">Buscar</button>
              </form>
            </div>

            {itemError && <div className="status-banner warning inline">{itemError}</div>}

            {mlStatus.isConnected && (
              <>
                <div className="product-table" role="table" aria-label="Produtos do Mercado Livre">
                  <div className="table-row table-head" role="row">
                    <span>Item</span>
                    <span>Produto</span>
                    <span>Preco</span>
                    <span>Vendidos</span>
                    <span>Link</span>
                  </div>
                  {items.map((item, index) => (
                    <div className="table-row" role="row" key={item.id}>
                      <span className="rank">#{offset + index + 1}</span>
                      <span className="product-cell">
                        {item.thumbnail && <img src={item.thumbnail} alt="" />}
                        <strong>{item.title}</strong>
                      </span>
                      <span>{formatPrice(item.price, item.currency_id)}</span>
                      <span>{item.sold_quantity ?? "-"}</span>
                      <span>
                        <a className="external-link" href={item.permalink} target="_blank" rel="noreferrer">
                          Abrir <ExternalLink size={14} />
                        </a>
                      </span>
                    </div>
                  ))}
                </div>

                {items.length === 0 && !loading && (
                  <div className="empty-state">Nenhum produto encontrado para essa consulta.</div>
                )}

                <div className="pagination">
                  <button disabled={offset === 0 || loading} onClick={() => setOffset(Math.max(offset - limit, 0))}>
                    Anterior
                  </button>
                  <span>
                    {loading
                      ? "Carregando..."
                      : items.length > 0
                        ? `${offset + 1}-${offset + items.length} de ${total}`
                        : `0 de ${total}`}
                  </span>
                  <button disabled={loading || offset + limit >= total} onClick={() => setOffset(offset + limit)}>
                    Proxima
                  </button>
                </div>
              </>
            )}
          </div>

          <aside className="side-panel">
            <div className="panel">
              <div className="panel-header compact">
                <h2>Categorias</h2>
                <Sparkles size={18} />
              </div>
              <div className="category-list">
                {categories.map((category) => (
                  <button
                    className={category.id === selectedCategory ? "category-item selected" : "category-item"}
                    key={category.id}
                    onClick={() => chooseCategory(category.id)}
                  >
                    <div>
                      <strong>{category.name}</strong>
                      <span>{category.id}</span>
                    </div>
                    <small>{formatCompact(category.total_items_in_this_category)}</small>
                  </button>
                ))}
              </div>
            </div>

            <div className="panel">
              <div className="panel-header compact">
                <h2>Trends</h2>
                <ExternalLink size={18} />
              </div>
              <div className="trend-list">
                {trendError ? (
                  <div className="token-debug">
                    <span>Token gerado pela autenticacao</span>
                    <code>{debugToken || "Token nao encontrado na sessao atual."}</code>
                  </div>
                ) : (
                  trends.map((trend, index) => (
                    <a href={trend.url} target="_blank" rel="noreferrer" key={`${trend.keyword}-${index}`}>
                      <span>#{index + 1}</span>
                      <strong>{trend.keyword}</strong>
                      <ExternalLink size={14} />
                    </a>
                  ))
                )}
              </div>
            </div>
          </aside>
        </section>
      </section>

      {!mlStatus.isConnected && (
        <div className="auth-overlay" role="dialog" aria-modal="true" aria-labelledby="ml-auth-title">
          <div className="skeleton-backdrop" aria-hidden="true">
            <div />
            <div />
            <div />
          </div>
          <section className="auth-modal">
            <div className="auth-icon">
              <Lock size={24} />
            </div>
            <p className="eyebrow">Acesso Mercado Livre</p>
            <h2 id="ml-auth-title">Conecte sua conta para consultar produtos e tendencias.</h2>
            <p>
              A tela fica bloqueada ate o OAuth inicial terminar. Depois disso, usamos o token no
              servidor para chamar as APIs disponiveis para sua conta.
            </p>
            <a
              className={mlStatus.isConfigured ? "connect-button" : "connect-button disabled"}
              href={mlStatus.isConfigured ? "/api/ml/auth" : undefined}
              aria-disabled={!mlStatus.isConfigured}
            >
              <ShoppingBag size={18} />
              <span>Conectar Mercado Livre</span>
            </a>
          </section>
        </div>
      )}
    </main>
  );
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

function formatPrice(price?: number, currency = "BRL") {
  if (typeof price !== "number") {
    return "-";
  }

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency
  }).format(price);
}

function formatCompact(value?: number) {
  if (typeof value !== "number") {
    return "";
  }

  return new Intl.NumberFormat("pt-BR", {
    notation: "compact",
    maximumFractionDigits: 1
  }).format(value);
}

function getFriendlyMlError(caught: unknown, fallback: string) {
  const message = caught instanceof Error ? caught.message : fallback;

  if (message.includes("PA_UNAUTHORIZED_RESULT_FROM_POLICIES") || message.includes("PolicyAgent")) {
    return "O Mercado Livre negou esse recurso para o token atual. Confira as permissoes do app ou use outro recurso disponivel para sua conta.";
  }

  return message;
}
