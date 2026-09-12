"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
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
  Star,
  TrendingUp
} from "lucide-react";

type MlCategory = {
  id: string;
  name: string;
  total_items_in_this_category?: number;
  children_categories?: MlCategory[];
  path_from_root?: Array<{ id: string; name: string }>;
};

type MlTrend = {
  keyword: string;
  url: string;
};

type MlItem = {
  id: string;
  title: string;
  url?: string;
  image?: string;
  score: number;
  rank?: number;
  sourceType: "ITEM" | "PRODUCT" | "USER_PRODUCT" | "SEARCH";
  reasons: string[];
  price?: number;
  currencyId?: string;
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

const RECOMMENDATIONS_LIMIT = 20;

export function MarketplaceDashboard({
  mlStatus,
  mlMessage
}: {
  mlStatus: { isConfigured: boolean; isConnected: boolean };
  mlMessage: MlMessage;
}) {
  const [categories, setCategories] = useState<MlCategory[]>([]);
  const [currentCategories, setCurrentCategories] = useState<MlCategory[]>([]);
  const [categoryPath, setCategoryPath] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedCategoryLabel, setSelectedCategoryLabel] = useState("");
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [trends, setTrends] = useState<MlTrend[]>([]);
  const [items, setItems] = useState<MlItem[]>([]);
  const [productSource, setProductSource] = useState<ProductSource>("");
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [categoryError, setCategoryError] = useState("");
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [trendError, setTrendError] = useState("");
  const [itemError, setItemError] = useState("");
  const limit = RECOMMENDATIONS_LIMIT;

  const featuredCategories = currentCategories.slice(0, 18);
  const featuredTrends = trends.slice(0, 18);

  async function loadCategories() {
    try {
      setCategoryError("");
      const response = await fetch("/api/ml/categories");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      setCategories(data.categories);
      setCurrentCategories(data.categories);
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
    }
  }

  const loadItems = useCallback(async function loadItems({
    nextOffset = 0,
    nextQuery,
    nextCategoryId
  }: {
    nextOffset?: number;
    nextQuery: string;
    nextCategoryId: string;
  }) {
    if (!nextCategoryId && !nextQuery.trim()) {
      setItems([]);
      setTotal(0);
      setProductSource("");
      return;
    }

    setLoading(true);
    setItemError("");

    try {
      const params = new URLSearchParams({
        limit: String(RECOMMENDATIONS_LIMIT),
        offset: String(nextOffset)
      });

      if (nextCategoryId) {
        params.set("categoryId", nextCategoryId);
      }

      if (nextQuery.trim()) {
        params.set("q", nextQuery.trim());
      }

      const response = await fetch(`/api/ml/recommendations?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      setItems(data.recommendations ?? []);
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
  }, []);

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
    if (!mlStatus.isConnected || (!selectedCategory && !submittedQuery)) {
      return;
    }

    void loadItems({
      nextOffset: offset,
      nextQuery: submittedQuery,
      nextCategoryId: selectedCategory
    });
  }, [loadItems, mlStatus.isConnected, offset, selectedCategory, submittedQuery]);

  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextQuery = query.trim();

    if (!selectedCategory) {
      clearRecommendations();
      setItemError("Escolha uma categoria folha antes de buscar produtos. A busca livre do Mercado Livre nao esta estavel para recomendacoes.");
      return;
    }

    setSubmittedQuery(nextQuery);
    setOffset(0);
  }

  async function inspectCategory(category: MlCategory) {
    setCategoryLoading(true);
    setCategoryError("");

    try {
      const response = await fetch(`/api/ml/categories?categoryId=${encodeURIComponent(category.id)}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      const categoryDetail = data.categories as MlCategory;
      const children = categoryDetail.children_categories ?? [];
      const path = categoryDetail.path_from_root ?? [{ id: category.id, name: category.name }];

      setCategoryPath(path);

      if (children.length > 0) {
        setCurrentCategories(children);
        setSelectedCategory("");
        setSelectedCategoryLabel("");
        clearRecommendations();
        return;
      }

      setSelectedCategory(categoryDetail.id);
      setSelectedCategoryLabel(categoryDetail.name);
      setOffset(0);
      setSubmittedQuery(query.trim());
    } catch (caught) {
      setCategoryError(caught instanceof Error ? caught.message : "Nao foi possivel carregar a categoria.");
    } finally {
      setCategoryLoading(false);
    }
  }

  async function chooseCategoryFromSelect(categoryId: string) {
    if (!categoryId) {
      resetCategoryNavigation();
      return;
    }

    const category = [...currentCategories, ...categories].find((item) => item.id === categoryId);

    if (category) {
      await inspectCategory(category);
    }
  }

  function resetCategoryNavigation() {
    setCurrentCategories(categories);
    setCategoryPath([]);
    setSelectedCategory("");
    setSelectedCategoryLabel("");
    setOffset(0);
    clearRecommendations();
  }

  function chooseTrend(keyword: string) {
    setQuery(keyword);
    setOffset(0);

    if (!selectedCategory) {
      clearRecommendations();
      setItemError("Trend selecionada. Agora escolha uma categoria folha para transformar esse termo em recomendacoes.");
      return;
    }

    setSubmittedQuery(keyword);
  }

  function clearRecommendations() {
    setItems([]);
    setTotal(0);
    setProductSource("");
    setItemError("");
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
          <Metric icon={BarChart3} label="Categorias" value={String(currentCategories.length)} detail="opcoes no nivel atual" />
          <Metric icon={ArrowDownUp} label="Recomendacoes" value={String(items.length)} detail={`${total} sinais avaliados`} />
          <Metric icon={Clock3} label="Pagina" value={`${offset / limit + 1}`} detail={`${limit} recomendacoes por pagina`} />
        </section>

        <section className="discovery-grid" aria-label="Descoberta">
          <div className="panel discovery-panel">
            <div className="panel-header compact">
              <div>
                <p className="eyebrow">Categorias</p>
                <h2>{selectedCategoryLabel || "Escolha uma categoria folha"}</h2>
              </div>
              <Sparkles size={18} />
            </div>
            <div className="category-breadcrumb">
              <button onClick={resetCategoryNavigation}>Todas</button>
              {categoryPath.map((category) => (
                <span key={category.id}>{category.name}</span>
              ))}
            </div>
            <div className="category-pills">
              {featuredCategories.map((category) => (
                <button
                  className={category.id === selectedCategory ? "category-pill selected" : "category-pill"}
                  key={category.id}
                  onClick={() => void inspectCategory(category)}
                >
                  <strong>{category.name}</strong>
                  <span>
                    {category.children_categories?.length
                      ? `${category.children_categories.length} subcategorias`
                      : formatCompact(category.total_items_in_this_category) || "investigar"}
                  </span>
                </button>
              ))}
            </div>
            {categoryLoading && <div className="inline-loading">Carregando subcategorias...</div>}
          </div>

          <div className="panel discovery-panel">
            <div className="panel-header compact">
              <div>
                <p className="eyebrow">Trends</p>
                <h2>Termos para transformar em busca</h2>
              </div>
              <Star size={18} />
            </div>
            {trendError ? (
              <div className="resource-error">{trendError}</div>
            ) : (
              <div className="trend-pills">
                {featuredTrends.map((trend, index) => (
                  <button onClick={() => chooseTrend(trend.keyword)} key={`${trend.keyword}-${index}`}>
                    <span>#{index + 1}</span>
                    <strong>{trend.keyword}</strong>
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="workspace" id="mercado-livre">
          <div className="panel main-panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Mercado Livre</p>
                <h2>{selectedCategoryLabel || "Recomendacoes"}</h2>
                {productSource === "highlights" && (
                  <span className="source-note">Recomendacoes calculadas pelo ranking de mais vendidos</span>
                )}
              </div>
              <form className="filters" onSubmit={submitSearch}>
                <label>
                  <span>Categoria</span>
                  <select value={selectedCategory} onChange={(event) => void chooseCategoryFromSelect(event.target.value)}>
                    <option value="">Escolha uma categoria</option>
                    {currentCategories.map((category) => (
                      <option value={category.id} key={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Refinar por termo</span>
                  <div className="search-input">
                    <Search size={18} />
                    <input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Opcional depois de escolher categoria"
                    />
                  </div>
                </label>
                <button type="submit" disabled={!selectedCategory || loading}>
                  Buscar
                </button>
              </form>
            </div>

            {itemError && <div className="status-banner warning inline">{itemError}</div>}

            {mlStatus.isConnected && (
              <>
                <div className="recommendation-list" aria-label="Recomendacoes do Mercado Livre">
                  {items.map((item) => (
                    <article className="recommendation-card" key={item.id}>
                      <div className="recommendation-media">
                        {item.image ? (
                          <Image src={item.image} alt="" width={86} height={86} unoptimized />
                        ) : (
                          <PackageSearch size={28} />
                        )}
                      </div>
                      <div className="recommendation-body">
                        <div className="recommendation-title">
                          <div>
                            <span className="recommendation-type">
                              {formatSourceType(item.sourceType)}
                              {item.rank ? ` · #${item.rank}` : ""}
                            </span>
                            <h3>{item.title}</h3>
                          </div>
                          <strong className="score">{item.score}</strong>
                        </div>
                        <div className="reason-list">
                          {item.reasons.map((reason) => (
                            <span key={reason}>{reason}</span>
                          ))}
                        </div>
                        <div className="recommendation-footer">
                          <span>{formatPrice(item.price, item.currencyId)}</span>
                          {item.url ? (
                            <a className="external-link" href={item.url} target="_blank" rel="noreferrer">
                              Abrir no ML <ExternalLink size={14} />
                            </a>
                          ) : (
                            <span className="muted-action">Sem link direto confiavel</span>
                          )}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>

                {items.length === 0 && !loading && (
                  <div className="empty-state">
                    <PackageSearch size={28} />
                    <strong>Comece por uma categoria, trend ou busca manual.</strong>
                    <span>
                      Escolha uma categoria folha e, se quiser, refine com um termo. Assim evitamos
                      rankings amplos ou buscas bloqueadas que nao viram recomendacoes acionaveis.
                    </span>
                  </div>
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
        </section>
      </section>

      {!mlStatus.isConnected && (
        <div className="auth-overlay" role="dialog" aria-modal="true" aria-labelledby="ml-auth-title">
          <div className="auth-preview" aria-hidden="true">
            <div className="preview-sidebar" />
            <div className="preview-content">
              <div className="preview-bar" />
              <div className="preview-metrics">
                <span />
                <span />
                <span />
              </div>
              <div className="preview-board">
                <span />
                <span />
                <span />
                <span />
              </div>
            </div>
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

function formatSourceType(sourceType: MlItem["sourceType"]) {
  if (sourceType === "PRODUCT") {
    return "Catalogo";
  }

  if (sourceType === "USER_PRODUCT") {
    return "User Product";
  }

  return "Anuncio";
}

function getFriendlyMlError(caught: unknown, fallback: string) {
  const message = caught instanceof Error ? caught.message : fallback;

  if (message.includes("PA_UNAUTHORIZED_RESULT_FROM_POLICIES") || message.includes("PolicyAgent")) {
    return "O Mercado Livre negou esse recurso para o token atual. Confira as permissoes do app ou use outro recurso disponivel para sua conta.";
  }

  return message;
}
