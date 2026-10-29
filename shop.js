
/* =========================================================
   RUNWORLD SHOP — SHOP.JS
   Versão corrigida e integrada ao RunWorld
   - Ícone da loja no topo e no menu
   - Vitrine de produtos
   - Busca e categorias
   - Carrinho salvo no navegador
   - Validação de links externos
   - Integração com abrirTela() e voltarParaMapa()
   ========================================================= */

(() => {
    "use strict";

    if (window.__RUNWORLD_SHOP_INICIADO__) return;
    window.__RUNWORLD_SHOP_INICIADO__ = true;

    const SHOP_ID = "telaShop";
    const CART_KEY = "runworld-shop-carrinho-v1";

    const ALLOWED_HOSTS = [
        "lista.mercadolivre.com.br",
        "www.mercadolivre.com.br",
        "www.amazon.com.br",
        "www.magazineluiza.com.br",
        "www.netshoes.com.br",
        "www.decathlon.com.br",
        "www.centauro.com.br"
    ];

    /* =====================================================
       PRODUTOS
       Os preços são consultados no site do vendedor.
       ===================================================== */

    const PRODUCTS = [
        {
            id: "tenis-01",
            name: "Tênis para corrida",
            category: "calcados",
            description: "Opções de tênis para corrida e caminhada.",
            seller: "Mercado Livre",
            url: "https://lista.mercadolivre.com.br/tenis-corrida"
        },
        {
            id: "tenis-02",
            name: "Tênis esportivo",
            category: "calcados",
            description: "Confira modelos para seus treinos.",
            seller: "Netshoes",
            url: "https://www.netshoes.com.br/"
        },
        {
            id: "roupa-01",
            name: "Camiseta esportiva",
            category: "roupas",
            description: "Camisetas para atividades físicas.",
            seller: "Decathlon",
            url: "https://www.decathlon.com.br/"
        },
        {
            id: "roupa-02",
            name: "Short esportivo",
            category: "roupas",
            description: "Opções de shorts para corrida e caminhada.",
            seller: "Centauro",
            url: "https://www.centauro.com.br/"
        },
        {
            id: "acessorio-01",
            name: "Relógio esportivo",
            category: "acessorios",
            description: "Confira relógios e acessórios para acompanhar seus treinos.",
            seller: "Amazon Brasil",
            url: "https://www.amazon.com.br/s?k=relogio+esportivo"
        },
        {
            id: "acessorio-02",
            name: "Pochete para corrida",
            category: "acessorios",
            description: "Acessórios para levar pequenos objetos durante o treino.",
            seller: "Mercado Livre",
            url: "https://lista.mercadolivre.com.br/pochete-corrida"
        },
        {
            id: "hidratacao-01",
            name: "Garrafa esportiva",
            category: "hidratacao",
            description: "Garrafas para levar água durante suas atividades.",
            seller: "Amazon Brasil",
            url: "https://www.amazon.com.br/s?k=garrafa+esportiva"
        },
        {
            id: "hidratacao-02",
            name: "Cinto de hidratação",
            category: "hidratacao",
            description: "Confira opções para seus treinos ao ar livre.",
            seller: "Mercado Livre",
            url: "https://lista.mercadolivre.com.br/cinto-hidratacao-corrida"
        }
    ];

    let categoriaAtual = "todos";
    let buscaAtual = "";
    let telaShop = null;

    /* =====================================================
       FUNÇÕES DE SEGURANÇA E UTILITÁRIOS
       ===================================================== */

    function escapeHtml(value) {
        return String(value == null ? "" : value).replace(
            /[&<>"']/g,
            char => ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;"
            })[char]
        );
    }

    function validarUrl(value) {
        try {
            const url = new URL(value);

            return (
                url.protocol === "https:" &&
                ALLOWED_HOSTS.includes(url.hostname)
            );
        } catch {
            return false;
        }
    }

    function abrirLinkSeguro(value) {
        if (!validarUrl(value)) {
            alert("Este link de vendedor não é permitido.");
            return;
        }

        const novaAba = window.open(
            value,
            "_blank",
            "noopener,noreferrer"
        );

        if (novaAba) {
            novaAba.opener = null;
        }
    }

    function refreshIcons() {
        if (
            window.lucide &&
            typeof window.lucide.createIcons === "function"
        ) {
            window.lucide.createIcons();
        }
    }

    function lerCarrinho() {
        try {
            const dados = localStorage.getItem(CART_KEY);
            const carrinho = dados ? JSON.parse(dados) : {};

            if (
                !carrinho ||
                typeof carrinho !== "object" ||
                Array.isArray(carrinho)
            ) {
                return {};
            }

            const seguro = {};

            for (const produto of PRODUCTS) {
                const quantidade = Number(carrinho[produto.id]);

                if (
                    Number.isInteger(quantidade) &&
                    quantidade > 0 &&
                    quantidade <= 99
                ) {
                    seguro[produto.id] = quantidade;
                }
            }

            return seguro;
        } catch {
            return {};
        }
    }

    function salvarCarrinho(carrinho) {
        try {
            localStorage.setItem(
                CART_KEY,
                JSON.stringify(carrinho)
            );

            atualizarContador();
            return true;
        } catch {
            alert(
                "Não foi possível salvar o carrinho neste navegador."
            );

            return false;
        }
    }

    function quantidadeCarrinho() {
        return Object.values(lerCarrinho()).reduce(
            (total, quantidade) => total + quantidade,
            0
        );
    }

    function atualizarContador() {
        const quantidade = quantidadeCarrinho();

        document
            .querySelectorAll("[data-rw-shop-count]")
            .forEach(elemento => {
                elemento.textContent = quantidade > 99
                    ? "99+"
                    : String(quantidade);

                elemento.hidden = quantidade === 0;
            });

        const botaoCarrinho = document.getElementById(
            "rwShopCartButton"
        );

        if (botaoCarrinho) {
            botaoCarrinho.setAttribute(
                "aria-label",
                `Carrinho de compras, ${quantidade} itens`
            );
        }
    }

    /* =====================================================
       CRIAR A TELA DA LOJA
       ===================================================== */

    function ensureScreen() {
        let tela = document.getElementById(SHOP_ID);

        if (!tela) {
            tela = document.createElement("section");
            tela.id = SHOP_ID;
            tela.className = "tela tela-interna rw-shop";
            tela.hidden = true;

            document.body.appendChild(tela);
        } else {
            tela.classList.add("tela-interna", "rw-shop");
        }

        telaShop = tela;

        if (!tela.querySelector(".rw-shop-header")) {
            tela.innerHTML = `
                <div class="rw-shop-container">

                    <header class="rw-shop-header">
                        <button
                            type="button"
                            class="rw-shop-back"
                            data-shop-action="back"
                            aria-label="Voltar ao RunWorld"
                        >
                            <i data-lucide="arrow-left"></i>
                        </button>

                        <div class="rw-shop-heading">
                            <span class="rw-shop-eyebrow">
                                RUNWORLD
                            </span>

                            <h1>RunWorld Shop</h1>

                            <p>
                                Equipamentos para acompanhar
                                suas atividades.
                            </p>
                        </div>

                        <button
                            type="button"
                            id="rwShopCartButton"
                            class="rw-shop-cart-button"
                            data-shop-action="cart"
                            aria-label="Abrir carrinho"
                        >
                            <i data-lucide="shopping-cart"></i>
                            <span
                                class="rw-shop-count"
                                data-rw-shop-count
                                hidden
                            >0</span>
                        </button>
                    </header>

                    <section class="rw-shop-banner">
                        <span class="rw-shop-banner-icon">
                            <i data-lucide="footprints"></i>
                        </span>

                        <div>
                            <span class="rw-shop-eyebrow">
                                SEU PRÓXIMO TREINO
                            </span>

                            <h2>Prepare-se para ir mais longe.</h2>

                            <p>
                                Encontre produtos para corrida,
                                caminhada e atividades ao ar livre.
                            </p>
                        </div>
                    </section>

                    <section class="rw-shop-tools">
                        <label
                            class="rw-shop-search"
                            for="rwShopSearch"
                        >
                            <i data-lucide="search"></i>

                            <input
                                id="rwShopSearch"
                                type="search"
                                placeholder="Buscar produtos..."
                                autocomplete="off"
                            >
                        </label>

                        <div
                            class="rw-shop-categories"
                            role="group"
                            aria-label="Categorias de produtos"
                        >
                            <button
                                type="button"
                                data-shop-category="todos"
                                class="active"
                                aria-pressed="true"
                            >
                                Todos
                            </button>

                            <button
                                type="button"
                                data-shop-category="calcados"
                                aria-pressed="false"
                            >
                                Calçados
                            </button>

                            <button
                                type="button"
                                data-shop-category="roupas"
                                aria-pressed="false"
                            >
                                Roupas
                            </button>

                            <button
                                type="button"
                                data-shop-category="acessorios"
                                aria-pressed="false"
                            >
                                Acessórios
                            </button>

                            <button
                                type="button"
                                data-shop-category="hidratacao"
                                aria-pressed="false"
                            >
                                Hidratação
                            </button>
                        </div>
                    </section>

                    <section class="rw-shop-products-section">
                        <div class="rw-shop-section-heading">
                            <div>
                                <span class="rw-shop-eyebrow">
                                    VITRINE
                                </span>

                                <h2>Produtos</h2>
                            </div>

                            <span
                                id="rwShopProductCount"
                                class="rw-shop-product-count"
                            ></span>
                        </div>

                        <div
                            id="rwShopProducts"
                            class="rw-shop-products"
                        ></div>

                        <p
                            id="rwShopEmpty"
                            class="rw-shop-empty"
                            hidden
                        >
                            Nenhum produto encontrado.
                            Tente outra busca ou categoria.
                        </p>
                    </section>

                    <section
                        id="rwShopCart"
                        class="rw-shop-cart"
                        hidden
                    >
                        <div class="rw-shop-section-heading">
                            <div>
                                <span class="rw-shop-eyebrow">
                                    SEUS PRODUTOS
                                </span>

                                <h2>Meu carrinho</h2>
                            </div>

                            <button
                                type="button"
                                class="rw-shop-text-button"
                                data-shop-action="close-cart"
                            >
                                Continuar comprando
                            </button>
                        </div>

                        <div id="rwShopCartItems"></div>

                        <p
                            id="rwShopCartEmpty"
                            class="rw-shop-empty"
                            hidden
                        >
                            Seu carrinho está vazio.
                        </p>

                        <p class="rw-shop-cart-note">
                            Os produtos são vendidos por lojas externas.
                            O preço, o frete e a disponibilidade são
                            confirmados no site do vendedor.
                        </p>
                    </section>

                    <footer class="rw-shop-footer">
                        <p>
                            RunWorld Shop · Explore. Corra. Conquiste.
                        </p>
                    </footer>

                </div>
            `;
        }

        return tela;
    }

    /* =====================================================
       ATALHOS NO TOPO E NO MENU
       ===================================================== */

    function criarBotaoTopo() {
        const areaTopo = document.querySelector(".topo-acoes");

        if (!areaTopo) return;

        let botao = document.getElementById(
            "abrirRunWorldShop"
        );

        if (!botao) {
            botao = document.createElement("button");
            botao.id = "abrirRunWorldShop";
            botao.type = "button";
            botao.className = "icone-btn rw-shop-shortcut";
            botao.setAttribute(
                "aria-label",
                "Abrir RunWorld Shop"
            );
            botao.title = "RunWorld Shop";

            botao.innerHTML = `
                <i data-lucide="shopping-cart"></i>
            `;

            const perfil = document.getElementById("abrirPerfil");

            if (perfil && perfil.parentElement === areaTopo) {
                areaTopo.insertBefore(botao, perfil);
            } else {
                areaTopo.appendChild(botao);
            }
        }
    }

    function criarBotaoMenu() {
        const menu = document.getElementById("menuFlutuante");

        if (!menu) return;

        let botao = document.getElementById("abrirShopMenu");

        if (!botao) {
            botao = document.createElement("button");
            botao.id = "abrirShopMenu";
            botao.type = "button";
            botao.className = "item-menu rw-shop-menu-shortcut";

            botao.innerHTML = `
                <i data-lucide="shopping-cart"></i>
                <span>
                    <strong>RunWorld Shop</strong>
                    <small>Produtos para seus treinos</small>
                </span>
            `;

            const configuracoes = document.getElementById(
                "abrirConfiguracoes"
            );

            if (
                configuracoes &&
                configuracoes.parentElement === menu
            ) {
                menu.insertBefore(botao, configuracoes);
            } else {
                menu.appendChild(botao);
            }
        }
    }

    function instalarAtalhos() {
        criarBotaoTopo();
        criarBotaoMenu();
        refreshIcons();
    }

    /* =====================================================
       VITRINE
       ===================================================== */

        function obterProdutosFiltrados() {
        const termo = buscaAtual.trim().toLocaleLowerCase("pt-BR");

        return PRODUCTS.filter(produto => {
            const categoriaCorreta =
                categoriaAtual === "todos" ||
                produto.category === categoriaAtual;

            const textoProduto = [
                produto.name,
                produto.description,
                produto.seller
            ].join(" ").toLocaleLowerCase("pt-BR");

            const buscaCorreta =
                !termo || textoProduto.includes(termo);

            return categoriaCorreta && buscaCorreta;
        });
    }

    function renderProducts() {
        const container = document.getElementById("rwShopProducts");
        const contador = document.getElementById("rwShopProductCount");
        const vazio = document.getElementById("rwShopEmpty");

        if (!container || !contador || !vazio) return;

        const produtos = obterProdutosFiltrados();

        contador.textContent = `${produtos.length} ${
            produtos.length === 1 ? "produto" : "produtos"
        }`;

        vazio.hidden = produtos.length !== 0;

        container.innerHTML = produtos.map(produto => {
            const icone =
                produto.category === "calcados" ? "footprints" :
                produto.category === "roupas" ? "shirt" :
                produto.category === "hidratacao" ? "droplets" :
                "watch";

            return `
                <article class="rw-shop-product">
                    <div class="rw-shop-product-image">
                        <span class="rw-shop-product-icon">
                            <i data-lucide="${icone}"></i>
                        </span>
                    </div>

                    <div class="rw-shop-product-info">
                        <span class="rw-shop-product-category">
                            ${escapeHtml(produto.category)}
                        </span>

                        <h3>${escapeHtml(produto.name)}</h3>
                        <p>${escapeHtml(produto.description)}</p>

                        <div class="rw-shop-product-price">
                            Consultar preço
                        </div>

                        <span class="rw-shop-seller">
                            Vendedor: ${escapeHtml(produto.seller)}
                        </span>

                        <div class="rw-shop-product-actions">
                            <button
                                type="button"
                                class="rw-shop-add"
                                data-shop-action="add"
                                data-product-id="${escapeHtml(produto.id)}"
                            >
                                <i data-lucide="plus"></i>
                                Adicionar
                            </button>

                            <button
                                type="button"
                                class="rw-shop-buy"
                                data-shop-action="buy"
                                data-product-id="${escapeHtml(produto.id)}"
                            >
                                Ver produto
                                <i data-lucide="external-link"></i>
                            </button>
                        </div>
                    </div>
                </article>
            `;
        }).join("");

        refreshIcons();
    }

    /* =====================================================
       CARRINHO
       ===================================================== */

    function adicionarAoCarrinho(id) {
        const produto = PRODUCTS.find(item => item.id === id);
        if (!produto) return;

        const carrinho = lerCarrinho();
        const atual = Number(carrinho[id] || 0);

        if (atual >= 99) {
            alert("Você já atingiu o limite deste produto no carrinho.");
            return;
        }

        carrinho[id] = atual + 1;

        if (salvarCarrinho(carrinho)) {
            renderCart();
        }
    }

    function alterarQuantidade(id, delta) {
        const carrinho = lerCarrinho();
        if (!carrinho[id]) return;

        const novaQuantidade = carrinho[id] + delta;

        if (novaQuantidade <= 0) {
            delete carrinho[id];
        } else {
            carrinho[id] = Math.min(novaQuantidade, 99);
        }

        salvarCarrinho(carrinho);
        renderCart();
    }

    function removerDoCarrinho(id) {
        const carrinho = lerCarrinho();
        delete carrinho[id];

        salvarCarrinho(carrinho);
        renderCart();
    }

    function renderCart() {
        const container = document.getElementById("rwShopCartItems");
        const vazio = document.getElementById("rwShopCartEmpty");
        const carrinho = lerCarrinho();

        if (!container || !vazio) return;

        const itens = PRODUCTS.filter(
            produto => Number(carrinho[produto.id]) > 0
        );

        vazio.hidden = itens.length !== 0;

        container.innerHTML = itens.map(produto => `
            <article class="rw-shop-cart-item">
                <div class="rw-shop-cart-item-info">
                    <strong>${escapeHtml(produto.name)}</strong>
                    <span>${escapeHtml(produto.seller)}</span>
                    <span>Preço confirmado no site do vendedor</span>
                </div>

                <div class="rw-shop-quantity">
                    <button
                        type="button"
                        data-shop-action="decrease"
                        data-product-id="${escapeHtml(produto.id)}"
                        aria-label="Diminuir quantidade"
                    >−</button>

                    <span>${Number(carrinho[produto.id])}</span>

                    <button
                        type="button"
                        data-shop-action="increase"
                        data-product-id="${escapeHtml(produto.id)}"
                        aria-label="Aumentar quantidade"
                    >+</button>
                </div>

                <button
                    type="button"
                    class="rw-shop-remove"
                    data-shop-action="remove"
                    data-product-id="${escapeHtml(produto.id)}"
                    aria-label="Remover ${escapeHtml(produto.name)}"
                >
                    <i data-lucide="trash-2"></i>
                </button>

                <button
                    type="button"
                    class="rw-shop-buy"
                    data-shop-action="buy"
                    data-product-id="${escapeHtml(produto.id)}"
                >
                    Ver vendedor
                    <i data-lucide="external-link"></i>
                </button>
            </article>
        `).join("");

        atualizarContador();
        refreshIcons();
    }

    function mostrarCarrinho(mostrar = true) {
        const carrinho = document.getElementById("rwShopCart");
        if (!carrinho) return;

        carrinho.hidden = !mostrar;

        if (mostrar) {
            renderCart();
            carrinho.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
        }
    }

    /* =====================================================
       NAVEGAÇÃO
       ===================================================== */

    function abrirLoja() {
        const tela = ensureScreen();

        instalarAtalhos();

        if (typeof window.abrirTela === "function") {
            window.abrirTela(SHOP_ID);
        }

        tela.hidden = false;
        tela.classList.add("active");
        document.body.classList.add("tela-interna-aberta");

        renderProducts();
        renderCart();
        atualizarContador();
        refreshIcons();

        return true;
    }

    function voltarDaLoja() {
        const tela = document.getElementById(SHOP_ID);

        if (tela) {
            tela.classList.remove("active");
            tela.hidden = true;
        }

        document.body.classList.remove("tela-interna-aberta");

        if (typeof window.voltarParaMapa === "function") {
            window.voltarParaMapa();
        } else {
            const mapa = document.getElementById("telaMapa");

            if (mapa) {
                mapa.classList.add("active");
                mapa.hidden = false;
            }
        }

        refreshIcons();
    }

    /* =====================================================
       EVENTOS
       ===================================================== */

    function handleClick(event) {
        const alvo = event.target;
        if (!(alvo instanceof Element)) return;

        const botao = alvo.closest("button");
        if (!botao) return;

        if (
            botao.id === "abrirRunWorldShop" ||
            botao.id === "abrirShopMenu"
        ) {
            event.preventDefault();
            abrirLoja();
            return;
        }

        if (botao.hasAttribute("data-shop-category")) {
            event.preventDefault();

            categoriaAtual = botao.dataset.shopCategory || "todos";

            document.querySelectorAll("[data-shop-category]").forEach(item => {
                const ativo = item.dataset.shopCategory === categoriaAtual;
                item.classList.toggle("active", ativo);
                item.setAttribute("aria-pressed", String(ativo));
            });

            renderProducts();
            return;
        }

        const action = botao.dataset.shopAction;
        const productId = botao.dataset.productId;

        if (!action) return;

        switch (action) {
            case "back":
                event.preventDefault();
                voltarDaLoja();
                break;

            case "cart":
                event.preventDefault();
                mostrarCarrinho(true);
                break;

            case "close-cart":
                event.preventDefault();
                mostrarCarrinho(false);
                break;

            case "add":
                event.preventDefault();
                adicionarAoCarrinho(productId);
                break;

            case "increase":
                event.preventDefault();
                alterarQuantidade(productId, 1);
                break;

            case "decrease":
                event.preventDefault();
                alterarQuantidade(productId, -1);
                break;

            case "remove":
                event.preventDefault();
                removerDoCarrinho(productId);
                break;

            case "buy": {
                event.preventDefault();

                const produto = PRODUCTS.find(
                    item => item.id === productId
                );

                if (produto) abrirLinkSeguro(produto.url);
                break;
            }
        }
    }

    function handleInput(event) {
        const alvo = event.target;

        if (
            alvo instanceof HTMLInputElement &&
            alvo.id === "rwShopSearch"
        ) {
            buscaAtual = alvo.value || "";
            renderProducts();
        }
    }

    /* =====================================================
       INICIALIZAÇÃO
       ===================================================== */

    function iniciar() {
        ensureScreen();
        instalarAtalhos();
        atualizarContador();
        renderProducts();
        renderCart();

        document.addEventListener("click", handleClick);
        document.addEventListener("input", handleInput);

        refreshIcons();
    }

    /* =====================================================
       FUNÇÕES PÚBLICAS
       ===================================================== */

    window.abrirRunWorldShop = abrirLoja;

    window.abrirCarrinhoRunWorldShop = () => {
        abrirLoja();
        mostrarCarrinho(true);
    };

    window.atualizarContadorRunWorldShop = atualizarContador;

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", iniciar, {
            once: true
        });
    } else {
        iniciar();
    }

})();
