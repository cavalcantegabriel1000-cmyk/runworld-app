/* =====================================================
   RUNWORLD SHOP — V1 CORRIGIDA
   Vitrine, escolha de compra e carrinho local
   Integração com a navegação existente do RunWorld
   ===================================================== */

(() => {
    "use strict";

    const CHAVE_CARRINHO = "runworld-shop-carrinho-v1";
    const LOJAS_PERMITIDAS = [
        "lista.mercadolivre.com.br",
        "www.amazon.com.br"
    ];

    const produtos = [
        {
            id: "tenis-01",
            nome: "Tênis para corrida",
            categoria: "Tênis",
            loja: "Mercado Livre",
            preco: 199.90,
            emoji: "👟",
            descricao: "Tênis esportivo para seus treinos.",
            linkLoja: "https://lista.mercadolivre.com.br/tenis-corrida",
            linkAfiliado: ""
        },
        {
            id: "tenis-02",
            nome: "Tênis esportivo",
            categoria: "Tênis",
            loja: "Amazon",
            preco: 229.90,
            emoji: "🏃",
            descricao: "Confira opções para corrida e caminhada.",
            linkLoja: "https://www.amazon.com.br/s?k=tenis+de+corrida",
            linkAfiliado: ""
        },
        {
            id: "acessorio-01",
            nome: "Meias esportivas",
            categoria: "Acessórios",
            loja: "Mercado Livre",
            preco: 29.90,
            emoji: "🧦",
            descricao: "Opções de meias para atividades físicas.",
            linkLoja: "https://lista.mercadolivre.com.br/meia-esportiva",
            linkAfiliado: ""
        },
        {
            id: "acessorio-02",
            nome: "Boné esportivo",
            categoria: "Acessórios",
            loja: "Amazon",
            preco: 49.90,
            emoji: "🧢",
            descricao: "Confira modelos para seus treinos.",
            linkLoja: "https://www.amazon.com.br/s?k=bone+esportivo",
            linkAfiliado: ""
        },
        {
            id: "hidratacao-01",
            nome: "Garrafa esportiva",
            categoria: "Hidratação",
            loja: "Mercado Livre",
            preco: 39.90,
            emoji: "🥤",
            descricao: "Garrafa para levar água durante o treino.",
            linkLoja: "https://lista.mercadolivre.com.br/garrafa-esportiva",
            linkAfiliado: ""
        },
        {
            id: "hidratacao-02",
            nome: "Garrafa para corrida",
            categoria: "Hidratação",
            loja: "Amazon",
            preco: 44.90,
            emoji: "💧",
            descricao: "Veja opções para manter a hidratação.",
            linkLoja: "https://www.amazon.com.br/s?k=garrafa+para+corrida",
            linkAfiliado: ""
        }
    ];

    let categoriaAtual = "Todas";
    let lojaAtual = "Todas";
    let buscaAtual = "";

    function lerCarrinho() {
        try {
            const dados = JSON.parse(
                window.localStorage.getItem(CHAVE_CARRINHO) || "[]"
            );

            if (!Array.isArray(dados)) return [];

            return dados
                .filter(item =>
                    item &&
                    typeof item.id === "string" &&
                    obterProduto(item.id) &&
                    Number.isInteger(item.quantidade) &&
                    item.quantidade > 0
                )
                .map(item => ({
                    id: item.id,
                    quantidade: Math.min(item.quantidade, 99)
                }));
        } catch (erro) {
            console.warn("[RunWorld Shop] Não foi possível ler o carrinho.", erro);
            return [];
        }
    }

    function salvarCarrinho(carrinho) {
        const seguro = Array.isArray(carrinho)
            ? carrinho.filter(item =>
                item &&
                typeof item.id === "string" &&
                obterProduto(item.id) &&
                Number.isInteger(item.quantidade) &&
                item.quantidade > 0
            )
            : [];

        try {
            window.localStorage.setItem(CHAVE_CARRINHO, JSON.stringify(seguro));
        } catch (erro) {
            console.warn("[RunWorld Shop] Não foi possível salvar o carrinho.", erro);
            mostrarAviso("Não foi possível salvar o carrinho neste dispositivo.");
        }

        atualizarContadorCarrinho();
    }

    function dinheiro(valor) {
        return Number(valor).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL"
        });
    }

    function escapar(texto) {
        return String(texto).replace(/[&<>"']/g, caractere => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[caractere]);
    }

    function obterProduto(id) {
        return produtos.find(produto => produto.id === id);
    }

    function criarTela() {
        let tela = document.getElementById("telaShop");

        if (!tela) {
            tela = document.createElement("section");
            tela.id = "telaShop";
            tela.className = "tela tela-interna rw-shop";

            tela.innerHTML = `
                <header class="rw-shop-topo">
                    <button class="icone-btn" id="shopVoltar" type="button"
                        aria-label="Voltar ao mapa">
                        <i data-lucide="arrow-left"></i>
                    </button>

                    <div class="rw-shop-marca">
                        <img class="rw-shop-logo" src="runworld-logo.svg" alt="Logo RunWorld">
                        <div class="rw-shop-titulo">
                            <h1>RunWorld <span>Shop</span></h1>
                            <p>Equipamentos para sua jornada</p>
                        </div>
                    </div>

                    <button class="icone-btn rw-shop-carrinho" type="button"
                        id="shopAbrirCarrinho" aria-label="Abrir carrinho">
                        <i data-lucide="shopping-cart"></i>
                        <span id="shopContador">0</span>
                    </button>
                </header>

                <div class="rw-shop-conteudo">
                    <div class="rw-shop-aviso">
                        <i data-lucide="info"></i>
                        <span>
                            Preços de referência, não atualizados automaticamente.
                            Confirme o valor no site do vendedor.
                        </span>
                    </div>

                    <label class="rw-shop-busca">
                        <i data-lucide="search"></i>
                        <input id="shopBusca" type="search"
                            placeholder="Buscar produtos..."
                            autocomplete="off">
                    </label>

                    <div class="rw-shop-categorias" id="shopCategorias">
                        <button type="button" class="selecionado" data-categoria="Todas">Todas</button>
                        <button type="button" data-categoria="Tênis">Tênis</button>
                        <button type="button" data-categoria="Acessórios">Acessórios</button>
                        <button type="button" data-categoria="Hidratação">Hidratação</button>
                    </div>

                    <div class="rw-shop-lojas" id="shopLojas">
                        <button type="button" class="selecionado" data-loja="Todas">Todas as lojas</button>
                        <button type="button" data-loja="Mercado Livre">Mercado Livre</button>
                        <button type="button" data-loja="Amazon">Amazon</button>
                    </div>

                    <div class="rw-shop-resultados">
                        <h2>Produtos</h2>
                        <span id="shopQuantidade"></span>
                    </div>

                    <div class="rw-shop-produtos" id="shopProdutos"></div>
                    <p class="rw-shop-vazio" id="shopVazio" hidden>
                        Nenhum produto encontrado.
                    </p>
                </div>
            `;

            document.body.appendChild(tela);
        }

        configurarAtalhos();
        configurarEventosTela();
        renderizarProdutos();
        atualizarContadorCarrinho();
        criarIcones();
    }

    function configurarAtalhos() {
        const topoAcoes = document.querySelector(".topo-acoes");

        if (topoAcoes && !document.getElementById("botaoRunWorldShop")) {
            const botao = document.createElement("button");
            botao.id = "botaoRunWorldShop";
            botao.className = "icone-btn";
            botao.type = "button";
            botao.setAttribute("aria-label", "Abrir RunWorld Shop");
            botao.innerHTML = '<i data-lucide="shopping-bag"></i>';

            const perfil = document.getElementById("abrirPerfil");
            topoAcoes.insertBefore(botao, perfil || null);
            botao.addEventListener("click", abrirShop);
        }

        const menu = document.getElementById("menuFlutuante");

        if (menu && !document.getElementById("abrirShopMenu")) {
            const botaoMenu = document.createElement("button");
            botaoMenu.id = "abrirShopMenu";
            botaoMenu.className = "item-menu";
            botaoMenu.type = "button";
            botaoMenu.innerHTML = `
                <i data-lucide="shopping-bag"></i>
                <span>RunWorld Shop</span>
            `;

            menu.appendChild(botaoMenu);
            botaoMenu.addEventListener("click", abrirShop);
        }
    }

    function configurarEventosTela() {
        const voltar = document.getElementById("shopVoltar");
        const carrinho = document.getElementById("shopAbrirCarrinho");
        const busca = document.getElementById("shopBusca");
        const categorias = document.getElementById("shopCategorias");
        const lojas = document.getElementById("shopLojas");
        const grade = document.getElementById("shopProdutos");

        if (voltar && voltar.dataset.shopConfigurado !== "1") {
            voltar.dataset.shopConfigurado = "1";
            voltar.addEventListener("click", voltarAoMapa);
        }

        if (carrinho && carrinho.dataset.shopConfigurado !== "1") {
            carrinho.dataset.shopConfigurado = "1";
            carrinho.addEventListener("click", abrirCarrinho);
        }

        if (busca && busca.dataset.shopConfigurado !== "1") {
            busca.dataset.shopConfigurado = "1";
            busca.addEventListener("input", evento => {
                buscaAtual = evento.target.value.trim().toLowerCase();
                renderizarProdutos();
            });
        }

        if (categorias && categorias.dataset.shopConfigurado !== "1") {
            categorias.dataset.shopConfigurado = "1";
            categorias.addEventListener("click", evento => {
                const botao = evento.target.closest("[data-categoria]");
                if (!botao) return;

                categoriaAtual = botao.dataset.categoria;
                categorias.querySelectorAll("[data-categoria]").forEach(item => {
                    item.classList.toggle("selecionado", item === botao);
                });
                renderizarProdutos();
            });
        }

        if (lojas && lojas.dataset.shopConfigurado !== "1") {
            lojas.dataset.shopConfigurado = "1";
            lojas.addEventListener("click", evento => {
                const botao = evento.target.closest("[data-loja]");
                if (!botao) return;

                lojaAtual = botao.dataset.loja;
                lojas.querySelectorAll("[data-loja]").forEach(item => {
                    item.classList.toggle("selecionado", item === botao);
                });
                renderizarProdutos();
            });
        }

        if (grade && grade.dataset.shopConfigurado !== "1") {
            grade.dataset.shopConfigurado = "1";
            grade.addEventListener("click", evento => {
                const botao = evento.target.closest("[data-comprar]");
                if (!botao) return;
                abrirEscolhaCompra(botao.dataset.comprar);
            });
        }
    }

    function criarIcones() {
        if (window.lucide && typeof window.lucide.createIcons === "function") {
            window.lucide.createIcons();
        }
    }

    function abrirShop() {
        const tela = document.getElementById("telaShop");
        if (!tela) return;

        // Usa a navegação já existente do RunWorld.
        if (typeof window.abrirTela === "function") {
            window.abrirTela("telaShop");
        } else {
            // Fallback para casos em que o app.js ainda não expôs a função.
            document.querySelectorAll(".tela-interna").forEach(item => {
                item.classList.remove("active");
            });
            tela.classList.add("active");
            const mapa = document.getElementById("telaMapa");
            if (mapa) mapa.classList.add("active");
        }

        renderizarProdutos();
        atualizarContadorCarrinho();
        criarIcones();
    }

    function voltarAoMapa() {
        // Usa a função central do app.js para fechar painéis corretamente.
        if (typeof window.voltarParaMapa === "function") {
            window.voltarParaMapa();
        } else {
            document.querySelectorAll(".tela-interna").forEach(item => {
                item.classList.remove("active");
            });
            const mapa = document.getElementById("telaMapa");
            if (mapa) mapa.classList.add("active");
        }

        criarIcones();
    }

    function renderizarProdutos() {
        const grade = document.getElementById("shopProdutos");
        if (!grade) return;

        const filtrados = produtos.filter(produto => {
            const combinaCategoria =
                categoriaAtual === "Todas" ||
                produto.categoria === categoriaAtual;

            const combinaLoja =
                lojaAtual === "Todas" ||
                produto.loja === lojaAtual;

            const texto = (
                produto.nome + " " +
                produto.descricao + " " +
                produto.categoria + " " +
                produto.loja
            ).toLowerCase();

            return combinaCategoria && combinaLoja &&
                texto.includes(buscaAtual);
        });

        const quantidade = document.getElementById("shopQuantidade");
        const vazio = document.getElementById("shopVazio");

        if (quantidade) quantidade.textContent = `${filtrados.length} produto(s)`;
        if (vazio) vazio.hidden = filtrados.length > 0;

        grade.innerHTML = filtrados.map(produto => `
            <article class="rw-shop-card">
                <div class="rw-shop-imagem">${produto.emoji}</div>
                <div class="rw-shop-card-corpo">
                    <span class="rw-shop-etiqueta">${escapar(produto.categoria)}</span>
                    <h3>${escapar(produto.nome)}</h3>
                    <p>${escapar(produto.descricao)}</p>
                    <span class="rw-shop-preco">${dinheiro(produto.preco)}</span>
                    <small>Preço de referência</small>
                    <span class="rw-shop-vendedor">${escapar(produto.loja)}</span>
                    <button type="button" class="rw-shop-comprar" data-comprar="${escapar(produto.id)}">
                        Comprar
                    </button>
                </div>
            </article>
        `).join("");

        criarIcones();
    }

    function abrirModal(titulo, conteudo) {
        document.getElementById("shopModal")?.remove();

        const modal = document.createElement("div");
        modal.id = "shopModal";
        modal.className = "rw-shop-modal-fundo";
        modal.innerHTML = `
            <section class="rw-shop-modal" role="dialog"
                aria-modal="true" aria-labelledby="shopModalTitulo">
                <button type="button" class="rw-shop-fechar" aria-label="Fechar">×</button>
                <h2 id="shopModalTitulo">${escapar(titulo)}</h2>
                <div class="rw-shop-modal-conteudo">${conteudo}</div>
            </section>
        `;

        document.body.appendChild(modal);

        modal.querySelector(".rw-shop-fechar").addEventListener("click", () => modal.remove());
        modal.addEventListener("click", evento => {
            if (evento.target === modal) modal.remove();
        });

        const teclaEscape = evento => {
            if (evento.key === "Escape") {
                modal.remove();
                document.removeEventListener("keydown", teclaEscape);
            }
        };
        document.addEventListener("keydown", teclaEscape);

        criarIcones();
        return modal;
    }

    function abrirEscolhaCompra(id) {
        const produto = obterProduto(id);
        if (!produto) return;

        const modal = abrirModal("O que você deseja fazer?", `
            <p class="rw-shop-modal-produto">${produto.emoji} <strong>${escapar(produto.nome)}</strong></p>
            <p>Preço de referência: <strong>${dinheiro(produto.preco)}</strong></p>
            <button type="button" class="rw-shop-opcao" id="shopAdicionar">
                <i data-lucide="shopping-cart"></i>
                <span><strong>Adicionar ao carrinho</strong><small>Guardar e continuar olhando a loja.</small></span>
            </button>
            <button type="button" class="rw-shop-opcao" id="shopComprarAgora">
                <i data-lucide="external-link"></i>
                <span><strong>Comprar agora</strong><small>Abrir o vendedor para conferir o produto.</small></span>
            </button>
            <p class="rw-shop-nota">A compra e o pagamento acontecem no site do vendedor.</p>
        `);

        modal.querySelector("#shopAdicionar").addEventListener("click", () => {
            adicionarAoCarrinho(id);
            modal.remove();
            mostrarAviso("Produto adicionado ao carrinho!");
        });

        modal.querySelector("#shopComprarAgora").addEventListener("click", () => {
            abrirLinkProduto(produto);
            modal.remove();
        });
    }

    function adicionarAoCarrinho(id) {
        const produto = obterProduto(id);
        if (!produto) return;

        const carrinho = lerCarrinho();
        const existente = carrinho.find(item => item.id === id);

        if (existente) {
            if (existente.quantidade >= 99) {
                mostrarAviso("Você atingiu o limite desse produto no carrinho.");
                return;
            }
            existente.quantidade += 1;
        } else {
            carrinho.push({ id, quantidade: 1 });
        }

        salvarCarrinho(carrinho);
    }

    function atualizarContadorCarrinho() {
        const total = lerCarrinho().reduce(
            (soma, item) => soma + item.quantidade, 0
        );
        const contador = document.getElementById("shopContador");
        if (contador) contador.textContent = String(total);
    }

    function abrirCarrinho() {
        const carrinho = lerCarrinho();

        const linhas = carrinho.map(item => {
            const produto = obterProduto(item.id);
            if (!produto) return "";

            return `
                <div class="rw-shop-linha-carrinho">
                    <div>
                        <strong>${produto.emoji} ${escapar(produto.nome)}</strong>
                        <small>${item.quantidade} × ${dinheiro(produto.preco)}</small>
                    </div>
                    <button type="button" data-remover="${escapar(produto.id)}"
                        aria-label="Remover ${escapar(produto.nome)}">Remover</button>
                </div>
            `;
        }).join("");

        const total = carrinho.reduce((soma, item) => {
            const produto = obterProduto(item.id);
            return soma + (produto ? produto.preco * item.quantidade : 0);
        }, 0);

        const modal = abrirModal("Seu carrinho", `
            ${linhas || "<p>Seu carrinho está vazio.</p>"}
            <div class="rw-shop-total">
                <span>Total estimado</span>
                <strong>${dinheiro(total)}</strong>
            </div>
            <p class="rw-shop-nota">
                Total estimado com preços de referência. Os valores podem mudar no vendedor.
            </p>
            <button type="button" class="rw-shop-comprar" id="shopContinuarCompra"
                ${carrinho.length ? "" : "disabled"}>Continuar para a loja</button>
            <button type="button" class="rw-shop-limpar" id="shopLimparCarrinho">Limpar carrinho</button>
        `);

        modal.querySelectorAll("[data-remover]").forEach(botao => {
            botao.addEventListener("click", () => {
                salvarCarrinho(lerCarrinho().filter(item => item.id !== botao.dataset.remover));
                modal.remove();
                abrirCarrinho();
            });
        });

        modal.querySelector("#shopLimparCarrinho").addEventListener("click", () => {
            salvarCarrinho([]);
            modal.remove();
            abrirCarrinho();
        });

        modal.querySelector("#shopContinuarCompra").addEventListener("click", () => {
            const itensValidos = lerCarrinho();
            if (!itensValidos.length) return;

            // Como há vendedores diferentes, abre a página do primeiro item.
            // O usuário confirma disponibilidade, frete e valor no site do vendedor.
            const primeiro = obterProduto(itensValidos[0].id);
            if (primeiro) abrirLinkProduto(primeiro);
            modal.remove();
        });
    }

    function abrirLinkProduto(produto) {
        const destino = produto.linkAfiliado || produto.linkLoja;

        try {
            const url = new URL(destino);
            if (url.protocol !== "https:" || !LOJAS_PERMITIDAS.includes(url.hostname)) {
                mostrarAviso("O link deste vendedor não passou na validação.");
                return;
            }

            const novaAba = window.open(url.href, "_blank", "noopener,noreferrer");
            if (!novaAba) {
                mostrarAviso("O navegador bloqueou a nova aba. Permita pop-ups para abrir a loja.");
            }
        } catch (erro) {
            mostrarAviso("O link deste produto está indisponível.");
        }
    }

    function mostrarAviso(mensagem) {
        const aviso = document.createElement("div");
        aviso.className = "rw-shop-toast";
        aviso.setAttribute("role", "status");
        aviso.textContent = mensagem;
        document.body.appendChild(aviso);
        window.setTimeout(() => aviso.remove(), 2600);
    }

    function iniciar() {
        criarTela();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", iniciar, { once: true });
    } else {
        iniciar();
    }
})();
