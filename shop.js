
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
    class="rw-shop-filters"
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

   
    function renderizarProdutos() {
        const lista = document.getElementById("rwShopProducts");
        const contador = document.getElementById("rwShopProductCount");
        const vazio = document.getElementById("rwShopEmpty");

        if (!lista) return;

        const termo = buscaAtual.trim().toLocaleLowerCase("pt-BR");

        const filtrados = PRODUCTS.filter(produto => {
            const correspondeCategoria =
                categoriaAtual === "todos" ||
                produto.category === categoriaAtual;

            const texto = [
                produto.name,
                produto.description,
                produto.seller,
                produto.category
            ].join(" ").toLocaleLowerCase("pt-BR");

            return correspondeCategoria && texto.includes(termo);
        });

        
lista.innerHTML = filtrados.map(produto => `
    <article class="rw-shop-card">

        <div class="rw-shop-product-media">
            <span class="rw-shop-product-placeholder" aria-hidden="true">
                ${iconeProduto(produto.category)}
            </span>

            <span class="rw-shop-product-tag">
                ${escapeHtml(nomeCategoria(produto.category))}
            </span>
        </div>

        <div class="rw-shop-card-body">

            <h3>${escapeHtml(produto.name)}</h3>

            <p>${escapeHtml(produto.description)}</p>

            <div class="rw-shop-price">
                Consultar preço
            </div>

            <p class="rw-shop-seller">
                Vendedor: ${escapeHtml(produto.seller)}
            </p>

            <div class="rw-shop-card-actions">

                <button
                    type="button"
                    class="rw-shop-button"
                    data-shop-action="buy"
                    data-product-id="${escapeHtml(produto.id)}"
                >
                    Ver produto
                </button>

                <button
                    type="button"
                    class="rw-shop-button rw-shop-button-secondary"
                    data-shop-action="add"
                    data-product-id="${escapeHtml(produto.id)}"
                >
                    <i data-lucide="shopping-cart"></i>
                    Adicionar
                </button>

            </div>
        </div>
    </article>
`).join("");

if (contador) {
    contador.textContent =
        `${filtrados.length} ${filtrados.length === 1
            ? "produto"
            : "produtos"}`;
}

if (vazio) {
    vazio.hidden = filtrados.length !== 0;
}

refreshIcons();

    }

    function nomeCategoria(categoria) {
        const nomes = {
            calcados: "Calçados",
            roupas: "Roupas",
            acessorios: "Acessórios",
            hidratacao: "Hidratação"
        };

        return nomes[categoria] || "Esportes";
    }

    function iconeProduto(categoria) {
        const icones = {
            calcados: "👟",
            roupas: "👕",
            acessorios: "⌚",
            hidratacao: "💧"
        };

        return icones[categoria] || "🏃";
    }

    function atualizarCategorias() {
        document.querySelectorAll("[data-shop-category]")
            .forEach(botao => {
                const ativo =
                    botao.dataset.shopCategory === categoriaAtual;

                botao.classList.toggle("active", ativo);
                botao.setAttribute("aria-pressed", String(ativo));
            });
    }

    /* =====================================================
       CARRINHO
       ===================================================== */

    function adicionarAoCarrinho(id) {
        const produto = PRODUCTS.find(item => item.id === id);

        if (!produto) return;

        const carrinho = lerCarrinho();
        const quantidade = Number(carrinho[id] || 0);

        if (quantidade >= 99) {
            mostrarAviso("Limite de 99 unidades por produto.");
            return;
        }

        carrinho[id] = quantidade + 1;

        if (salvarCarrinho(carrinho)) {
            renderizarCarrinho();
            mostrarAviso(`${produto.name} adicionado ao carrinho.`);
        }
    }

    function alterarQuantidade(id, delta) {
        const carrinho = lerCarrinho();

        if (!PRODUCTS.some(produto => produto.id === id)) return;

        const novaQuantidade = Number(carrinho[id] || 0) + delta;

        if (novaQuantidade <= 0) {
            delete carrinho[id];
        } else {
            carrinho[id] = Math.min(99, novaQuantidade);
        }

        salvarCarrinho(carrinho);
        renderizarCarrinho();
    }

    function removerDoCarrinho(id) {
        const carrinho = lerCarrinho();

        if (!Object.prototype.hasOwnProperty.call(carrinho, id)) {
            return;
        }

        delete carrinho[id];
        salvarCarrinho(carrinho);
        renderizarCarrinho();
        mostrarAviso("Produto removido do carrinho.");
    }

    function renderizarCarrinho() {
        const lista = document.getElementById("rwShopCartItems");
        const vazio = document.getElementById("rwShopCartEmpty");

        if (!lista) return;

        const carrinho = lerCarrinho();
        const itens = PRODUCTS.filter(produto =>
            Number(carrinho[produto.id]) > 0
        );

        lista.className = "rw-shop-cart-list";

        lista.innerHTML = itens.map(produto => {
            const quantidade = carrinho[produto.id];

            return `
                <article class="rw-shop-cart-item">
                    <div class="rw-shop-cart-item-info">
                        <h3>${escapeHtml(produto.name)}</h3>
                        <p>${escapeHtml(produto.seller)} · Consultar preço</p>

                        <div class="rw-shop-quantity">
                            <button
                                type="button"
                                data-shop-action="quantity"
                                data-product-id="${escapeHtml(produto.id)}"
                                data-delta="-1"
                                aria-label="Diminuir quantidade"
                            >−</button>

                            <span>${quantidade}</span>

                            <button
                                type="button"
                                data-shop-action="quantity"
                                data-product-id="${escapeHtml(produto.id)}"
                                data-delta="1"
                                aria-label="Aumentar quantidade"
                            >+</button>
                        </div>
                    </div>

                    <div class="rw-shop-cart-item-actions">
                        <button
                            type="button"
                            class="rw-shop-remove"
                            data-shop-action="remove"
                            data-product-id="${escapeHtml(produto.id)}"
                        >
                            Remover
                        </button>

                        <button
                            type="button"
                            class="rw-shop-action-primary"
                            data-shop-action="buy"
                            data-product-id="${escapeHtml(produto.id)}"
                        >
                            Ver produto
                        </button>
                    </div>
                </article>
            `;
        }).join("");

        if (vazio) {
            vazio.hidden = itens.length > 0;
        }

        atualizarContador();
        refreshIcons();
    }

    function abrirCarrinho() {
        const carrinho = document.getElementById("rwShopCart");

        if (!carrinho) return;

        carrinho.hidden = false;
        renderizarCarrinho();

        carrinho.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }

    function fecharCarrinho() {
        const carrinho = document.getElementById("rwShopCart");

        if (carrinho) {
            carrinho.hidden = true;
        }
    }

    /* =====================================================
       NAVEGAÇÃO E AVISOS
       ===================================================== */

    function mostrarAviso(mensagem) {
        let aviso = document.getElementById("rwShopFeedback");

        if (!aviso) {
            aviso = document.createElement("div");
            aviso.id = "rwShopFeedback";
            aviso.className = "rw-shop-feedback";
            aviso.setAttribute("role", "status");
            aviso.setAttribute("aria-live", "polite");

            const tela = ensureScreen();
            tela.appendChild(aviso);
        }

        aviso.textContent = mensagem;
        aviso.hidden = false;
    }

    function abrirLoja() {
        const tela = ensureScreen();

        instalarAtalhos();

        if (typeof window.abrirTela === "function") {
            window.abrirTela(SHOP_ID);
        }

        tela.hidden = false;
        tela.classList.add("active");
        document.body.classList.add("tela-interna-aberta");

        fecharCarrinho();
        atualizarCategorias();
        renderizarProdutos();
        renderizarCarrinho();
        refreshIcons();
    }

    function voltarDaLoja() {
        const tela = document.getElementById(SHOP_ID);

        if (tela) {
            tela.hidden = true;
            tela.classList.remove("active");
        }

        document.body.classList.remove("tela-interna-aberta");

        if (typeof window.voltarParaMapa === "function") {
            window.voltarParaMapa();
        }
    }

    function tratarClique(evento) {
        const alvo = evento.target instanceof Element
            ? evento.target.closest(
                "[data-shop-action], [data-shop-category], #abrirRunWorldShop, #abrirShopMenu"
            )
            : null;

        if (!alvo) return;

        if (
            alvo.id === "abrirRunWorldShop" ||
            alvo.id === "abrirShopMenu"
        ) {
            evento.preventDefault();
            abrirLoja();
            return;
        }

        if (alvo.hasAttribute("data-shop-category")) {
            categoriaAtual = alvo.dataset.shopCategory || "todos";
            atualizarCategorias();
            renderizarProdutos();
            return;
        }

        const acao = alvo.dataset.shopAction;
        const id = alvo.dataset.productId;

        switch (acao) {
            case "back":
                voltarDaLoja();
                break;

            case "cart":
                abrirCarrinho();
                break;

            case "close-cart":
                fecharCarrinho();
                break;

            case "buy": {
                const produto = PRODUCTS.find(item => item.id === id);

                if (produto) {
                    abrirLinkSeguro(produto.url);
                }
                break;
            }

            case "add":
                adicionarAoCarrinho(id);
                break;

            case "quantity":
                alterarQuantidade(id, Number(alvo.dataset.delta || 0));
                break;

            case "remove":
                removerDoCarrinho(id);
                break;
        }
    }

    function iniciar() {
        ensureScreen();
        instalarAtalhos();
        atualizarContador();
        renderizarProdutos();
        renderizarCarrinho();

        const busca = document.getElementById("rwShopSearch");

        if (busca) {
            busca.addEventListener("input", () => {
                buscaAtual = busca.value || "";
                renderizarProdutos();
            });
        }

        document.addEventListener("click", tratarClique);

        window.abrirRunWorldShop = abrirLoja;
        window.abrirCarrinhoRunWorldShop = abrirCarrinho;
        window.atualizarContadorRunWorldShop = atualizarContador;

        refreshIcons();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", iniciar, {
            once: true
        });
    } else {
        iniciar();
    }
})();
               
    
