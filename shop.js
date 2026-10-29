
/* =========================================================
   RUNWORLD SHOP — SHOP.JS
   Versão corrigida para o index.html, style.css e shop.css
   - Atalho no topo e no menu
   - Categorias e pesquisa
   - Links individuais do Mercado Livre
   - Preço consultado diretamente no vendedor
   - Carrinho salvo no navegador
   - Integração com a navegação existente do RunWorld
   ========================================================= */

(() => {
    "use strict";

    if (window.__RUNWORLD_SHOP_INICIADO__) return;
    window.__RUNWORLD_SHOP_INICIADO__ = true;

    const SHOP_ID = "telaShop";
    const CART_KEY = "runworld-shop-carrinho-v1";

    const PRODUTOS = [
        {
            id: "tenis-01",
            nome: "Tênis para corrida",
            categoria: "calcados",
            descricao: "Tênis esportivo para corrida e caminhada.",
            vendedor: "Mercado Livre",
            url: "https://produto.mercadolivre.com.br/MLB-5328448952-tnis-new-speed-esporte-masculino-ideal-para-corridas-_JM",
            emoji: "👟",
            etiqueta: "Corrida"
        },
        {
            id: "tenis-02",
            nome: "Tênis esportivo",
            categoria: "calcados",
            descricao: "Outra opção de calçado para seus treinos.",
            vendedor: "Mercado Livre",
            url: "https://produto.mercadolivre.com.br/MLB-3846022930-tnis-masculino-esportivo-leve-corrida-academia-caminhada-_JM",
            emoji: "👟",
            etiqueta: "Treino"
        },
        {
            id: "roupa-01",
            nome: "Camiseta esportiva",
            categoria: "roupas",
            descricao: "Camiseta dry-fit para atividades físicas.",
            vendedor: "Mercado Livre",
            url: "https://produto.mercadolivre.com.br/MLB-3164227093-camiseta-dryfit-masculina-treino-academia-esporte-fitness-_JM",
            emoji: "👕",
            etiqueta: "Vestuário"
        },
        {
            id: "roupa-02",
            nome: "Short esportivo",
            categoria: "roupas",
            descricao: "Short dry-fit para corrida e treinamento.",
            vendedor: "Mercado Livre",
            url: "https://produto.mercadolivre.com.br/MLB-3788452003-short-esportivo-masculino-dry-fit-para-musculaco-e-corrida-_JM",
            emoji: "🩳",
            etiqueta: "Vestuário"
        },
        {
            id: "acessorio-01",
            nome: "Relógio esportivo",
            categoria: "acessorios",
            descricao: "Relógio digital com cronômetro para acompanhar o tempo.",
            vendedor: "Mercado Livre",
            url: "https://produto.mercadolivre.com.br/MLB-1643803277-relogio-skmei-digital-esportivo-cronmetro-corrida-academia-_JM",
            emoji: "⌚",
            etiqueta: "Acessório"
        },
        {
            id: "acessorio-02",
            nome: "Pochete para corrida",
            categoria: "acessorios",
            descricao: "Para levar pequenos objetos durante a atividade.",
            vendedor: "Mercado Livre",
            url: "https://produto.mercadolivre.com.br/MLB-1655795254-pochete-corrida-celular-exercicios-academia-impermeavel-slim-_JM",
            emoji: "🎒",
            etiqueta: "Acessório"
        },
        {
            id: "hidratacao-01",
            nome: "Garrafa esportiva",
            categoria: "hidratacao",
            descricao: "Garrafa para levar água durante seus treinos.",
            vendedor: "Mercado Livre",
            url: "https://produto.mercadolivre.com.br/MLB-4011842647-garrafa-aluminio-agua-gelada-esportiva-650ml-_JM",
            emoji: "🧴",
            etiqueta: "Hidratação"
        },
        {
            id: "hidratacao-02",
            nome: "Cinto de hidratação",
            categoria: "hidratacao",
            descricao: "Cinto com garrafinhas para atividades ao ar livre.",
            vendedor: "Mercado Livre",
            url: "https://produto.mercadolivre.com.br/MLB-4018952355-cinto-de-hidrataco-com-2x-garrafinhas-para-corrida-pochete-_JM",
            emoji: "💧",
            etiqueta: "Hidratação"
        }
    ];

    const CATEGORIAS = [
        { id: "todas", nome: "Todos" },
        { id: "calcados", nome: "Calçados" },
        { id: "roupas", nome: "Roupas" },
        { id: "acessorios", nome: "Acessórios" },
        { id: "hidratacao", nome: "Hidratação" }
    ];

    let categoriaAtual = "todas";
    let pesquisaAtual = "";
    let mostrarCarrinho = false;
    let telaShop = null;

    const porId = id => document.getElementById(id);

    function escapar(valor) {
        return String(valor ?? "").replace(/[&<>"']/g, caractere => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[caractere]);
    }

    function normalizar(texto) {
        return String(texto ?? "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .trim();
    }

    function validarUrl(valor) {
        try {
            const url = new URL(valor);

            return url.protocol === "https:" &&
                (
                    url.hostname === "produto.mercadolivre.com.br" ||
                    url.hostname === "www.mercadolivre.com.br" ||
                    url.hostname === "mercadolivre.com.br"
                );
        } catch {
            return false;
        }
    }

    function abrirLinkSeguro(valor) {
        if (!validarUrl(valor)) {
            mostrarFeedback("Este link não está disponível.");
            return;
        }

        const novaAba = window.open(
            valor,
            "_blank",
            "noopener,noreferrer"
        );

        if (!novaAba) {
            mostrarFeedback("Permita abrir o link para consultar o produto.");
        }
    }

    function carregarCarrinho() {
        try {
            const dados = JSON.parse(localStorage.getItem(CART_KEY) || "[]");

            if (!Array.isArray(dados)) return [];

            return dados
                .filter(item =>
                    item &&
                    PRODUTOS.some(produto => produto.id === item.id)
                )
                .map(item => ({
                    id: item.id,
                    quantidade: Math.max(
                        1,
                        Math.min(99, Math.floor(Number(item.quantidade) || 1))
                    )
                }));
        } catch {
            return [];
        }
    }

    function salvarCarrinho(carrinho) {
        try {
            localStorage.setItem(CART_KEY, JSON.stringify(carrinho));
            return true;
        } catch {
            mostrarFeedback("Não foi possível salvar o carrinho neste navegador.");
            return false;
        }
    }

    function obterProduto(id) {
        return PRODUTOS.find(produto => produto.id === id);
    }

    function quantidadeCarrinho() {
        return carregarCarrinho().reduce(
            (total, item) => total + item.quantidade,
            0
        );
    }

    function criarTela() {
        let tela = porId(SHOP_ID);

        if (!tela) {
            tela = document.createElement("section");
            tela.id = SHOP_ID;
            tela.className = "tela tela-interna rw-shop";
            tela.hidden = true;
            document.body.appendChild(tela);
        }

        tela.classList.add("rw-shop");
        telaShop = tela;

        if (tela.dataset.shopMontada === "true") return tela;

        tela.innerHTML = `
            <div class="rw-shop-shell rw-shop-container">

                <header class="rw-shop-header">
                    <button type="button"
                        class="rw-shop-back"
                        data-shop-action="voltar">
                        ← <span>Voltar</span>
                    </button>

                    <div class="rw-shop-heading">
                        <p class="rw-shop-eyebrow">RUNWORLD • EQUIPAMENTOS</p>
                        <h1>RunWorld <span>Shop</span></h1>
                        <p class="rw-shop-subtitle">
                            Equipamentos para acompanhar sua jornada.
                        </p>
                    </div>

                    <button type="button"
                        class="rw-shop-cart-button"
                        data-shop-action="carrinho"
                        aria-label="Abrir carrinho">
                        <i data-lucide="shopping-cart"></i>
                        <span class="rw-shop-cart-count" id="rwShopCartCount">0</span>
                    </button>
                </header>

                <section class="rw-shop-banner">
                    <div class="rw-shop-banner-icon">
                        <i data-lucide="footprints"></i>
                    </div>
                    <div>
                        <p class="rw-shop-eyebrow">SUA PRÓXIMA CONQUISTA</p>
                        <h2>Prepare-se para ir mais longe.</h2>
                        <p>
                            Explore produtos esportivos e confira os detalhes
                            diretamente no Mercado Livre.
                        </p>
                    </div>
                </section>

                <div class="rw-shop-tools">
                    <label class="rw-shop-search">
                        <span aria-hidden="true">⌕</span>
                        <input
                            id="rwShopSearch"
                            type="search"
                            placeholder="Buscar produtos..."
                            autocomplete="off"
                            aria-label="Buscar produtos">
                    </label>

                    <nav class="rw-shop-categories rw-shop-filters"
                        aria-label="Categorias da loja"
                        id="rwShopCategories">
                        ${CATEGORIAS.map(categoria => `
                            <button type="button"
                                class="rw-shop-filter ${categoria.id === categoriaAtual ? "active" : ""}"
                                data-shop-category="${categoria.id}">
                                ${escapar(categoria.nome)}
                            </button>
                        `).join("")}
                    </nav>
                </div>

                <section id="rwShopCatalog">
                    <div class="rw-shop-section-heading">
                        <div>
                            <h2>Produtos em destaque</h2>
                            <p>Confira preço, disponibilidade e entrega no anúncio.</p>
                        </div>
                        <span id="rwShopProductCount" class="rw-shop-result-count">
                            0 produtos
                        </span>
                    </div>

                    <div id="rwShopProducts" class="rw-shop-grid"></div>

                    <div id="rwShopEmpty" class="rw-shop-empty" hidden>
                        <strong>Nenhum produto encontrado</strong>
                        <p>Tente outro nome ou selecione outra categoria.</p>
                    </div>
                </section>

                <section id="rwShopCart" hidden>
                    <div class="rw-shop-section-heading">
                        <div>
                            <h2>Meu carrinho</h2>
                            <p>Organize os produtos que deseja consultar.</p>
                        </div>
                    </div>

                    <div id="rwShopCartItems" class="rw-shop-cart-list"></div>

                    <div id="rwShopCartEmpty" class="rw-shop-empty" hidden>
                        <strong>Seu carrinho está vazio</strong>
                        <p>Adicione produtos para encontrá-los aqui.</p>
                    </div>

                    <div class="rw-shop-cart-summary">
                        <div>
                            <span>Itens no carrinho</span>
                            <strong id="rwShopCartTotal">0</strong>
                        </div>
                        <p>
                            Os preços não são calculados neste carrinho.
                            Consulte o valor atualizado em cada anúncio.
                        </p>
                        <button type="button"
                            class="rw-shop-button"
                            data-shop-action="consultar-carrinho">
                            Consultar produtos
                        </button>
                        <button type="button"
                            class="rw-shop-button rw-shop-button-secondary"
                            data-shop-action="continuar-comprando">
                            Continuar comprando
                        </button>
                    </div>
                </section>

                <p class="rw-shop-disclaimer">
                    A RunWorld Shop apresenta links para anúncios externos.
                    Os preços, a disponibilidade, o frete e as condições de
                    compra são definidos pelo vendedor e podem mudar.
                    A RunWorld não processa pagamentos nesta tela.
                </p>

                <div id="rwShopFeedback"
                    class="rw-shop-feedback"
                    role="status"
                    aria-live="polite"
                    hidden></div>
            </div>
        `;

        tela.dataset.shopMontada = "true";
        atualizarIcones();
        return tela;
    }

    function atualizarIcones() {
        try {
            if (window.lucide && typeof window.lucide.createIcons === "function") {
                window.lucide.createIcons();
            }
        } catch (erro) {
            console.warn("RunWorld Shop: não foi possível atualizar os ícones.", erro);
        }
    }

    function mostrarFeedback(mensagem) {
        const feedback = porId("rwShopFeedback");
        if (!feedback) return;

        feedback.textContent = mensagem;
        feedback.hidden = false;

        if (feedback._shopTimeout) {
            clearTimeout(feedback._shopTimeout);
        }

        feedback._shopTimeout = setTimeout(() => {
            feedback.hidden = true;
        }, 2800);
    }

    function renderizarCategorias() {
        const area = porId("rwShopCategories");
        if (!area) return;

        area.querySelectorAll("[data-shop-category]").forEach(botao => {
            const ativo = botao.dataset.shopCategory === categoriaAtual;
            botao.classList.toggle("active", ativo);
            botao.setAttribute("aria-pressed", String(ativo));
        });
    }

    function produtosFiltrados() {
        const termo = normalizar(pesquisaAtual);

        return PRODUTOS.filter(produto => {
            const categoriaOk =
                categoriaAtual === "todas" ||
                produto.categoria === categoriaAtual;

            const texto = normalizar(
                `${produto.nome} ${produto.descricao} ${produto.vendedor} ${produto.etiqueta}`
            );

            return categoriaOk && (!termo || texto.includes(termo));
        });
    }

    function renderizarProdutos() {
        const area = porId("rwShopProducts");
        const vazio = porId("rwShopEmpty");
        const contador = porId("rwShopProductCount");

        if (!area || !vazio || !contador) return;

        const produtos = produtosFiltrados();

        contador.textContent =
            `${produtos.length} ${produtos.length === 1 ? "produto" : "produtos"}`;

        vazio.hidden = produtos.length !== 0;

        area.innerHTML = produtos.map(produto => `
            <article class="rw-shop-card" data-product-id="${escapar(produto.id)}">
                <div class="rw-shop-product-media">
                    <span class="rw-shop-product-placeholder"
                        role="img"
                        aria-label="${escapar(produto.nome)}">
                        ${produto.emoji}
                    </span>
                    <span class="rw-shop-product-tag">
                        ${escapar(produto.etiqueta)}
                    </span>
                </div>

                <div class="rw-shop-card-body">
                    <h3>${escapar(produto.nome)}</h3>
                    <p>${escapar(produto.descricao)}</p>
                    <p class="rw-shop-seller">
                        Vendedor: ${escapar(produto.vendedor)}
                    </p>

                    <div class="rw-shop-price">Consultar preço</div>

                    <div class="rw-shop-card-actions">
                        <button type="button"
                            class="rw-shop-button"
                            data-shop-action="consultar"
                            data-product-id="${escapar(produto.id)}">
                            Consultar preço
                        </button>

                        <button type="button"
                            class="rw-shop-button rw-shop-button-secondary"
                            data-shop-action="adicionar"
                            data-product-id="${escapar(produto.id)}">
                            + Adicionar ao carrinho
                        </button>
                    </div>
                </div>
            </article>
        `).join("");

        atualizarIcones();
    }

    function renderizarCarrinho() {
        const area = porId("rwShopCartItems");
        const vazio = porId("rwShopCartEmpty");
        const total = porId("rwShopCartTotal");
        const contador = porId("rwShopCartCount");

        if (!area || !vazio || !total || !contador) return;

        const carrinho = carregarCarrinho();
        const quantidade = carrinho.reduce(
            (soma, item) => soma + item.quantidade,
            0
        );

        contador.textContent = String(quantidade);
        total.textContent = String(quantidade);
        vazio.hidden = carrinho.length !== 0;

        area.innerHTML = carrinho.map(item => {
            const produto = obterProduto(item.id);
            if (!produto) return "";

            return `
                <article class="rw-shop-cart-item">
                    <div>
                        <h3>${escapar(produto.nome)}</h3>
                        <p>Consultar preço no Mercado Livre</p>

                        <div class="rw-shop-quantity">
                            <button type="button"
                                data-shop-action="diminuir"
                                data-product-id="${escapar(produto.id)}"
                                aria-label="Diminuir quantidade">−</button>

                            <span>${item.quantidade}</span>

                            <button type="button"
                                data-shop-action="aumentar"
                                data-product-id="${escapar(produto.id)}"
                                aria-label="Aumentar quantidade">+</button>
                        </div>
                    </div>

                    <button type="button"
                        class="rw-shop-remove"
                        data-shop-action="remover"
                        data-product-id="${escapar(produto.id)}">
                        Remover
                    </button>
                </article>
            `;
        }).join("");

        atualizarIcones();
    }

    function atualizarCarrinhoVisual() {
        renderizarCarrinho();
    
        const area = porId("rwShopCartItems");
        const vazio = porId("rwShopCartEmpty");
        const total = porId("rwShopCartTotal");
        const contador = porId("rwShopCartCount");

        if (!area || !vazio || !total || !contador) return;

        const carrinho = carregarCarrinho();
        const quantidade = carrinho.reduce(
            (soma, item) => soma + item.quantidade,
            0
        );

        contador.textContent = quantidade > 99 ? "99+" : String(quantidade);
        contador.hidden = quantidade === 0;
        total.textContent = String(quantidade);
        vazio.hidden = carrinho.length > 0;

        area.innerHTML = carrinho.map(item => {
            const produto = obterProduto(item.id);
            if (!produto) return "";

            return `
                <article class="rw-shop-cart-item">
                    <div class="rw-shop-cart-item-icon">
                        ${produto.emoji}
                    </div>

                    <div class="rw-shop-cart-item-info">
                        <strong>${escapar(produto.nome)}</strong>
                        <span>Consultar preço no Mercado Livre</span>
                        <div class="rw-shop-cart-quantity">
                            <button type="button"
                                data-shop-action="diminuir"
                                data-product-id="${escapar(produto.id)}"
                                aria-label="Diminuir quantidade">
                                −
                            </button>

                            <span>${item.quantidade}</span>

                            <button type="button"
                                data-shop-action="aumentar"
                                data-product-id="${escapar(produto.id)}"
                                aria-label="Aumentar quantidade">
                                +
                            </button>
                        </div>
                    </div>

                    <button type="button"
                        class="rw-shop-remove"
                        data-shop-action="remover"
                        data-product-id="${escapar(produto.id)}"
                        aria-label="Remover ${escapar(produto.nome)}">
                        <i data-lucide="trash-2"></i>
                    </button>
                </article>
            `;
        }).join("");

        atualizarIcones();
    }

    function atualizarLoja() {
        renderizarCategorias();
        renderizarProdutos();
        renderizarCarrinho();
    }

    function adicionarAoCarrinho(id) {
        const produto = obterProduto(id);
        if (!produto) return;

        const carrinho = carregarCarrinho();
        const existente = carrinho.find(item => item.id === id);

        if (existente) {
            if (existente.quantidade >= 99) {
                mostrarFeedback("Limite de 99 unidades por produto.");
                return;
            }

            existente.quantidade += 1;
        } else {
            carrinho.push({ id, quantidade: 1 });
        }

        if (!salvarCarrinho(carrinho)) return;

        renderizarCarrinho();
        mostrarFeedback(`${produto.nome} adicionado ao carrinho.`);
    }

    function alterarQuantidade(id, variacao) {
        const carrinho = carregarCarrinho();
        const item = carrinho.find(produto => produto.id === id);

        if (!item) return;

        item.quantidade += variacao;

        if (item.quantidade <= 0) {
            const atualizado = carrinho.filter(produto => produto.id !== id);
            if (!salvarCarrinho(atualizado)) return;
        } else {
            item.quantidade = Math.min(99, item.quantidade);
            if (!salvarCarrinho(carrinho)) return;
        }

        renderizarCarrinho();
    }

    function removerDoCarrinho(id) {
        const carrinho = carregarCarrinho().filter(item => item.id !== id);

        if (!salvarCarrinho(carrinho)) return;

        renderizarCarrinho();
        mostrarFeedback("Produto removido do carrinho.");
    }

    function abrirCarrinho() {
        mostrarCarrinho = true;

        const catalogo = porId("rwShopCatalog");
        const carrinho = porId("rwShopCart");

        if (catalogo) catalogo.hidden = true;
        if (carrinho) carrinho.hidden = false;

        renderizarCarrinho();
    }

    function abrirCatalogo() {
        mostrarCarrinho = false;

        const catalogo = porId("rwShopCatalog");
        const carrinho = porId("rwShopCart");

        if (catalogo) catalogo.hidden = false;
        if (carrinho) carrinho.hidden = true;

        atualizarLoja();
    }

    function abrirLoja() {
        const tela = criarTela();

        if (typeof window.abrirTela === "function") {
            window.abrirTela(SHOP_ID);
        }

        tela.hidden = false;
        tela.classList.add("active");
        document.body.classList.add("tela-interna-aberta");

        [
            "menuFlutuante",
            "painelMensagens",
            "painelCamadas"
        ].forEach(id => {
            const painel = porId(id);
            if (painel) {
                painel.classList.remove("active");
                painel.hidden = true;
            }
        });

        abrirCatalogo();
        atualizarLoja();
    }

    function voltarDaLoja() {
        if (telaShop) {
            telaShop.classList.remove("active");
            telaShop.hidden = true;
        }

        document.body.classList.remove("tela-interna-aberta");

        if (typeof window.voltarParaMapa === "function") {
            window.voltarParaMapa();
        } else {
            const mapa = porId("telaMapa");
            if (mapa) {
                mapa.hidden = false;
                mapa.classList.add("active");
            }
        }
    }

    function consultarCarrinho() {
        const carrinho = carregarCarrinho();

        if (carrinho.length === 0) {
            mostrarFeedback("Adicione algum produto ao carrinho primeiro.");
            return;
        }

        const primeiroProduto = obterProduto(carrinho[0].id);

        if (primeiroProduto) {
            abrirLinkSeguro(primeiroProduto.url);
        }

        if (carrinho.length > 1) {
            mostrarFeedback(
                "Consulte os outros produtos individualmente no carrinho."
            );
        }
    }

    function tratarClique(evento) {
        const botao = evento.target.closest(
            "[data-shop-action], #abrirRunWorldShop, #abrirShopMenu"
        );

        if (!botao) return;

        if (
            botao.id === "abrirRunWorldShop" ||
            botao.id === "abrirShopMenu"
        ) {
            evento.preventDefault();
            abrirLoja();
            return;
        }

        const acao = botao.dataset.shopAction;
        const id = botao.dataset.productId;

        switch (acao) {
            case "voltar":
                evento.preventDefault();
                voltarDaLoja();
                break;

            case "carrinho":
                evento.preventDefault();
                abrirCarrinho();
                break;

            case "continuar-comprando":
                evento.preventDefault();
                abrirCatalogo();
                break;

            case "consultar":
                evento.preventDefault();
                abrirLinkSeguro(obterProduto(id)?.url);
                break;

            case "adicionar":
                evento.preventDefault();
                adicionarAoCarrinho(id);
                break;

            case "aumentar":
                evento.preventDefault();
                alterarQuantidade(id, 1);
                break;

            case "diminuir":
                evento.preventDefault();
                alterarQuantidade(id, -1);
                break;

            case "remover":
                evento.preventDefault();
                removerDoCarrinho(id);
                break;

            case "consultar-carrinho":
                evento.preventDefault();
                consultarCarrinho();
                break;
        }
    }

    function tratarPesquisa(evento) {
        if (evento.target.id !== "rwShopSearch") return;

        pesquisaAtual = evento.target.value || "";

        if (mostrarCarrinho) abrirCatalogo();

        renderizarProdutos();
    }

    function tratarCategoria(evento) {
        const botao = evento.target.closest("[data-shop-category]");
        if (!botao) return;

        categoriaAtual = botao.dataset.shopCategory || "todas";

        if (mostrarCarrinho) abrirCatalogo();

        renderizarCategorias();
        renderizarProdutos();
    }

    function instalarAtalhos() {
        const topo = document.querySelector(".topo-acoes");
        const perfil = porId("abrirPerfil");

        if (topo && !porId("abrirRunWorldShop")) {
            const botao = document.createElement("button");

            botao.id = "abrirRunWorldShop";
            botao.type = "button";
            botao.className = "rw-shop-top-shortcut";
            botao.setAttribute("aria-label", "Abrir RunWorld Shop");
            botao.title = "RunWorld Shop";
            botao.innerHTML = '<i data-lucide="shopping-cart"></i>';

            if (perfil && perfil.parentElement === topo) {
                topo.insertBefore(botao, perfil);
            } else {
                topo.appendChild(botao);
            }
        }

        const configuracoes = porId("abrirConfiguracoes");
        const menu = configuracoes?.parentElement;

        if (menu && !porId("abrirShopMenu")) {
            const botaoMenu = document.createElement("button");

            botaoMenu.id = "abrirShopMenu";
            botaoMenu.type = "button";
            botaoMenu.className = "rw-shop-menu-shortcut";
            botaoMenu.innerHTML =
                '<i data-lucide="shopping-cart"></i><span>RunWorld Shop</span>';

            menu.insertBefore(botaoMenu, configuracoes);
        }

        atualizarIcones();
    }

    function iniciar() {
        criarTela();
        instalarAtalhos();
        atualizarLoja();

        if (!document.body.dataset.rwShopListeners) {
            document.body.dataset.rwShopListeners = "true";

            document.addEventListener("click", tratarClique);
            document.addEventListener("input", tratarPesquisa);
            document.addEventListener("click", tratarCategoria);
        }
    }

    window.abrirRunWorldShop = abrirLoja;
    window.voltarDaLoja = voltarDaLoja;
    window.atualizarRunWorldShop = atualizarLoja;

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", iniciar, { once: true });
    } else {
        iniciar();
    }
})();
