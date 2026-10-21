
/* =====================================================
   RUNWORLD — SISTEMA DE NOTIFICAÇÕES
   Compatível com app.js, index.html e style.css.
===================================================== */

(function () {
    "use strict";

    const CHAVE = "runworld-notificacoes";
    const LIMITE = 50;

    let notificacoes = [];
    let proximoId = 1;
    let inicializado = false;
    let eventosConfigurados = false;

    function elemento(id) {
        return document.getElementById(id);
    }

    function carregar() {
        try {
            const dados = JSON.parse(
                localStorage.getItem(CHAVE) || "[]"
            );

            notificacoes = Array.isArray(dados)
                ? dados
                    .filter(item => item && typeof item === "object")
                    .slice(0, LIMITE)
                : [];

            proximoId = notificacoes.reduce(
                (max, item) =>
                    Math.max(max, Number(item.id) || 0),
                0
            ) + 1;
        } catch (erro) {
            console.warn(
                "RunWorld: erro ao carregar notificações.",
                erro
            );

            notificacoes = [];
            proximoId = 1;
        }
    }

    function guardar() {
        try {
            notificacoes = notificacoes.slice(0, LIMITE);

            localStorage.setItem(
                CHAVE,
                JSON.stringify(notificacoes)
            );
        } catch (erro) {
            console.warn(
                "RunWorld: não foi possível guardar notificações.",
                erro
            );
        }
    }

    function contarNaoLidas() {
        return notificacoes.filter(item => !item.lida).length;
    }

    function atualizarContador() {
        const quantidade = contarNaoLidas();

        // Compatível com um contador que pode ser adicionado ao HTML.
        const contador =
            elemento("contadorNotificacoes") ||
            document.querySelector(".contador-notificacoes");

        if (contador) {
            contador.textContent =
                quantidade > 99 ? "99+" : String(quantidade);

            contador.hidden = quantidade === 0;
            contador.setAttribute(
                "aria-label",
                quantidade === 1
                    ? "1 notificação não lida"
                    : `${quantidade} notificações não lidas`
            );
        }

        const botao = elemento("botaoNotificacoes");

        if (botao) {
            botao.setAttribute(
                "aria-label",
                quantidade
                    ? `Notificações, ${quantidade} não lidas`
                    : "Notificações"
            );
        }
    }

    function renderizar() {
        const lista = elemento("listaNotificacoes");
        const vazias = elemento("notificacoesVazias");

        atualizarContador();

        if (!lista) return;

        lista.replaceChildren();

        if (vazias) {
            vazias.hidden = notificacoes.length > 0;
        }

        notificacoes.forEach(notificacao => {
            const item = document.createElement("article");

            item.className = "notificacao-item";
            item.dataset.notificacaoId = String(notificacao.id);

            if (!notificacao.lida) {
                item.classList.add("nao-lida");
            }

            const icone = document.createElement("div");
            icone.className = "notificacao-icone";
            icone.textContent = notificacao.icone || "🔔";
            icone.setAttribute("aria-hidden", "true");

            const conteudo = document.createElement("div");
            conteudo.className = "notificacao-conteudo";

            const titulo = document.createElement("strong");
            titulo.textContent =
                notificacao.titulo || "Notificação";

            const mensagem = document.createElement("p");
            mensagem.textContent = notificacao.mensagem || "";

            const data = document.createElement("small");
            data.className = "notificacao-data";
            data.textContent = notificacao.data || "";

            conteudo.append(titulo, mensagem, data);
            item.append(icone, conteudo);

            if (!notificacao.lida) {
                const estado = document.createElement("span");
                estado.className = "notificacao-ponto";
                estado.setAttribute("aria-label", "Não lida");
                item.append(estado);
            }

            lista.appendChild(item);
        });

        if (window.lucide?.createIcons) {
            window.lucide.createIcons();
        }
    }

    function abrir() {
        const fundo = elemento("fundoNotificacoes");

        if (!fundo) return;

        // Fecha os outros painéis flutuantes antes de abrir.
        [
            "menuFlutuante",
            "painelCamadas",
            "painelMensagens"
        ].forEach(id => {
            const painel = elemento(id);

            if (painel) {
                painel.classList.remove("active", "aberto");
            }
        });

        fundo.classList.add("aberto", "active");
        fundo.setAttribute("aria-hidden", "false");

        renderizar();
    }

    function fechar() {
        const fundo = elemento("fundoNotificacoes");

        if (!fundo) return;

        fundo.classList.remove("aberto", "active");
        fundo.setAttribute("aria-hidden", "true");
    }

    function adicionar(dados) {
        if (!dados || !dados.titulo) return null;

        const notificacao = {
            id: proximoId++,
            titulo: String(dados.titulo),
            mensagem: String(dados.mensagem || ""),
            icone: String(dados.icone || "🔔"),
            data: new Date().toLocaleString("pt-BR", {
                dateStyle: "short",
                timeStyle: "short"
            }),
            lida: false
        };

        notificacoes.unshift(notificacao);
        notificacoes = notificacoes.slice(0, LIMITE);

        guardar();
        renderizar();

        return notificacao.id;
    }

    function marcarComoLida(id) {
        const notificacao = notificacoes.find(
            item => String(item.id) === String(id)
        );

        if (!notificacao || notificacao.lida) return;

        notificacao.lida = true;
        guardar();
        renderizar();
    }

    function marcarTodasLidas() {
        notificacoes.forEach(item => {
            item.lida = true;
        });

        guardar();
        renderizar();
    }

    function limpar() {
        notificacoes = [];
        guardar();
        renderizar();
    }

    function configurarEventos() {
        if (eventosConfigurados) return;

        eventosConfigurados = true;

        const lista = elemento("listaNotificacoes");
        const fundo = elemento("fundoNotificacoes");
        const botaoFechar = elemento("fecharNotificacoes");

        
        botaoFechar?.addEventListener("click", fechar);

        // Clicar numa notificação marca apenas aquela como lida.
        lista?.addEventListener("click", evento => {
            const item = evento.target.closest(
                "[data-notificacao-id]"
            );

            if (item) {
                marcarComoLida(item.dataset.notificacaoId);
            }
        });

        // Tocar no fundo fecha; tocar dentro do painel não fecha.
        fundo?.addEventListener("click", evento => {
            if (evento.target === fundo) {
                fechar();
            }
        });

        document.addEventListener("keydown", evento => {
            if (evento.key === "Escape") {
                fechar();
            }
        });
    }

    function inicializar() {
        if (!inicializado) {
            carregar();
            configurarEventos();
            inicializado = true;
        }

        renderizar();
    }

    window.RunWorldNotificacoes = {
        abrir,
        fechar,
        adicionar,
        listar: () => notificacoes.map(item => ({ ...item })),
        contarNaoLidas,
        marcarComoLida,
        marcarTodasLidas,
        limpar,
        inicializar
    };

    // Compatibilidade com as chamadas existentes do app.js.
    window.inicializarNotificacoes = function () {
        inicializar();
    };

    window.abrirPainelNotificacoes = abrir;
    window.fecharPainelNotificacoes = fechar;

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            inicializar,
            { once: true }
        );
    } else {
        inicializar();
    }
})();
   
