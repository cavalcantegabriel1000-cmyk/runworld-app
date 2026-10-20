/* =====================================================
   RUNWORLD — APP.JS
   Mapa, GPS, atividades, perfil, menu e Supabase
===================================================== */

"use strict";

/* ===================== CONFIGURAÇÃO ===================== */

const CHAVE_HISTORICO = "runworld-historico";
const CHAVE_XP = "runworld-xp";
const CHAVE_TEMA = "runworld-tema";
const CHAVE_ATIVIDADE_EM_ANDAMENTO = "runworld-atividade-em-andamento";
const CHAVE_FOTO_LOCAL = "runworld-foto-perfil-local";
const POSICAO_INICIAL = [-22.8728, -42.3428];

let mapa = null;
let marcadorUsuario = null;
let circuloPrecisao = null;
let linhaPercurso = null;
let pontosPercurso = [];
let watchId = null;
let intervaloAtividade = null;

let atividadeAtual = "corrida";
let atividadeIniciada = false;
let inicioAtividade = null;
let distanciaMetros = 0;
let tempoSegundos = 0;
let ultimaPosicao = null;

let camadasMapa = {};
let camadasDetalhes = { ciclovias: null, edificios: null };
let camadaBicicletaAtiva = false;
let camadaEdificiosAtiva = false;
let usuarioAtual = null;
let perfilAtual = null;
let canalPresenca = null;
let marcadoresCorredores = {};
let historicoSincronizado = false;
let telaAnterior = "telaMapa";

/* ===================== UTILITÁRIOS ===================== */

function elemento(id) {
    return document.getElementById(id);
}

function definirTexto(id, texto) {
    const el = elemento(id);
    if (el) el.textContent = texto;
}

function mostrarElemento(id, mostrar = true) {
    const el = elemento(id);
    if (!el) return;
    el.hidden = !mostrar;
    el.style.display = mostrar ? "" : "none";
}

function mostrarAviso(mensagem) {
    let aviso = elemento("avisoRunWorld");

    if (!aviso) {
        aviso = document.createElement("div");
        aviso.id = "avisoRunWorld";
        Object.assign(aviso.style, {
            position: "fixed",
            left: "50%",
            bottom: "100px",
            transform: "translateX(-50%)",
            background: "#202020",
            color: "#fff",
            padding: "13px 18px",
            borderRadius: "14px",
            zIndex: "99999",
            maxWidth: "85%",
            textAlign: "center",
            boxShadow: "0 8px 25px #0005",
            fontSize: "14px"
        });
        document.body.appendChild(aviso);
    }

    aviso.textContent = mensagem;
    aviso.style.display = "block";
    clearTimeout(aviso._temporizador);
    aviso._temporizador = setTimeout(() => {
        aviso.style.display = "none";
    }, 3000);
}

function formatarTempo(segundos) {
    const horas = Math.floor(segundos / 3600);
    const minutos = Math.floor((segundos % 3600) / 60);
    const resto = segundos % 60;

    if (horas > 0) {
        return `${String(horas).padStart(2, "0")}:${String(minutos).padStart(2, "0")}:${String(resto).padStart(2, "0")}`;
    }

    return `${String(minutos).padStart(2, "0")}:${String(resto).padStart(2, "0")}`;
}

function formatarDistancia(metros) {
    return metros >= 1000
        ? `${(metros / 1000).toFixed(2).replace(".", ",")} km`
        : `${Math.round(metros)} m`;
}

function calcularDistancia(a, b) {
    const R = 6371000;
    const rad = valor => valor * Math.PI / 180;
    const dLat = rad(b.lat - a.lat);
    const dLng = rad(b.lng - a.lng);
    const lat1 = rad(a.lat);
    const lat2 = rad(b.lat);
    const h = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1) * Math.cos(lat2) *
        Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
}

/* ===================== SUPABASE / SESSÃO ===================== */

let observadorSessaoConfigurado = false;
let carregandoUsuarioId = null;

async function aplicarSessaoRunWorld(sessao) {
    if (!sessao || !sessao.user) return;

    const idUsuario = sessao.user.id;

    if (usuarioAtual?.id === idUsuario && perfilAtual) {
        definirTexto("emailPerfil", sessao.user.email || "");
        return;
    }

    if (carregandoUsuarioId === idUsuario) return;
    carregandoUsuarioId = idUsuario;

    try {
        usuarioAtual = sessao.user;
        definirTexto(
            "emailPerfil",
            usuarioAtual.email || "Conta conectada"
        );

        await carregarPerfil();
        await sincronizarHistoricoPendente();

        historicoSincronizado = false;
        await carregarHistoricoSincronizado();

        atualizarEstatisticasPerfil();
        configurarPresenca();

        console.log(
            "RunWorld: sessão reconhecida.",
            usuarioAtual.email
        );
    } catch (erro) {
        console.error(
            "Erro ao carregar a sessão:",
            erro
        );
    } finally {
        carregandoUsuarioId = null;
    }
}

function observarMudancasDeSessao(supabase) {
    if (observadorSessaoConfigurado) return;
    observadorSessaoConfigurado = true;

    supabase.auth.onAuthStateChange((evento, sessao) => {
        if (
            sessao &&
            ["SIGNED_IN", "TOKEN_REFRESHED", "USER_UPDATED"]
                .includes(evento)
        ) {
            setTimeout(() => {
                aplicarSessaoRunWorld(sessao);
            }, 0);
        }
    });
}

async function verificarSessao() {
    const supabase = window.supabaseClient;

    if (!supabase) {
        console.error("Supabase não encontrado. Confira config.js.");
        definirTexto("emailPerfil", "Login indisponível");
        return;
    }

    observarMudancasDeSessao(supabase);

    try {
        const { data, error } =
            await supabase.auth.getSession();

        if (error) throw error;

        if (data.session) {
            await aplicarSessaoRunWorld(data.session);
        } else {
            console.warn(
                "RunWorld: nenhuma sessão ativa encontrada."
            );

            definirTexto("emailPerfil", "Modo convidado");
        }
    } catch (erro) {
        console.error(
            "Erro ao verificar sessão:",
            erro
        );

        definirTexto(
            "emailPerfil",
            "Não foi possível verificar a conta"
        );
    }
}



/* ===================== PERFIL ===================== */

async function carregarPerfil() {
    const supabase = window.supabaseClient;
    if (!supabase || !usuarioAtual) return;

    definirTexto("emailPerfil", usuarioAtual.email || "");

    const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", usuarioAtual.id)
        .maybeSingle();

    if (error) console.warn("Não foi possível carregar o perfil:", error.message);

    perfilAtual = data || {
        id: usuarioAtual.id,
        nome: usuarioAtual.user_metadata?.nome ||
            usuarioAtual.user_metadata?.name ||
            usuarioAtual.email?.split("@")[0] ||
            "Corredor",
        foto_url: ""
    };

    preencherDadosPerfil();
}

function preencherDadosPerfil() {
    if (!perfilAtual) return;

    const nome = perfilAtual.nome || "Corredor";
    definirTexto("nomePerfil", nome);
    definirTexto("nomeConfiguracao", nome);
    definirTexto("nomePerfilMenu", nome);
    definirTexto("nomeUsuarioMapa", nome);
    definirTexto("emailPerfil", usuarioAtual?.email || "");

    const avatarTopo = elemento("avatarTopo");
    const fotoPerfil = elemento("fotoPerfil");
    let fotoLocal = "";
    try { fotoLocal = localStorage.getItem(CHAVE_FOTO_LOCAL) || ""; } catch (_) {}
    const fotoFinal = fotoLocal || perfilAtual.foto_url || "";

    if (fotoFinal) {
        if (avatarTopo) { avatarTopo.src = fotoFinal; avatarTopo.hidden = false; }
        if (fotoPerfil) { fotoPerfil.src = fotoFinal; fotoPerfil.hidden = false; }
    } else {
        if (avatarTopo) avatarTopo.hidden = true;
        if (fotoPerfil) fotoPerfil.hidden = true;
    }

    atualizarEstatisticasPerfil();
}

async function salvarNomePerfil() {
    const nomeAnterior = perfilAtual?.nome || "Corredor";
    const entrada = prompt("Digite seu novo nome:", nomeAnterior);
    if (entrada === null) return;

    const nome = entrada.trim();
    if (!nome) {
        mostrarAviso("Digite um nome válido.");
        return;
    }

    if (window.supabaseClient && usuarioAtual) {
        const { error } = await window.supabaseClient
            .from("profiles")
            .upsert({ id: usuarioAtual.id, nome });

        if (error) {
            console.error(error);
            mostrarAviso("Não foi possível salvar no Supabase.");
            return;
        }
    }

    perfilAtual = { ...(perfilAtual || {}), nome };
    preencherDadosPerfil();
    mostrarAviso("Nome atualizado!");
}

function obterHistorico() {
    try {
        return JSON.parse(localStorage.getItem(CHAVE_HISTORICO) || "[]");
    } catch {
        return [];
    }
}

function obterXP() {
    const historico = obterHistorico();
    if (historico.length) {
        return historico.reduce((total, item) =>
            total + Math.max(10, Math.floor(((Number(item.distanciaMetros) || 0) / 1000) * 10)), 0);
    }
    return Number(localStorage.getItem(CHAVE_XP) || 0);
}

function atualizarEstatisticasPerfil() {
    const historico = obterHistorico();
    const metros = historico.reduce((total, item) => total + (Number(item.distanciaMetros) || 0), 0);
    const segundos = historico.reduce((total, item) => total + (Number(item.tempoSegundos) || 0), 0);
    const xp = obterXP();
    const nivel = Math.floor(xp / 500) + 1;
    const xpNivel = xp % 500;

    definirTexto("perfilKm", (metros / 1000).toFixed(1).replace(".", ","));
    definirTexto("perfilDistancia", (metros / 1000).toFixed(1).replace(".", ",") + " km");
    definirTexto("perfilTempo", formatarTempo(segundos));
    definirTexto("perfilXP", `${xp} XP`);
    definirTexto("perfilAtividades", String(historico.length));
    definirTexto("perfilTerritorios", String(perfilAtual?.territorios || 0));
    definirTexto("nivelPerfil", `Nível ${nivel}`);
    definirTexto("nivelPerfilCartao", `Nível ${nivel}`);
    definirTexto("xpPerfil", `${xpNivel} / 500 XP`);

    const barra = elemento("barraXpPerfil");
    const preenchimento = barra?.querySelector("span") || barra;
    if (preenchimento) preenchimento.style.width = `${xpNivel / 500 * 100}%`;
    atualizarMissoes();
}

async function carregarHistoricoSincronizado() {
    const supabase = window.supabaseClient;
    if (!supabase || !usuarioAtual || historicoSincronizado) return obterHistorico();
    try {
        const { data, error } = await supabase.from("atividades")
            .select("id,id_local,tipo,distancia_metros,tempo_segundos,data")
            .eq("usuario_id", usuarioAtual.id)
            .order("data", { ascending: false }).limit(500);
        if (error) throw error;
        const porId = new Map(obterHistorico().map(item => [String(item.id), item]));
        for (const remota of (data || [])) {
            const chave = String(remota.id_local || remota.id);
            const anterior = porId.get(chave);
            porId.set(chave, {
                ...(anterior || {}),
                id: anterior?.id ?? chave,
                idRemoto: remota.id,
                tipo: remota.tipo,
                distanciaMetros: Number(remota.distancia_metros) || 0,
                tempoSegundos: Number(remota.tempo_segundos) || 0,
                data: remota.data || anterior?.data,
                sincronizada: true,
                pontos: anterior?.pontos || []
            });
        }
        const combinado = [...porId.values()]
            .sort((a, b) => Date.parse(b.data || 0) - Date.parse(a.data || 0)).slice(0, 500);
        localStorage.setItem(CHAVE_HISTORICO, JSON.stringify(combinado));
        historicoSincronizado = true;
        return combinado;
    } catch (erro) {
        console.warn("Não foi possível atualizar o histórico remoto:", erro.message || erro);
        return obterHistorico();
    }
}
/* ===================== MAPA LEAFLET ===================== */

function inicializarMapa() {
    if (!elemento("mapa")) {
        console.warn("Não encontrei o elemento #mapa no HTML.");
        return;
    }

    if (typeof L === "undefined") {
        console.error("Leaflet não carregou. Confira os links CSS/JS no HTML.");
        mostrarAviso("O mapa não carregou. Confira o Leaflet no HTML.");
        return;
    }

    if (mapa) {
        mapa.invalidateSize();
        return;
    }

    mapa = L.map("mapa", { zoomControl: false })
        .setView(POSICAO_INICIAL, 12);

    camadasMapa.padrao = L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        { maxZoom: 19, attribution: "&copy; OpenStreetMap" }
    );

    camadasMapa.satelite = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        { maxZoom: 19, attribution: "Tiles &copy; Esri" }
    );

    camadasMapa.relevo = L.tileLayer(
        "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
        { maxZoom: 17, attribution: "OpenTopoMap" }
    );

    camadasMapa.padrao.addTo(mapa);

    L.control.zoom({ position: "bottomright" }).addTo(mapa);

    linhaPercurso = L.polyline([], {
        color: "#00e5ff",
        weight: 5,
        opacity: 0.9,
        lineCap: "round",
        lineJoin: "round"
    }).addTo(mapa);

    setTimeout(() => mapa.invalidateSize(), 300);
}

function mudarCamada(nome) {
    if (!mapa || !camadasMapa[nome]) return;

    Object.values(camadasMapa).forEach(camada => {
        if (mapa.hasLayer(camada)) mapa.removeLayer(camada);
    });

    camadasMapa[nome].addTo(mapa);

    document.querySelectorAll(".opcao-camada").forEach(botao => {
        const selecionado = botao.dataset.camada === nome;
        botao.classList.toggle("active", selecionado);
        botao.classList.toggle("selecionada", selecionado);
    });
}

function configurarCamadas() {
    document.querySelectorAll(".opcao-camada").forEach(botao => {
        botao.addEventListener("click", () => mudarCamada(botao.dataset.camada));
    });

    elemento("botaoCamada")?.addEventListener("click", () => alternarPainel("painelCamadas"));

    elemento("fecharCamadas")?.addEventListener("click", () => fecharPainel("painelCamadas"));
}

/* ===================== CAMADAS DE DETALHES OSM ===================== */

async function carregarDetalhesOSM(tipo) {
    if (!mapa || typeof L === "undefined") return;

    if (camadasDetalhes[tipo]) {
        if (!mapa.hasLayer(camadasDetalhes[tipo])) {
            camadasDetalhes[tipo].addTo(mapa);
        }
        return;
    }

    const limites = mapa.getBounds();
    const bbox = [
        limites.getSouth(), limites.getWest(),
        limites.getNorth(), limites.getEast()
    ].join(",");

    const consulta = tipo === "ciclovias" ? `
        [out:json][timeout:20];
        (
          way["highway"="cycleway"](${bbox});
          way["cycleway"](${bbox});
          way["bicycle"="designated"](${bbox});
        );
        out geom;
    ` : `
        [out:json][timeout:20];
        (
          way["building"](${bbox});
        );
        out geom;
    `;

    try {
        mostrarAviso("Carregando detalhes do mapa...");
        const resposta = await fetch("https://overpass-api.de/api/interpreter", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
            body: "data=" + encodeURIComponent(consulta)
        });
        if (!resposta.ok) throw new Error("Serviço Overpass indisponível.");

        const dados = await resposta.json();
        const features = (dados.elements || [])
            .filter(el => el.type === "way" && Array.isArray(el.geometry) && el.geometry.length > 1)
            .map(el => ({
                type: "Feature",
                properties: el.tags || {},
                geometry: {
                    type: "LineString",
                    coordinates: el.geometry.map(ponto => [ponto.lon, ponto.lat])
                }
            }));

        camadasDetalhes[tipo] = L.geoJSON({ type: "FeatureCollection", features }, {
            style: () => tipo === "ciclovias"
                ? { color: "#00e676", weight: 4, opacity: 0.9 }
                : { color: "#ffcc80", weight: 1, opacity: 0.65 },
            onEachFeature: (feature, camada) => {
                if (tipo === "edificios") {
                    camada.bindPopup(feature.properties.name || "Edifício mapeado");
                }
            }
        }).addTo(mapa);

        mostrarAviso(features.length ? "Camada carregada." : "Não há dados dessa camada nesta área.");
    } catch (erro) {
        console.error("Erro ao carregar camada OSM:", erro);
        mostrarAviso("Não foi possível carregar essa camada agora. Tente novamente.");
    }
}

function configurarCamadasDetalhes() {
    elemento("camadaBicicleta")?.addEventListener("change", async evento => {
        camadaBicicletaAtiva = evento.target.checked;
        if (camadaBicicletaAtiva) {
            await carregarDetalhesOSM("ciclovias");
        } else if (mapa && camadasDetalhes.ciclovias && mapa.hasLayer(camadasDetalhes.ciclovias)) {
            mapa.removeLayer(camadasDetalhes.ciclovias);
        }
    });

    elemento("camadaEdificios")?.addEventListener("change", async evento => {
        camadaEdificiosAtiva = evento.target.checked;
        if (camadaEdificiosAtiva) {
            await carregarDetalhesOSM("edificios");
        } else if (mapa && camadasDetalhes.edificios && mapa.hasLayer(camadasDetalhes.edificios)) {
            mapa.removeLayer(camadasDetalhes.edificios);
        }
    });

    elemento("camadaTransito")?.addEventListener("change", evento => {
        if (evento.target.checked) {
            evento.target.checked = false;
            mostrarAviso("Trânsito ao vivo exige um provedor de tráfego e uma chave de API.");
        }
    });
}

/* ===================== GPS ===================== */

function atualizarPosicaoUsuario(coords, precisao = 20) {
    if (!mapa) return;
    const latlng = [coords.lat, coords.lng];

    if (!marcadorUsuario) {
        marcadorUsuario = L.circleMarker(latlng, {
            radius: 9,
            color: "#fff",
            weight: 3,
            fillColor: "#00e5ff",
            fillOpacity: 1
        }).addTo(mapa);
        marcadorUsuario.bindPopup("Você está aqui");
    } else {
        marcadorUsuario.setLatLng(latlng);
    }

    if (!circuloPrecisao) {
        circuloPrecisao = L.circle(latlng, {
            radius: precisao,
            color: "#00e5ff",
            weight: 1,
            fillColor: "#00e5ff",
            fillOpacity: 0.08
        }).addTo(mapa);
    } else {
        circuloPrecisao.setLatLng(latlng);
        circuloPrecisao.setRadius(precisao);
    }
}

function obterLocalizacaoAtual() {
    if (!navigator.geolocation) {
        mostrarAviso("GPS não disponível neste navegador.");
        return;
    }

    navigator.geolocation.getCurrentPosition(
        pos => {
            const coords = {
                lat: pos.coords.latitude,
                lng: pos.coords.longitude
            };
            atualizarPosicaoUsuario(coords, pos.coords.accuracy);
            mapa?.setView([coords.lat, coords.lng], 16);
        },
        erro => {
            console.error("Erro de localização:", erro);
            mostrarAviso("Permita o acesso à localização no navegador.");
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
}

function iniciarRastreamentoGPS() {
    if (!navigator.geolocation) {
        mostrarAviso("GPS não disponível.");
        return;
    }

    pararRastreamentoGPS();

    watchId = navigator.geolocation.watchPosition(
        pos => {
            const coords = {
                lat: pos.coords.latitude,
                lng: pos.coords.longitude
            };
            atualizarPosicaoUsuario(coords, pos.coords.accuracy);

            if (atividadeIniciada) {
                registrarPonto(coords);
                publicarPresenca(coords);
            }
        },
        erro => {
            console.error("Erro no GPS:", erro);
            if (erro.code === 1) {
                mostrarAviso("Permita a localização para registrar o percurso.");
            } else {
                mostrarAviso("Não foi possível obter sua localização.");
            }
        },
        { enableHighAccuracy: true, maximumAge: 1000, timeout: 20000 }
    );
}

function pararRastreamentoGPS() {
    if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
    }
}

function registrarPonto(coords) {
    if (!atividadeIniciada) return;

    if (ultimaPosicao) {
        const metros = calcularDistancia(ultimaPosicao, coords);
        // Ignora deslocamentos improváveis causados por falhas do GPS.
        if (metros > 0 && metros < 100) distanciaMetros += metros;
    }

    ultimaPosicao = coords;
    pontosPercurso.push([coords.lat, coords.lng]);
    linhaPercurso?.setLatLngs(pontosPercurso);
    atualizarInformacoesAtividade();
    salvarEstadoAtividadeEmAndamento();
}

/* ===================== ATIVIDADES ===================== */

function salvarEstadoAtividadeEmAndamento() {
    if (!atividadeIniciada || !inicioAtividade) return;
    try {
        localStorage.setItem(CHAVE_ATIVIDADE_EM_ANDAMENTO, JSON.stringify({
            ativa: true,
            tipo: atividadeAtual,
            inicioAtividade,
            distanciaMetros,
            pontosPercurso,
            ultimaPosicao,
            salvoEm: Date.now()
        }));
    } catch (erro) {
        console.warn("Não foi possível guardar o estado da atividade:", erro);
    }
}

function apagarEstadoAtividadeEmAndamento() {
    try { localStorage.removeItem(CHAVE_ATIVIDADE_EM_ANDAMENTO); }
    catch (erro) { console.warn(erro); }
}

function restaurarAtividadeEmAndamento() {
    let estado;
    try {
        estado = JSON.parse(localStorage.getItem(CHAVE_ATIVIDADE_EM_ANDAMENTO) || "null");
    } catch (erro) {
        console.warn("Estado da atividade inválido:", erro);
        apagarEstadoAtividadeEmAndamento();
        return;
    }

    if (!estado || !estado.ativa || !estado.inicioAtividade) return;

    atividadeAtual = estado.tipo || "corrida";
    inicioAtividade = Number(estado.inicioAtividade);
    distanciaMetros = Number(estado.distanciaMetros) || 0;
    pontosPercurso = Array.isArray(estado.pontosPercurso) ? estado.pontosPercurso : [];
    ultimaPosicao = estado.ultimaPosicao || null;
    tempoSegundos = Math.max(0, Math.floor((Date.now() - inicioAtividade) / 1000));
    atividadeIniciada = true;

    document.querySelectorAll(".atividade").forEach(botao => {
        botao.classList.toggle("active", botao.dataset.atividade === atividadeAtual);
        botao.classList.toggle("selecionada", botao.dataset.atividade === atividadeAtual);
    });
    linhaPercurso?.setLatLngs(pontosPercurso);
    mostrarElemento("botaoComecar", false);
    mostrarElemento("botaoParar", true);
    document.body.classList.add("atividade-ativa");
    elemento("painelAtividade")?.classList.add("em-andamento");
    elemento("painelAtividade")?.classList.remove("painel-recolhido");
    definirTexto("statusAtividade", "Atividade em andamento — retomada");
    atualizarInformacoesAtividade();

    // Recomeça a tentativa de GPS ao voltar para o app. O navegador pode
    // ter suspendido o GPS enquanto a tela estava bloqueada.
    iniciarRastreamentoGPS();
    clearInterval(intervaloAtividade);
    intervaloAtividade = setInterval(() => {
        if (!atividadeIniciada) return;
        tempoSegundos = Math.max(0, Math.floor((Date.now() - inicioAtividade) / 1000));
        atualizarInformacoesAtividade();
        salvarEstadoAtividadeEmAndamento();
    }, 1000);
    mostrarAviso("Atividade recuperada. Confira se o GPS voltou a registrar o percurso.");
}

// Guarda o estado antes de o navegador ocultar ou descarregar a página.
document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
        salvarEstadoAtividadeEmAndamento();
    } else if (atividadeIniciada && inicioAtividade) {
        // O intervalo pode ser suspenso pelo Android; o relógio real recupera o tempo perdido.
        tempoSegundos = Math.max(0, Math.floor((Date.now() - inicioAtividade) / 1000));
        atualizarInformacoesAtividade();
        salvarEstadoAtividadeEmAndamento();
        if (navigator.geolocation && watchId === null) iniciarRastreamentoGPS();
    }
});
window.addEventListener("pageshow", () => {
    if (atividadeIniciada && inicioAtividade) {
        tempoSegundos = Math.max(0, Math.floor((Date.now() - inicioAtividade) / 1000));
        atualizarInformacoesAtividade();
        salvarEstadoAtividadeEmAndamento();
        if (navigator.geolocation && watchId === null) iniciarRastreamentoGPS();
    }
});
window.addEventListener("pagehide", salvarEstadoAtividadeEmAndamento);

function configurarTiposAtividade() {
    document.querySelectorAll(".atividade").forEach(botao => {
        const selecionadaInicial = (botao.dataset.atividade || "corrida") === atividadeAtual;
        botao.classList.toggle("active", selecionadaInicial);
        botao.classList.toggle("selecionada", selecionadaInicial);
        botao.setAttribute("aria-pressed", String(selecionadaInicial));

        botao.addEventListener("click", () => {
            if (atividadeIniciada) {
                mostrarAviso("Pare a atividade antes de trocar.");
                return;
            }

            atividadeAtual = botao.dataset.atividade || "corrida";

            document.querySelectorAll(".atividade").forEach(item => {
                const selecionada = item === botao;
                item.classList.toggle("active", selecionada);
                item.classList.toggle("selecionada", selecionada);
                item.setAttribute("aria-pressed", String(selecionada));
            });

            const nomes = {
                corrida: "Corrida",
                caminhada: "Caminhada",
                ciclismo: "Ciclismo"
            };

            definirTexto("statusAtividade", nomes[atividadeAtual] || "Atividade");
        });
    });
}

function iniciarAtividade() {
    if (atividadeIniciada) return;

    if (!navigator.geolocation) {
        mostrarAviso("GPS não disponível.");
        return;
    }

    atividadeIniciada = true;
    inicioAtividade = Date.now();
    distanciaMetros = 0;
    tempoSegundos = 0;
    ultimaPosicao = null;
    pontosPercurso = [];

    linhaPercurso?.setLatLngs([]);

    atualizarInformacoesAtividade();

    mostrarElemento("botaoComecar", false);
    mostrarElemento("botaoParar", true);
    document.body.classList.add("atividade-ativa");
    elemento("painelAtividade")?.classList.add("em-andamento");
    elemento("painelAtividade")?.classList.remove("painel-recolhido");
    definirTexto("statusAtividade", "Atividade em andamento");

    iniciarRastreamentoGPS();
    salvarEstadoAtividadeEmAndamento();

    intervaloAtividade = setInterval(() => {
        if (!atividadeIniciada) return;
        tempoSegundos = Math.max(0, Math.floor((Date.now() - inicioAtividade) / 1000));
        atualizarInformacoesAtividade();
        salvarEstadoAtividadeEmAndamento();
    }, 1000);

    mostrarAviso("Atividade iniciada! Bom percurso!");
}

async function pararAtividade() {
    if (!atividadeIniciada) return;

    atividadeIniciada = false;
    pararRastreamentoGPS();
    clearInterval(intervaloAtividade);
    intervaloAtividade = null;

    tempoSegundos = Math.floor((Date.now() - inicioAtividade) / 1000);

    mostrarElemento("botaoComecar", true);
    mostrarElemento("botaoParar", false);
    document.body.classList.remove("atividade-ativa");
    elemento("painelAtividade")?.classList.remove("em-andamento");
    definirTexto("statusAtividade", "Atividade finalizada");

    if (distanciaMetros >= 10 || tempoSegundos >= 10) {
        await salvarAtividade();
        mostrarConquista("Atividade concluída e salva!");
    } else {
        mostrarAviso("Atividade encerrada. Percurso curto demais para salvar.");
    }

    if (canalPresenca) {
        try { await canalPresenca.untrack(); }
        catch (erro) { console.warn(erro); }
    }

    apagarEstadoAtividadeEmAndamento();
    atualizarInformacoesAtividade();
}

function atualizarInformacoesAtividade() {
    const campoDistancia = elemento("distancia");
    if (campoDistancia) {
        const unidade = campoDistancia.parentElement?.querySelector("small");
        if (distanciaMetros >= 1000) {
            campoDistancia.textContent = (distanciaMetros / 1000).toFixed(2).replace(".", ",");
            if (unidade) unidade.textContent = "km";
        } else {
            campoDistancia.textContent = String(Math.round(distanciaMetros));
            if (unidade) unidade.textContent = "m";
        }
    }
    definirTexto("tempo", formatarTempo(tempoSegundos));

    const km = distanciaMetros / 1000;
    definirTexto("tituloRitmo", atividadeAtual === "ciclismo" ? "Velocidade" : "Ritmo");

    if (km > 0.02 && tempoSegundos > 0) {
        if (atividadeAtual === "ciclismo") {
            const kmh = km / (tempoSegundos / 3600);
            definirTexto("ritmo", `${kmh.toFixed(1).replace(".", ",")} km/h`);
        } else {
            const ritmo = tempoSegundos / 60 / km;
            const min = Math.floor(ritmo);
            const seg = Math.floor((ritmo - min) * 60);
            definirTexto("ritmo", `${min}:${String(seg).padStart(2, "0")} /km`);
        }
    } else {
        definirTexto("ritmo", "--");
    }
}
/* ===================== HISTÓRICO / XP ===================== */

async function salvarAtividade() {
    const historico = obterHistorico();
    const atividade = {
        id: String(Date.now()),
        tipo: atividadeAtual,
        distanciaMetros: Math.max(0, Number(distanciaMetros) || 0),
        tempoSegundos: Math.max(0, Number(tempoSegundos) || 0),
        pontos: [...pontosPercurso],
        data: new Date(inicioAtividade || Date.now()).toISOString(),
        usuarioLocal: usuarioAtual?.id || null,
        sincronizada: false
    };
    if (!historico.some(item => String(item.id) === atividade.id)) {
        historico.unshift(atividade);
        localStorage.setItem(CHAVE_HISTORICO, JSON.stringify(historico.slice(0, 500)));
    }

    const xpGanho = Math.max(10, Math.floor((atividade.distanciaMetros / 1000) * 10));
    localStorage.setItem(CHAVE_XP, String(obterXP()));
    atualizarEstatisticasPerfil();
    mostrarAviso(`Você ganhou ${xpGanho} XP!`);

    const ok = await sincronizarAtividadeSupabase(atividade);
    if (ok) {
        localStorage.setItem(CHAVE_HISTORICO, JSON.stringify(
            obterHistorico().map(item => String(item.id) === atividade.id ? { ...item, sincronizada: true } : item)
        ));
    } else if (usuarioAtual) {
        mostrarAviso("Atividade salva no aparelho. A sincronização será tentada novamente.");
    }
    historicoSincronizado = false;
    await carregarHistoricoSincronizado();
    atualizarEstatisticasPerfil();
    if (elemento("telaRanking")?.classList.contains("active")) await carregarRanking();
    return atividade;
}

async function sincronizarAtividadeSupabase(atividade) {
    const supabase = window.supabaseClient;
    if (!supabase || !usuarioAtual) return false;
    try {
        const { error } = await supabase.from("atividades").upsert({
            usuario_id: usuarioAtual.id,
            id_local: String(atividade.id),
            tipo: atividade.tipo,
            distancia_metros: Math.max(0, Number(atividade.distanciaMetros) || 0),
            tempo_segundos: Math.max(0, Number(atividade.tempoSegundos) || 0),
            data: atividade.data || new Date().toISOString()
        }, { onConflict: "usuario_id,id_local", ignoreDuplicates: true });
        if (error) throw error;
        return true;
    } catch (erro) {
        console.warn("Atividade ficou salva localmente:", erro.message || erro);
        return false;
    }
}

async function sincronizarHistoricoPendente() {
    if (!usuarioAtual || !window.supabaseClient) return;
    for (const atividade of obterHistorico().filter(item => !item.sincronizada && item.usuarioLocal === usuarioAtual.id)) {
        if (!await sincronizarAtividadeSupabase(atividade)) continue;
        localStorage.setItem(CHAVE_HISTORICO, JSON.stringify(
            obterHistorico().map(item => String(item.id) === String(atividade.id) ? { ...item, sincronizada: true } : item)
        ));
    }
}

function mostrarConquista(mensagem) {
    const painel = elemento("parabens");
    const texto = elemento("mensagemParabens") || elemento("textoParabens");

    if (!painel) {
        mostrarAviso(mensagem);
        return;
    }

    if (texto) texto.textContent = mensagem;
    painel.classList.add("visivel", "active", "mostrar");
    clearTimeout(painel._temporizador);
    painel._temporizador = setTimeout(() => {
        painel.classList.remove("visivel", "active", "mostrar");
    }, 3500);
}

/* ===================== FOTO DE PERFIL ===================== */

function prepararImagemPerfil(arquivo) {
    return new Promise((resolve, reject) => {
        const leitor = new FileReader();
        leitor.onerror = () => reject(new Error("Não foi possível ler a imagem."));
        leitor.onload = () => {
            const img = new Image();
            img.onerror = () => reject(new Error("O arquivo não parece ser uma imagem válida."));
            img.onload = () => {
                const limite = 900;
                const escala = Math.min(1, limite / Math.max(img.naturalWidth, img.naturalHeight));
                const canvas = document.createElement("canvas");
                canvas.width = Math.max(1, Math.round(img.naturalWidth * escala));
                canvas.height = Math.max(1, Math.round(img.naturalHeight * escala));
                const contexto = canvas.getContext("2d");
                if (!contexto) return reject(new Error("Não foi possível processar a imagem."));
                contexto.drawImage(img, 0, 0, canvas.width, canvas.height);
                canvas.toBlob(blob => {
                    if (!blob) return reject(new Error("Não foi possível compactar a imagem."));
                    const leitorCompactado = new FileReader();
                    leitorCompactado.onerror = () => reject(new Error("Não foi possível preparar a foto."));
                    leitorCompactado.onload = () => resolve({ blob, dataUrl: String(leitorCompactado.result || "") });
                    leitorCompactado.readAsDataURL(blob);
                }, "image/jpeg", 0.82);
            };
            img.src = String(leitor.result || "");
        };
        leitor.readAsDataURL(arquivo);
    });
}

function configurarFotoPerfil() {
    const botao = elemento("editarFotoPerfil");
    const entrada = elemento("arquivoFotoPerfil");
    if (!entrada) {
        console.warn("Não encontrei #arquivoFotoPerfil no HTML.");
        return;
    }

    // Garante que o botão abra o seletor mesmo se o HTML não tiver onclick.
    if (botao) botao.addEventListener("click", evento => {
        evento.preventDefault();
        entrada.click();
    });

    entrada.addEventListener("change", async () => {
        const arquivo = entrada.files?.[0];
        if (!arquivo) return;
        if (!arquivo.type.startsWith("image/")) {
            mostrarAviso("Escolha um arquivo de imagem.");
            entrada.value = "";
            return;
        }
        if (arquivo.size > 12 * 1024 * 1024) {
            mostrarAviso("Escolha uma imagem com até 12 MB.");
            entrada.value = "";
            return;
        }

        try {
            const preparada = await prepararImagemPerfil(arquivo);
            // A foto aparece e fica guardada localmente antes de tentar sincronizar.
            try { localStorage.setItem(CHAVE_FOTO_LOCAL, preparada.dataUrl); }
            catch (erroStorage) {
                console.warn("Não foi possível guardar a foto localmente:", erroStorage);
                mostrarAviso("Foto selecionada, mas o armazenamento do navegador está cheio.");
            }
            const foto = elemento("fotoPerfil");
            const topo = elemento("avatarTopo");
            if (foto) { foto.src = preparada.dataUrl; foto.hidden = false; }
            if (topo) { topo.src = preparada.dataUrl; topo.hidden = false; }
            if (!perfilAtual) perfilAtual = { nome: "Corredor", foto_url: preparada.dataUrl };
            else perfilAtual.foto_url = preparada.dataUrl;
            mostrarAviso("Foto aplicada ao perfil!");

            const supabase = window.supabaseClient;
            if (!supabase || !usuarioAtual) {
                mostrarAviso("Foto salva neste aparelho. Entre na conta para sincronizar entre dispositivos.");
                return;
            }

            try {
                const caminho = `${usuarioAtual.id}/avatar-${Date.now()}.jpg`;
                const { error: erroUpload } = await supabase.storage
                    .from("avatars")
                    .upload(caminho, preparada.blob, { upsert: true, contentType: "image/jpeg" });
                if (erroUpload) throw erroUpload;
                const { data } = supabase.storage.from("avatars").getPublicUrl(caminho);
                const fotoUrl = data?.publicUrl;
                if (!fotoUrl) throw new Error("Não foi possível obter a URL da foto.");
                const { error: erroPerfil } = await supabase.from("profiles").upsert({
                    id: usuarioAtual.id,
                    nome: perfilAtual.nome || "Corredor",
                    foto_url: fotoUrl
                });
                if (erroPerfil) throw erroPerfil;
                perfilAtual.foto_url = fotoUrl;
                try { localStorage.setItem(CHAVE_FOTO_LOCAL, fotoUrl); } catch (_) {}
                preencherDadosPerfil();
                mostrarAviso("Foto de perfil sincronizada!");
            } catch (erroSync) {
                console.error("A foto ficou salva localmente, mas não sincronizou:", erroSync);
                mostrarAviso("Foto aplicada e salva neste aparelho. Para sincronizar, confira o bucket 'avatars' e as permissões do Supabase.");
            }
        } catch (erro) {
            console.error("Erro ao preparar a foto:", erro);
            mostrarAviso("Não foi possível abrir essa imagem. Tente outra foto.");
        } finally {
            entrada.value = "";
        }
    });

    // Mostra a foto salva no aparelho mesmo antes de carregar o perfil remoto.
    try {
        const salva = localStorage.getItem(CHAVE_FOTO_LOCAL);
        if (salva) {
            const foto = elemento("fotoPerfil");
            const topo = elemento("avatarTopo");
            if (foto) { foto.src = salva; foto.hidden = false; }
            if (topo) { topo.src = salva; topo.hidden = false; }
        }
    } catch (_) {}
}


/* =====================================================
   PAINEL DE ATIVIDADE DESLIZANTE — CORRIGIDO
===================================================== */

function configurarPainelDeslizante() {
    const painel = elemento("painelAtividade");
    const puxador = painel?.querySelector(".barra-arraste");

    if (!painel || !puxador) {
        console.warn(
            "Painel deslizante: confira #painelAtividade e .barra-arraste no HTML."
        );
        return;
    }

    if (puxador.dataset.arrasteConfigurado === "true") return;
    puxador.dataset.arrasteConfigurado = "true";

    let arrastando = false;
    let inicioY = 0;
    let ultimaY = 0;
    let ponteiroId = null;

    const recolher = () => {
        painel.style.removeProperty("translate");
        painel.classList.remove("painel-arrastando");
        painel.classList.add("painel-recolhido");
        puxador.setAttribute("aria-expanded", "false");
    };

    const expandir = () => {
        painel.style.removeProperty("translate");
        painel.classList.remove(
            "painel-arrastando",
            "painel-recolhido"
        );
        puxador.setAttribute("aria-expanded", "true");

        // Recalcula o tamanho do mapa depois da animação.
        setTimeout(() => mapa?.invalidateSize(), 300);
    };

    const atualizarEstado = () => {
        puxador.setAttribute(
            "aria-expanded",
            String(!painel.classList.contains("painel-recolhido"))
        );
    };

    const iniciarArraste = evento => {
        if (arrastando) return;
        if (evento.pointerType === "mouse" && evento.button !== 0) return;

        arrastando = true;
        ponteiroId = evento.pointerId;
        inicioY = evento.clientY;
        ultimaY = evento.clientY;

        painel.classList.add("painel-arrastando");

        try {
            puxador.setPointerCapture(evento.pointerId);
        } catch (_) {}

        evento.preventDefault();
    };

    const moverArraste = evento => {
        if (!arrastando || evento.pointerId !== ponteiroId) return;

        ultimaY = evento.clientY;
        const delta = ultimaY - inicioY;
        const recolhido = painel.classList.contains("painel-recolhido");

        // Recolhido: pode subir para expandir.
        // Expandido: pode descer para recolher.
        let deslocamento;

        if (recolhido) {
            deslocamento = Math.min(0, delta);
        } else {
            deslocamento = Math.max(0, delta);
        }

        // Não sobrescreve o transform do posicionamento no CSS.
        painel.style.translate = `0 ${deslocamento}px`;
    };

    const terminarArraste = evento => {
        if (!arrastando) return;
        if (evento && evento.pointerId !== undefined &&
            evento.pointerId !== ponteiroId) return;

        const delta = ultimaY - inicioY;
        const estavaRecolhido = painel.classList.contains("painel-recolhido");

        arrastando = false;
        ponteiroId = null;

        painel.classList.remove("painel-arrastando");
        painel.style.removeProperty("translate");

        if (delta < -40) {
            expandir();
        } else if (delta > 40) {
            recolher();
        } else if (Math.abs(delta) < 8) {
            // Um toque no puxador alterna o painel.
            if (estavaRecolhido) expandir();
            else recolher();
        } else {
            atualizarEstado();
        }

        try {
            if (evento && puxador.hasPointerCapture(evento.pointerId)) {
                puxador.releasePointerCapture(evento.pointerId);
            }
        } catch (_) {}
    };

    puxador.style.touchAction = "none";
    puxador.style.userSelect = "none";
    puxador.style.cursor = "grab";

    puxador.setAttribute("role", "button");
    puxador.setAttribute("tabindex", "0");
    puxador.setAttribute(
        "aria-label",
        "Arraste para cima para abrir e para baixo para recolher"
    );

    puxador.addEventListener("pointerdown", iniciarArraste);
    puxador.addEventListener("pointermove", moverArraste);
    puxador.addEventListener("pointerup", terminarArraste);
    puxador.addEventListener("pointercancel", terminarArraste);
    puxador.addEventListener("lostpointercapture", terminarArraste);

    puxador.addEventListener("keydown", evento => {
        if (evento.key !== "Enter" && evento.key !== " ") return;

        evento.preventDefault();

        if (painel.classList.contains("painel-recolhido")) {
            expandir();
        } else {
            recolher();
        }
    });

    atualizarEstado();
}


/* =====================================================
   MENU / NAVEGAÇÃO — CORRIGIDO
===================================================== */

function alternarPainel(id) {
    const painel = elemento(id);
    if (!painel) return;

    const aberto =
        painel.classList.contains("aberto") ||
        painel.classList.contains("active");

    if (aberto) {
        fecharPainel(id);
    } else {
        painel.classList.add("aberto", "active");
    }
}

function fecharPainel(id) {
    const painel = elemento(id);
    if (!painel) return;

    painel.classList.remove("aberto", "active");
}


function voltarParaMapa() {
    // Desativa todas as telas internas e telas anteriores.
    document.querySelectorAll(".tela, .tela-interna").forEach(tela => {
        tela.classList.remove("active");
    });

    // Mostra novamente o mapa.
    const telaMapa = elemento("telaMapa");

    if (telaMapa) {
        telaMapa.classList.add("active");
    }

    // Fecha todos os painéis flutuantes.
    [
        "menuFlutuante",
        "painelMensagens",
        "painelCamadas",
        "fundoNotificacoes"
    ].forEach(id => {
        fecharPainel(id);
    });

    // Atualiza o mapa depois que a tela aparecer.
    setTimeout(() => {
        if (mapa) {
            mapa.invalidateSize();
        }
    }, 300);
}



function abrirTela(id) {
    const tela = elemento(id);
    if (!tela) {
        console.warn("Tela não encontrada:", id);
        return;
    }

    const atual = document.querySelector(".tela-interna.active");

    if (id === "telaConfiguracoes") {
        telaAnterior = atual?.id === "telaPerfil"
            ? "telaPerfil"
            : "telaMapa";
    }

    document.querySelectorAll(".tela-interna").forEach(item => {
        item.classList.remove("active");
    });

    tela.classList.add("active");

    fecharPainel("menuFlutuante");
    fecharPainel("painelMensagens");
    fecharPainel("painelCamadas");
    fecharPainel("fundoNotificacoes");

    if (id === "telaPerfil") {
        carregarPerfil();
        carregarHistoricoSincronizado()
            .then(atualizarEstatisticasPerfil);
    }

    if (id === "telaRanking") {
        carregarRanking();
    }

    if (id === "telaMissoes") {
        carregarHistoricoSincronizado()
            .then(atualizarMissoes);
    }

    if (id === "telaConfiguracoes") {
        preencherDadosPerfil();
    }

    setTimeout(() => {
        mapa?.invalidateSize();
    }, 300);
}

function abrirCorredoresOnline() {
    // Fecha o menu antes de abrir o painel social.
    fecharPainel("menuFlutuante");
    fecharPainel("painelCamadas");
    fecharPainel("fundoNotificacoes");

    // Abre o painel correto do HTML atual.
    const painel = elemento("painelMensagens");

    if (!painel) {
        mostrarAviso(
            "Não encontrei o painel de corredores online no HTML."
        );
        return;
    }

    painel.classList.add("aberto", "active");

    if (!canalPresenca || !usuarioAtual) {
        const lista = elemento("listaCorredoresOnline");

        if (lista && !usuarioAtual) {
            lista.replaceChildren();

            const aviso = document.createElement("div");
            aviso.className = "estado-vazio";
            aviso.textContent =
                "Entre na sua conta para acessar os corredores online.";

            lista.appendChild(aviso);
        }
    }

    if (typeof lucide !== "undefined") {
        lucide.createIcons();
    }
}

function configurarNavegacao() {
    elemento("botaoMenu")?.addEventListener("click", () => {
        fecharPainel("painelMensagens");
        fecharPainel("painelCamadas");
        alternarPainel("menuFlutuante");
    });

    elemento("abrirRanking")?.addEventListener("click", () => {
        abrirTela("telaRanking");
    });

    elemento("abrirMissoes")?.addEventListener("click", () => {
        abrirTela("telaMissoes");
    });

    elemento("abrirPerfilMenu")?.addEventListener("click", () => {
        abrirTela("telaPerfil");
    });

    elemento("abrirPerfil")?.addEventListener("click", () => {
        abrirTela("telaPerfil");
    });

    // CORREDORES ONLINE:
    // fecha o menu e abre o painel social.
    elemento("abrirMensagens")?.addEventListener(
        "click",
        abrirCorredoresOnline
    );

    elemento("fecharMensagens")?.addEventListener("click", () => {
        fecharPainel("painelMensagens");
    });

    elemento("voltarRanking")?.addEventListener(
        "click",
        voltarParaMapa
    );

    elemento("voltarMissoes")?.addEventListener(
        "click",
        voltarParaMapa
    );

    elemento("voltarPerfil")?.addEventListener(
        "click",
        voltarParaMapa
    );

    elemento("voltarConfiguracoes")?.addEventListener("click", () => {
        if (telaAnterior === "telaPerfil") {
            abrirTela("telaPerfil");
        } else {
            voltarParaMapa();
        }
    });

    document.querySelectorAll(
    "#abrirConfiguracoesMenu, #abrirConfiguracoes"
).forEach(botao => {
    botao.addEventListener("click", () => {
        abrirTela("telaConfiguracoes");
    });
});

    elemento("editarNomePerfil")?.addEventListener(
        "click",
        salvarNomePerfil
    );

    elemento("abrirConfiguracoesPerfil")?.addEventListener(
        "click",
        () => abrirTela("telaConfiguracoes")
    );

    elemento("abrirMissoesPerfil")?.addEventListener(
        "click",
        () => abrirTela("telaMissoes")
    );

    elemento("minhaLocalizacao")?.addEventListener(
        "click",
        obterLocalizacaoAtual
    );

    document.querySelectorAll("[data-fechar-tela]").forEach(botao => {
        botao.addEventListener("click", voltarParaMapa);
    });

    document.querySelectorAll("[data-mensagem]").forEach(botao => {
        botao.addEventListener("click", () => {
            const mensagem = botao.dataset.mensagem;
            if (mensagem) mostrarAviso(mensagem);
        });
    });
}

/* ===================== RANKING ===================== */

async function carregarRanking() {
    const lista = elemento("listaRanking");
    if (!lista) return;
    lista.replaceChildren();
    const supabase = window.supabaseClient;
    if (!supabase || !usuarioAtual) {
        const metros = obterHistorico().reduce((t, a) => t + (Number(a.distanciaMetros) || 0), 0);
        renderizarLinhaRanking(lista, 1, perfilAtual?.nome || "Você (local)", metros / 1000, true);
        const aviso = document.createElement("p");
        aviso.className = "vazio";
        aviso.textContent = "Entre na sua conta para participar do ranking global.";
        lista.appendChild(aviso);
        return;
    }
    const carregando = document.createElement("p");
    carregando.className = "vazio";
    carregando.textContent = "Carregando ranking...";
    lista.appendChild(carregando);
    try {
        const [perfisResp, atividadesResp] = await Promise.all([
            supabase.from("profiles").select("id,nome"),
            supabase.from("atividades").select("usuario_id,distancia_metros").limit(10000)
        ]);
        if (perfisResp.error) throw perfisResp.error;
        if (atividadesResp.error) throw atividadesResp.error;
        const totais = new Map();
        for (const a of (atividadesResp.data || [])) {
            totais.set(a.usuario_id, (totais.get(a.usuario_id) || 0) + (Number(a.distancia_metros) || 0));
        }
        const ranking = (perfisResp.data || []).map(p => ({
            id: p.id, nome: p.nome || (p.id === usuarioAtual.id ? "Você" : "Corredor"),
            km: (totais.get(p.id) || 0) / 1000
        }));
        if (!ranking.some(p => p.id === usuarioAtual.id)) {
            const localKm = obterHistorico().reduce((t, a) => t + (Number(a.distanciaMetros) || 0), 0) / 1000;
            ranking.push({ id: usuarioAtual.id, nome: perfilAtual?.nome || "Você", km: Math.max(localKm, (totais.get(usuarioAtual.id) || 0) / 1000) });
        }
        ranking.sort((a, b) => b.km - a.km || a.nome.localeCompare(b.nome, "pt-BR"));
        lista.replaceChildren();
        ranking.forEach((p, i) => renderizarLinhaRanking(lista, i + 1, p.nome, p.km, p.id === usuarioAtual.id));
    } catch (erro) {
        console.error("Erro ao carregar ranking:", erro);
        lista.replaceChildren();
        const aviso = document.createElement("p");
        aviso.className = "vazio";
        aviso.textContent = "Não foi possível carregar o ranking. Verifique a conexão e tente novamente.";
        lista.appendChild(aviso);
    }
}

function renderizarLinhaRanking(lista, posicao, nomeTexto, km, souEu = false) {
    const item = document.createElement("div");
    item.className = "item-ranking";
    if (souEu) item.classList.add("meu-ranking");
    const lugar = document.createElement("span");
    lugar.textContent = posicao <= 3 ? ["🥇", "🥈", "🥉"][posicao - 1] : String(posicao);
    const nome = document.createElement("span");
    nome.textContent = souEu ? `${nomeTexto} (você)` : nomeTexto;
    const distancia = document.createElement("span");
    distancia.textContent = `${Number(km || 0).toFixed(2).replace(".", ",")} km`;
    item.append(lugar, nome, distancia);
    lista.appendChild(item);
}

/* ===================== MISSÕES ===================== */

function atualizarMissoes() {
    const historico = obterHistorico();
    const km = historico.reduce((t, a) => t + (Number(a.distanciaMetros) || 0), 0) / 1000;
    const quantidade = historico.length;
    document.querySelectorAll(".cartao-missao[data-missao], [data-missao]").forEach(cartao => {
        const tipo = cartao.dataset.missao;
        const barra = cartao.querySelector(".barra-progresso > span") || cartao.querySelector(".barra-progresso span");
        const texto = cartao.querySelector(".texto-progresso, .progresso-texto");
        let atual = 0, meta = Number(cartao.dataset.meta || 5), unidade = "";
        if (tipo === "primeiros_km" || tipo === "distancia" || tipo === "conquistador") {
            atual = km; meta = Number(cartao.dataset.meta || (tipo === "primeiros_km" ? 5 : 10)); unidade = " km";
        } else if (tipo === "constancia") {
            atual = quantidade; meta = Number(cartao.dataset.meta || 5); unidade = " atividades";
        } else if (tipo === "explorador") {
            atual = quantidade > 0 ? 1 : 0; meta = Number(cartao.dataset.meta || 1); unidade = " atividade";
        } else if (tipo === "atividades" || tipo === "primeiros-passos") {
            atual = quantidade; meta = Number(cartao.dataset.meta || 1); unidade = " atividades";
        }
        if (barra) barra.style.width = `${meta > 0 ? Math.min(100, atual / meta * 100) : 0}%`;
        if (texto) {
            const valor = unidade === " km" ? Math.min(atual, meta).toFixed(1).replace(".", ",") : String(Math.min(atual, meta));
            texto.textContent = `${valor} / ${meta}${unidade}`;
        }
        cartao.classList.toggle("concluida", atual >= meta);
    });
}

/* ===================== PRESENÇA ONLINE ===================== */

async function configurarPresenca() {
    const supabase = window.supabaseClient;
    if (!supabase || !usuarioAtual) return;

    try {
        canalPresenca = supabase.channel("runworld-presence", {
            config: { presence: { key: usuarioAtual.id } }
        });

        canalPresenca
            .on("presence", { event: "sync" }, atualizarCorredoresOnline)
            .subscribe(status => {
                if (status === "SUBSCRIBED") console.log("Presença RunWorld conectada.");
            });
    } catch (erro) {
        console.error("Erro na presença:", erro);
    }
}

async function publicarPresenca(coords) {
    if (!canalPresenca || !atividadeIniciada) return;

    try {
        await canalPresenca.track({
            usuario_id: usuarioAtual?.id,
            nome: perfilAtual?.nome || "Corredor",
            lat: Math.round(coords.lat * 1000) / 1000,
            lng: Math.round(coords.lng * 1000) / 1000,
            atividade: atividadeAtual,
            atualizado_em: new Date().toISOString()
        });
    } catch (erro) {
        console.warn("Erro ao publicar presença:", erro);
    }
}

function atualizarCorredoresOnline() {
    if (!canalPresenca || !mapa) return;

    const estado = canalPresenca.presenceState();
    const idsVisiveis = new Set();

    Object.entries(estado).forEach(([id, presencas]) => {
        if (id === usuarioAtual?.id) return;

        const pessoa = presencas?.[presencas.length - 1];
        if (!pessoa || typeof pessoa.lat !== "number" || typeof pessoa.lng !== "number") return;
        const atualizado = Date.parse(pessoa.atualizado_em || "");
        if (!Number.isFinite(atualizado) || Date.now() - atualizado > 180000) return;

        idsVisiveis.add(id);
        const latlng = [pessoa.lat, pessoa.lng];

        if (!marcadoresCorredores[id]) {
            marcadoresCorredores[id] = L.circleMarker(latlng, {
                radius: 7,
                color: "#fff",
                weight: 2,
                fillColor: "#36e27b",
                fillOpacity: 1
            }).addTo(mapa);

            marcadoresCorredores[id].bindPopup((pessoa.nome || "Corredor online") + " — localização aproximada");
        } else {
            marcadoresCorredores[id].setLatLng(latlng);
        }
    });

    Object.keys(marcadoresCorredores).forEach(id => {
        if (!idsVisiveis.has(id)) {
            mapa.removeLayer(marcadoresCorredores[id]);
            delete marcadoresCorredores[id];
        }
    });

    const lista = elemento("listaCorredoresOnline");
    if (lista) {
        lista.replaceChildren();
        if (idsVisiveis.size === 0) {
            const vazio = document.createElement("div");
            vazio.className = "estado-vazio";
            vazio.textContent = "Nenhum corredor compartilhando a localização agora.";
            lista.appendChild(vazio);
        } else {
            Object.entries(canalPresenca.presenceState()).forEach(([id, presencas]) => {
                if (!idsVisiveis.has(id)) return;
                const pessoa = presencas?.[presencas.length - 1];
                if (!pessoa) return;
                const item = document.createElement("div");
                item.className = "item-ranking";
                const nome = document.createElement("strong");
                nome.textContent = pessoa.nome || "Corredor online";
                const atividade = document.createElement("span");
                atividade.textContent = pessoa.atividade || "Ativo";
                item.append(nome, atividade);
                lista.appendChild(item);
            });
        }
        const resumo = lista.closest(".painel-online")?.querySelector(".online-resumo");
        if (resumo) resumo.textContent = idsVisiveis.size === 1 ? "1 corredor online" : `${idsVisiveis.size} corredores online`;
    }
}

/* ===================== CONFIGURAÇÕES ===================== */

function aplicarTema(tema) {
    const temaSeguro = tema === "claro" ? "claro" : "escuro";
    if (temaSeguro === "claro") document.documentElement.dataset.tema = "claro";
    else delete document.documentElement.dataset.tema;
    try { localStorage.setItem(CHAVE_TEMA, temaSeguro); } catch (_) {}
    const botaoTema = elemento("configTema");
    if (botaoTema) {
        botaoTema.setAttribute("aria-pressed", String(temaSeguro === "claro"));
        const texto = botaoTema.querySelector(".dados-configuracao small");
        if (texto) texto.textContent = temaSeguro === "claro" ? "Tema claro ativado" : "Tema escuro ativado";
    }
}

function configurarOpcoesExtras() {
    elemento("configTema")?.addEventListener("click", () => {
        let temaAtual = "escuro";
        try { temaAtual = localStorage.getItem(CHAVE_TEMA) || "escuro"; } catch (_) {}
        aplicarTema(temaAtual === "claro" ? "escuro" : "claro");
        let temaAplicado = "escuro";
        try { temaAplicado = localStorage.getItem(CHAVE_TEMA) || "escuro"; } catch (_) {}
        mostrarAviso(`Tema ${temaAplicado === "claro" ? "claro" : "escuro"} ativado.`);
    });

    elemento("configLocalizacao")?.addEventListener("click", () => {
        obterLocalizacaoAtual();
    });

    elemento("configPrivacidade")?.addEventListener("click", () => {
        mostrarAviso("Configure as opções de privacidade do seu perfil.");
    });

    elemento("configSobre")?.addEventListener("click", () => {
        mostrarAviso("RunWorld — Explore. Corra. Conquiste.");
    });

    elemento("abrirHistorico")?.addEventListener("click", async () => {
        await carregarHistoricoSincronizado();
        const historico = obterHistorico();

        if (!historico.length) {
            mostrarAviso("Você ainda não tem atividades salvas.");
            return;
        }

        const resumo = historico.slice(0, 5).map(item => {
            const data = new Date(item.data).toLocaleDateString("pt-BR");
            return `${data} — ${item.tipo} — ${formatarDistancia(item.distanciaMetros)}`;
        }).join("\n");

        alert("Atividades recentes:\n\n" + resumo);
    });

    elemento("abrirPrivacidade")?.addEventListener("click", () => {
        mostrarAviso("Opções de privacidade.");
    });

    const tema = localStorage.getItem(CHAVE_TEMA) || "escuro";
    aplicarTema(tema);

}

/* ===================== SAIR DA CONTA ===================== */

async function sairDaConta() {
    if (atividadeIniciada) await pararAtividade();
    pararRastreamentoGPS();

    if (canalPresenca) {
        try { await canalPresenca.unsubscribe(); }
        catch (erro) { console.warn(erro); }
    }

    const supabase = window.supabaseClient;
    if (!supabase) {
        window.location.href = "login.html";
        return;
    }

    const { error } = await supabase.auth.signOut();
    if (error) {
        console.error(error);
        mostrarAviso("Não foi possível sair da conta.");
        return;
    }

    window.location.href = "login.html";
}

/* ===================== NOTIFICAÇÕES ===================== */

function configurarNotificacoes() {
    elemento("botaoNotificacoes")?.addEventListener("click", () => {
        if (typeof window.abrirPainelNotificacoes === "function") {
            window.abrirPainelNotificacoes();
        } else {
            alternarPainel("fundoNotificacoes");
        }
    });

    elemento("fecharNotificacoes")?.addEventListener("click", () => {
        if (typeof window.fecharPainelNotificacoes === "function") {
            window.fecharPainelNotificacoes();
        } else {
            fecharPainel("fundoNotificacoes");
        }
    });

    elemento("fundoNotificacoes")?.addEventListener("click", evento => {
        if (evento.target !== elemento("fundoNotificacoes")) return;
        if (typeof window.fecharPainelNotificacoes === "function") {
            window.fecharPainelNotificacoes();
        } else {
            fecharPainel("fundoNotificacoes");
        }
    });

    if (usuarioAtual && typeof window.inicializarNotificacoes === "function") {
        window.inicializarNotificacoes(usuarioAtual.id);
    }
}

/* ===================== BOTÕES E INICIALIZAÇÃO ===================== */

function configurarBotoesAtividade() {
    elemento("botaoComecar")?.addEventListener("click", iniciarAtividade);
    elemento("botaoParar")?.addEventListener("click", pararAtividade);
    elemento("botaoSair")?.addEventListener("click", sairDaConta);
    elemento("botaoSairTela")?.addEventListener("click", sairDaConta);
}

async function iniciarRunWorld() {
    console.log("Iniciando RunWorld...");

    inicializarMapa();
    configurarCamadas();
    configurarCamadasDetalhes();
    configurarTiposAtividade();
    configurarPainelDeslizante();
    configurarNavegacao();
    configurarFotoPerfil();
    configurarBotoesAtividade();
    configurarOpcoesExtras();
    configurarNotificacoes();

    await verificarSessao();
    restaurarAtividadeEmAndamento();

    // Inicializa novamente as notificações apenas se o módulo já estiver pronto.
    if (usuarioAtual && typeof window.inicializarNotificacoes === "function") {
        window.inicializarNotificacoes(usuarioAtual.id);
    }

    atualizarInformacoesAtividade();
    atualizarEstatisticasPerfil();

    if (typeof lucide !== "undefined") lucide.createIcons();

    console.log("RunWorld inicializado.");
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciarRunWorld, { once: true });
} else {
    iniciarRunWorld();
}

