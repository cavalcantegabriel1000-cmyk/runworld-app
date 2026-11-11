
/* =====================================================
   RUNWORLD — SISTEMA DE NOTIFICAÇÕES V2
   Supabase + Realtime + armazenamento local
   Compatível com o app.js existente
===================================================== */

(function () {
    "use strict";

    const CHAVE = "runworld-notificacoes";
    const LIMITE = 50;

    let notificacoes = [];
    let proximoId = 1;

    let eventosConfigurados = false;
    let inicializado = false;

    let usuarioAtualId = null;
    let canalRealtime = null;
    let carregamentoEmAndamento = false;

    function elemento(id) {
        return document.getElementById(id);
    }

    function clienteSupabase() {
        return window.supabaseClient || null;
    }

    function carregar() {
        try {
            const dados = JSON.parse(
                localStorage.getItem(CHAVE) || "[]"
            );

            notificacoes = Array.isArray(dados)
                ? dados.slice(0, LIMITE)
                : [];

            proximoId = notificacoes.reduce(
                (max, item) =>
                    Math.max(max, Number(item.id) || 0),
                0
            ) + 1;

        } catch (erro) {
            console.warn(
                "RunWorld: erro ao carregar notificações:",
                erro
            );

            notificacoes = [];
            proximoId = 1;
        }
    }

    function guardar() {
        try {
            const locais = notificacoes
                .filter(item => item.origem !== "supabase")
                .slice(0, LIMITE);

            localStorage.setItem(
                CHAVE,
                JSON.stringify(locais)
            );

        } catch (erro) {
            console.warn(
                "RunWorld: não foi possível guardar notificações:",
                erro
            );
        }
    }

    function formatarData(data) {
        if (!data) return "";

        const valor = new Date(data);

        if (Number.isNaN(valor.getTime())) {
            return "";
        }

        return valor.toLocaleString("pt-BR", {
            dateStyle: "short",
            timeStyle: "short"
        });
    }

    function converterNotificacao(registro) {
        return {
            id: String(registro.id),
            titulo: String(registro.titulo || "Notificação"),
            mensagem: String(registro.mensagem || ""),
            tipo: String(registro.tipo || "geral"),
            icone: iconePorTipo(registro.tipo),
            data: formatarData(registro.criado_em),
            lida: Boolean(registro.lida),
            origem: "supabase"
        };
    }

    function iconePorTipo(tipo) {
        const icones = {
            mensagem_rapida: "💬",
            conquista: "🏆",
            atividade: "🏃",
            sistema: "🔔"
        };

        return icones[tipo] || "🔔";
    }

    function ordenar() {
        notificacoes.sort((a, b) => {
            const dataA = a.data || "";
            const dataB = b.data || "";

            return dataB.localeCompare(dataA);
        });

        notificacoes = notificacoes.slice(0, LIMITE);
    }

    function renderizar() {
        const lista = elemento("listaNotificacoes");
        const vazias = elemento("notificacoesVazias");

        if (!lista) return;

        lista.replaceChildren();

        if (vazias) {
            vazias.hidden = notificacoes.length > 0;
        }

        notificacoes.forEach(notificacao => {
            const item = document.createElement("article");

            item.className = "notificacao";

            if (notificacao.lida) {
                item.classList.add("notificacao-lida");
            }

            const icone = document.createElement("div");
            icone.className = "notificacao-icone";
            icone.textContent = notificacao.icone || "🔔";

            const conteudo = document.createElement("div");
            conteudo.className = "notificacao-conteudo";

            const titulo = document.createElement("strong");
            titulo.textContent =
                notificacao.titulo || "Notificação";

            const mensagem = document.createElement("p");
            mensagem.textContent =
                notificacao.mensagem || "";

            const data = document.createElement("small");
            data.className = "notificacao-data";
            data.textContent = notificacao.data || "";

            conteudo.append(titulo, mensagem, data);
            item.append(icone, conteudo);

            lista.appendChild(item);
        });

        if (window.lucide?.createIcons) {
            window.lucide.createIcons();
        }
    }

    function abrir() {
        const fundo = elemento("fundoNotificacoes");

        if (!fundo) return;

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
        if (!dados || !dados.titulo) {
            return null;
        }

        const notificacao = {
            id: proximoId++,
            titulo: String(dados.titulo),
            mensagem: String(dados.mensagem || ""),
            icone: String(dados.icone || "🔔"),
            data: formatarData(new Date()),
            lida: false,
            origem: "local"
        };

        notificacoes.unshift(notificacao);

        ordenar();
        guardar();
        renderizar();

        return notificacao.id;
    }

    function limpar() {
        // Mantém a compatibilidade com a limpeza local.
        // Não exclui notificações da conta no Supabase.

        notificacoes = notificacoes.filter(
            item => item.origem === "supabase"
        );

        guardar();
        renderizar();
    }

    async function carregarRemotas() {
        const supabase = clienteSupabase();

        if (!supabase || !usuarioAtualId) {
            return;
        }

        if (carregamentoEmAndamento) {
            return;
        }

        carregamentoEmAndamento = true;

        try {
            const { data, error } = await supabase
                .from("notificacoes")
                .select(
                    "id, usuario_id, tipo, titulo, mensagem, lida, criado_em"
                )
                .eq("usuario_id", usuarioAtualId)
                .order("criado_em", {
                    ascending: false
                })
                .limit(LIMITE);

            if (error) {
                throw error;
            }

            const locais = notificacoes.filter(
                item => item.origem !== "supabase"
            );

            const remotas = (data || []).map(
                converterNotificacao
            );

            notificacoes = [
                ...remotas,
                ...locais
            ];

            ordenar();
            guardar();
            renderizar();

        } catch (erro) {
            console.error(
                "RunWorld: erro ao buscar notificações:",
                erro
            );

        } finally {
            carregamentoEmAndamento = false;
        }
    }

    function processarNotificacaoRemota(registro) {
        if (!registro || !registro.id) return;

        if (
            registro.usuario_id &&
            registro.usuario_id !== usuarioAtualId
        ) {
            return;
        }

        const nova = converterNotificacao(registro);

        const indice = notificacoes.findIndex(
            item =>
                item.origem === "supabase" &&
                String(item.id) === String(nova.id)
        );

        if (indice >= 0) {
            notificacoes[indice] = nova;
        } else {
            notificacoes.unshift(nova);
        }

        ordenar();
        guardar();
        renderizar();
    }

    async function conectarRealtime() {
        const supabase = clienteSupabase();

        if (!supabase || !usuarioAtualId) {
            return;
        }

        if (canalRealtime) {
            await desconectarRealtime();
        }

        try {
            canalRealtime = supabase
                .channel(
                    "runworld-notificacoes-" + usuarioAtualId
                )
                .on(
                    "postgres_changes",
                    {
                        event: "*",
                        schema: "public",
                        table: "notificacoes",
                        filter:
                            "usuario_id=eq." + usuarioAtualId
                    },
                    evento => {
                        if (evento.eventType === "DELETE") {
                            notificacoes = notificacoes.filter(
                                item =>
                                    !(
                                        item.origem === "supabase" &&
                                        String(item.id) ===
                                        String(evento.old.id)
                                    )
                            );

                            guardar();
                            renderizar();
                            return;
                        }

                        if (evento.new) {
                            processarNotificacaoRemota(
                                evento.new
                            );
                        }
                    }
                )
                .subscribe(status => {
                    if (status === "SUBSCRIBED") {
                        console.info(
                            "RunWorld: notificações em tempo real conectadas."
                        );
                    }
                });

        } catch (erro) {
            console.error(
                "RunWorld: erro ao conectar notificações:",
                erro
            );
        }
    }

    async function desconectarRealtime() {
        const supabase = clienteSupabase();

        if (!canalRealtime || !supabase) {
            canalRealtime = null;
            return;
        }

        try {
            await supabase.removeChannel(canalRealtime);
        } catch (erro) {
            console.warn(
                "RunWorld: erro ao desconectar notificações:",
                erro
            );
        }

        canalRealtime = null;
    }

    function configurarEventos() {
        if (eventosConfigurados) return;

        eventosConfigurados = true;

        document.addEventListener("keydown", evento => {
            if (evento.key === "Escape") {
                fechar();
            }
        });
    }

    function inicializarLocal() {
        if (inicializado) {
            renderizar();
            return;
        }

        inicializado = true;

        carregar();
        configurarEventos();
        renderizar();
    }

    async function inicializar(usuarioId) {
        inicializarLocal();

        if (!usuarioId) {
            return;
        }

        const novoUsuarioId = String(usuarioId);

        if (usuarioAtualId === novoUsuarioId) {
            await carregarRemotas();
            return;
        }

        await desconectarRealtime();

        usuarioAtualId = novoUsuarioId;

        await carregarRemotas();
        await conectarRealtime();
    }

    async function encerrar() {
        await desconectarRealtime();

        usuarioAtualId = null;

        notificacoes = notificacoes.filter(
            item => item.origem !== "supabase"
        );

        renderizar();
    }

    window.RunWorldNotificacoes = {
        abrir,
        fechar,
        adicionar,
        listar: () =>
            notificacoes.map(item => ({ ...item })),
        limpar,
        inicializar,
        carregarRemotas,
        encerrar
    };

    window.inicializarNotificacoes = inicializar;

    window.abrirPainelNotificacoes = abrir;
    window.fecharPainelNotificacoes = fechar;

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            inicializarLocal,
            { once: true }
        );
    } else {
        inicializarLocal();
    }

})();
                             
