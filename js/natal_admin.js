import { supabase } from "./supabase.js";

// ======================================================
// PAZ KIDS EM AÇÃO | PAINEL ADMINISTRATIVO NATAL 2026
// Requer o arquivo existente /js/supabase.js
// ======================================================

const TABELA = "criancas_natal26";

const STATUS = [
    "Pendente",
    "Entregue",
    "Com pendências",
    "Conferido / OK"
];

const telaLogin = document.getElementById("tela-login");
const telaPainel = document.getElementById("tela-painel");
const formLogin = document.getElementById("form-login");
const btnEntrar = document.getElementById("btn-entrar");
const btnSair = document.getElementById("btn-sair");
const erroLogin = document.getElementById("erro-login");
const mensagemPainel = document.getElementById("mensagem-painel");
const corpoTabela = document.getElementById("corpo-tabela");
const pesquisa = document.getElementById("pesquisa");
const filtroStatus = document.getElementById("filtro-status");
const filtroAdocao = document.getElementById("filtro-adocao");
const btnAtualizar = document.getElementById("btn-atualizar");

let registros = [];
const salvandoIds = new Set();

// ======================================================
// FUNÇÕES AUXILIARES
// ======================================================

function textoSeguro(valor, fallback = "Não informado") {
    if (
        valor === null ||
        valor === undefined ||
        String(valor).trim() === ""
    ) {
        return fallback;
    }

    return String(valor);
}

function normalizar(valor) {
    return String(valor ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLocaleLowerCase("pt-BR")
        .trim();
}

function formatarData(valor) {
    if (!valor) return "—";

    const data = new Date(`${valor}T00:00:00`);

    if (Number.isNaN(data.getTime())) return "—";

    return data.toLocaleDateString("pt-BR");
}

function dataHojeISO() {
    const agora = new Date();
    const deslocamento = agora.getTimezoneOffset() * 60000;

    return new Date(
        agora.getTime() - deslocamento
    ).toISOString().slice(0, 10);
}

function mostrarMensagem(texto, tipo = "sucesso") {
    mensagemPainel.textContent = texto;

    mensagemPainel.className = tipo === "erro"
        ? "mensagem mensagem-erro"
        : "mensagem";

    mensagemPainel.hidden = false;
}

function limparMensagem() {
    mensagemPainel.hidden = true;
    mensagemPainel.textContent = "";
}

function mostrarLogin() {
    telaLogin.hidden = false;
    telaPainel.hidden = true;
    btnSair.hidden = true;
}

function mostrarPainel() {
    telaLogin.hidden = true;
    telaPainel.hidden = false;
    btnSair.hidden = false;
}

function criarElemento(tag, classe, texto) {
    const elemento = document.createElement(tag);

    if (classe) elemento.className = classe;

    if (texto !== undefined) {
        elemento.textContent = texto;
    }

    return elemento;
}

function obterUrlFoto(foto) {
    if (!foto) return "";

    if (/^https?:\/\//i.test(foto)) {
        return foto;
    }

    const { data } = supabase.storage
        .from("fotos-criancas")
        .getPublicUrl(foto);

    return data?.publicUrl || "";
}

// ======================================================
// REGRAS DE APADRINHAMENTO E ENTREGA
// ======================================================

function adotadaSim(registro) {
    return normalizar(registro.adotada) === "sim";
}

function obterStatus(registro) {
    // Registros antigos sem status são tratados como Pendente.
    return registro.status_entrega || "Pendente";
}

// ======================================================
// LOGIN SUPABASE AUTH
// ======================================================

formLogin.addEventListener("submit", async (evento) => {
    evento.preventDefault();

    erroLogin.hidden = true;
    erroLogin.textContent = "";

    btnEntrar.disabled = true;
    btnEntrar.textContent = "Entrando...";

    const email = document
        .getElementById("email-login")
        .value.trim();

    const password = document
        .getElementById("senha-login")
        .value;

    try {
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) throw error;

        mostrarPainel();
        await carregarRegistros();

    } catch (erro) {
        console.error("Erro no login:", erro);

        erroLogin.textContent = traduzirErroLogin(erro);
        erroLogin.hidden = false;

    } finally {
        btnEntrar.disabled = false;
        btnEntrar.textContent = "Entrar no painel";
    }
});

function traduzirErroLogin(erro) {
    const mensagem = String(erro?.message || "");

    if (/invalid login credentials/i.test(mensagem)) {
        return "E-mail ou senha incorretos.";
    }

    if (/email not confirmed/i.test(mensagem)) {
        return "Este usuário ainda precisa confirmar o e-mail no Supabase.";
    }

    return "Não foi possível entrar. Verifique as credenciais e tente novamente.";
}

btnSair.addEventListener("click", async () => {
    btnSair.disabled = true;

    try {
        const { error } = await supabase.auth.signOut();

        if (error) throw error;

        registros = [];

        atualizarIndicadores();
        renderizarTabela();
        mostrarLogin();

    } catch (erro) {
        console.error("Erro ao sair:", erro);

        mostrarMensagem(
            "Não foi possível encerrar a sessão. Tente novamente.",
            "erro"
        );

    } finally {
        btnSair.disabled = false;
    }
});

// ======================================================
// CARREGAR DADOS
// ======================================================

async function verificarSessao() {
    const { data, error } = await supabase.auth.getSession();

    if (error) {
        console.error("Erro ao verificar sessão:", error);
        mostrarLogin();
        return;
    }

    if (data.session) {
        mostrarPainel();
        await carregarRegistros();
    } else {
        mostrarLogin();
    }
}

async function carregarRegistros() {
    limparMensagem();

    corpoTabela.replaceChildren();

    const linhaCarregando = criarElemento("tr");
    const celulaCarregando = criarElemento(
        "td",
        "estado-vazio",
        "Carregando registros..."
    );

    celulaCarregando.colSpan = 8;
    linhaCarregando.appendChild(celulaCarregando);
    corpoTabela.appendChild(linhaCarregando);

    btnAtualizar.disabled = true;

    try {
        const { data, error } = await supabase
            .from(TABELA)
            .select(`
                id,
                foto_url,
                nome,
                data_nascimento,
                serie_escolar,
                tamanho_blusa,
                tamanho_calca,
                tamanho_calcado,
                hobby,
                adotada,
                nome_padrinho,
                tel_padrinho,
                email_padrinho,
                campus_padrinho,
                data_adocao,
                status_entrega,
                data_entrega,
                observacoes_entrega
            `)
            .order("nome", { ascending: true });

        if (error) throw error;

        registros = data || [];

        atualizarIndicadores();
        renderizarTabela();

    } catch (erro) {
        console.error("Erro ao carregar registros:", erro);

        registros = [];

        atualizarIndicadores();
        corpoTabela.replaceChildren();

        const linha = criarElemento("tr");

        const celula = criarElemento(
            "td",
            "estado-vazio",
            "Não foi possível carregar os dados. Verifique o acesso à tabela e as políticas RLS do Supabase."
        );

        celula.colSpan = 8;
        linha.appendChild(celula);
        corpoTabela.appendChild(linha);

        mostrarMensagem(
            "Falha ao carregar os dados. Confira se o usuário autenticado tem permissão de leitura em criancas_natal26.",
            "erro"
        );

    } finally {
        btnAtualizar.disabled = false;
    }
}

// ======================================================
// INDICADORES DA CAMPANHA
// ======================================================

function atualizarIndicadores() {
    const total = registros.length;

    const apadrinhadas = registros.filter(adotadaSim);

    const livres = registros.filter(
        (registro) => !adotadaSim(registro)
    );

    // 1. Apadrinhadas que ainda aguardam a entrega.
    // Inclui registros antigos sem status definido.
    const pendentes = apadrinhadas.filter((registro) =>
        obterStatus(registro) === "Pendente"
    );

    // 2. Sacolinhas recebidas, aguardando conferência.
    const entregues = apadrinhadas.filter((registro) =>
        obterStatus(registro) === "Entregue"
    );

    // 3. Sacolinhas recebidas com itens faltantes
    // ou outras pendências que precisam ser resolvidas.
    const comPendencias = apadrinhadas.filter((registro) =>
        obterStatus(registro) === "Com pendências"
    );

    // 4. Sacolinhas conferidas e completas.
    const concluidas = apadrinhadas.filter((registro) =>
        obterStatus(registro) === "Conferido / OK"
    );

    document.getElementById("total-criancas").textContent =
        total;

    document.getElementById("total-livres").textContent =
        livres.length;

    document.getElementById("total-apadrinhadas").textContent =
        apadrinhadas.length;

    document.getElementById("total-pendentes").textContent =
        pendentes.length;

    document.getElementById("total-entregues").textContent =
        entregues.length;

    document.getElementById("total-com-pendencias").textContent =
        comPendencias.length;

    document.getElementById("total-concluidas").textContent =
        concluidas.length;
}

// ======================================================
// FILTROS E TABELA
// ======================================================

pesquisa.addEventListener("input", renderizarTabela);
filtroStatus.addEventListener("change", renderizarTabela);
filtroAdocao.addEventListener("change", renderizarTabela);
btnAtualizar.addEventListener("click", carregarRegistros);

function filtrarRegistros() {
    const termo = normalizar(pesquisa.value);
    const statusSelecionado = filtroStatus.value;
    const adocaoSelecionada = filtroAdocao.value;

    return registros.filter((registro) => {
        const textoPesquisa = normalizar([
            registro.nome,
            registro.nome_padrinho,
            registro.tel_padrinho,
            registro.email_padrinho,
            registro.campus_padrinho
        ].join(" "));

        const combinaTexto =
            !termo || textoPesquisa.includes(termo);

        const statusOriginal = registro.status_entrega || "";

        const combinaStatus =
            statusSelecionado === "todos" ||
            (
                statusSelecionado === "sem-status" &&
                !statusOriginal
            ) ||
            statusOriginal === statusSelecionado;

        const adotada = adotadaSim(registro);

        const combinaAdocao =
            adocaoSelecionada === "todos" ||
            (
                adocaoSelecionada === "adotada" &&
                adotada
            ) ||
            (
                adocaoSelecionada === "livre" &&
                !adotada
            );

        return combinaTexto &&
            combinaStatus &&
            combinaAdocao;
    });
}

function renderizarTabela() {
    const lista = filtrarRegistros();

    corpoTabela.replaceChildren();

    document.getElementById("quantidade-registros").textContent =
        `${lista.length} ${
            lista.length === 1 ? "registro" : "registros"
        }`;

    if (!lista.length) {
        const linha = criarElemento("tr");

        const celula = criarElemento(
            "td",
            "estado-vazio",
            "Nenhum registro encontrado com esses filtros."
        );

        celula.colSpan = 8;
        linha.appendChild(celula);
        corpoTabela.appendChild(linha);

        return;
    }

    lista.forEach((registro) => {
        corpoTabela.appendChild(criarLinha(registro));
    });
}

// ======================================================
// CONSTRUÇÃO DAS LINHAS DA TABELA
// ======================================================

function criarLinha(registro) {
    const linha = document.createElement("tr");

    // --------------------------------------------------
    // Criança
    // --------------------------------------------------

    const celulaCrianca = document.createElement("td");
    const blocoCrianca = criarElemento("div", "crianca-celula");

    const foto = document.createElement("img");

    foto.className = "foto-crianca";
    foto.alt = "";
    foto.loading = "lazy";
    foto.src = obterUrlFoto(registro.foto_url);

    foto.addEventListener("error", () => {
        foto.hidden = true;
    }, { once: true });

    const dadosCrianca = document.createElement("div");

    dadosCrianca.appendChild(
        criarElemento(
            "div",
            "nome-crianca",
            textoSeguro(registro.nome, "Sem nome")
        )
    );

    dadosCrianca.appendChild(
        criarElemento("span", "detalhe-celula", `ID: ${registro.id}`)
    );

    dadosCrianca.appendChild(
        criarElemento(
            "span",
            "detalhe-celula",
            registro.serie_escolar || "Série não informada"
        )
    );

    blocoCrianca.append(foto, dadosCrianca);
    celulaCrianca.appendChild(blocoCrianca);
    linha.appendChild(celulaCrianca);

    // --------------------------------------------------
    // Padrinho e contato
    // --------------------------------------------------

    const celulaPadrinho = document.createElement("td");

    celulaPadrinho.appendChild(
        criarElemento(
            "div",
            "",
            registro.nome_padrinho || "Sem padrinho"
        )
    );

    celulaPadrinho.appendChild(
        criarElemento(
            "span",
            "detalhe-celula",
            registro.tel_padrinho || "Telefone não informado"
        )
    );

    if (registro.email_padrinho) {
        celulaPadrinho.appendChild(
            criarElemento(
                "span",
                "detalhe-celula",
                registro.email_padrinho
            )
        );
    }

    linha.appendChild(celulaPadrinho);

    // --------------------------------------------------
    // Campus
    // --------------------------------------------------

    const celulaCampus = document.createElement("td");

    celulaCampus.textContent =
        registro.campus_padrinho || "—";

    linha.appendChild(celulaCampus);

    // --------------------------------------------------
    // Data do apadrinhamento
    // --------------------------------------------------

    const celulaAdocao = document.createElement("td");

    celulaAdocao.className = "data-texto";
    celulaAdocao.textContent = formatarData(registro.data_adocao);

    linha.appendChild(celulaAdocao);

    // --------------------------------------------------
    // Status da entrega
    // --------------------------------------------------

    const celulaStatus = document.createElement("td");
    const selectStatus = document.createElement("select");

    selectStatus.className = "status-select";

    selectStatus.setAttribute(
        "aria-label",
        `Status da entrega de ${registro.nome || "criança"}`
    );

    const valorStatus = obterStatus(registro);

    // Preserva temporariamente algum status inesperado já
    // existente no banco para não o alterar silenciosamente.
    const opcoesStatus = [...STATUS];

    if (!opcoesStatus.includes(valorStatus)) {
        opcoesStatus.unshift(valorStatus);
    }

    opcoesStatus.forEach((status) => {
        const opcao = document.createElement("option");

        opcao.value = status;
        opcao.textContent = status;

        selectStatus.appendChild(opcao);
    });

    selectStatus.value = valorStatus;

    celulaStatus.appendChild(selectStatus);
    linha.appendChild(celulaStatus);

    // --------------------------------------------------
    // Data de recebimento
    // --------------------------------------------------

    const celulaData = document.createElement("td");

    celulaData.className = "data-texto";
    celulaData.textContent = formatarData(registro.data_entrega);

    linha.appendChild(celulaData);

    // --------------------------------------------------
    // Observações e pendências
    // --------------------------------------------------

    const celulaObservacoes = document.createElement("td");
    const campoObservacoes = document.createElement("textarea");

    campoObservacoes.className = "observacoes";
    campoObservacoes.value = registro.observacoes_entrega || "";
    campoObservacoes.placeholder = "Ex.: falta o calçado...";

    campoObservacoes.setAttribute(
        "aria-label",
        `Observações de ${registro.nome || "criança"}`
    );

    celulaObservacoes.appendChild(campoObservacoes);
    linha.appendChild(celulaObservacoes);

    // --------------------------------------------------
    // Botão salvar
    // --------------------------------------------------

    const celulaAcao = document.createElement("td");

    const botaoSalvar = criarElemento(
        "button",
        "btn btn-salvar",
        "Salvar"
    );

    botaoSalvar.type = "button";

    botaoSalvar.addEventListener("click", () => {
        salvarAlteracoes({
            registro,
            novoStatus: selectStatus.value,
            observacoes: campoObservacoes.value,
            botao: botaoSalvar
        });
    });

    celulaAcao.appendChild(botaoSalvar);
    linha.appendChild(celulaAcao);



    

    // --------------------------------------------------
    // Bloqueia edição de crianças ainda não apadrinhadas
    // --------------------------------------------------

    if (!adotadaSim(registro)) {
        selectStatus.disabled = true;
        campoObservacoes.disabled = true;
        botaoSalvar.disabled = true;

        botaoSalvar.title =
            "A criança ainda não está apadrinhada.";
    }

    return linha;
}

// ======================================================
// SALVAR STATUS E OBSERVAÇÕES
// ======================================================

async function salvarAlteracoes({
    registro,
    novoStatus,
    observacoes,
    botao
}) {
    if (salvandoIds.has(registro.id)) return;

    if (!adotadaSim(registro)) {
        mostrarMensagem(
            "Não é possível atualizar a entrega de uma criança que ainda não foi apadrinhada.",
            "erro"
        );

        return;
    }

    if (!STATUS.includes(novoStatus)) {
        mostrarMensagem("Selecione um status válido.", "erro");
        return;
    }

    if (
        novoStatus === "Com pendências" &&
        !observacoes.trim()
    ) {
        mostrarMensagem(
            "Descreva em Observações o que está faltando no kit.",
            "erro"
        );

        return;
    }

    const observacaoFinal = observacoes.trim() || null;

    const atualizacoes = {
        status_entrega: novoStatus,
        observacoes_entrega: observacaoFinal
    };

    // Registra a data na primeira passagem de Pendente para
    // qualquer status de recebimento.
    // Nas alterações posteriores, preserva a data original.
    const statusAnterior = obterStatus(registro);

    const indicaRecebimento = novoStatus !== "Pendente";

    if (indicaRecebimento && !registro.data_entrega) {
        atualizacoes.data_entrega = dataHojeISO();
    }

    salvandoIds.add(registro.id);

    botao.disabled = true;
    botao.textContent = "Salvando...";

    try {
        const { data, error } = await supabase
            .from(TABELA)
            .update(atualizacoes)
            .eq("id", registro.id)
            .select(`
                id,
                status_entrega,
                data_entrega,
                observacoes_entrega
            `)
            .single();

        if (error) throw error;

        if (!data) {
            throw new Error(
                "O Supabase não retornou o registro atualizado."
            );
        }

        registro.status_entrega = data.status_entrega;
        registro.data_entrega = data.data_entrega;
        registro.observacoes_entrega = data.observacoes_entrega;

        // Atualiza os indicadores e a tabela imediatamente.
        atualizarIndicadores();
        renderizarTabela();

        const mensagens = {
            "Pendente":
                "Alterações salvas. A sacolinha continua aguardando entrega.",

            "Entregue":
                "Recebimento registrado. A sacolinha está aguardando conferência.",

            "Com pendências":
                "Pendências registradas. A sacolinha precisa de ajustes antes da conclusão.",

            "Conferido / OK":
                "Sacolinha conferida e completa. Etapa concluída!"
        };

        mostrarMensagem(
            mensagens[novoStatus] || "Alterações salvas."
        );

        console.log("Registro atualizado:", {
            id: data.id,
            statusAnterior,
            statusAtual: data.status_entrega,
            dataEntrega: data.data_entrega
        });

    } catch (erro) {
        console.error("Erro ao salvar alterações:", erro);

        mostrarMensagem(
            "Não foi possível salvar. Verifique as permissões de UPDATE da tabela no Supabase (RLS) e tente novamente.",
            "erro"
        );

        botao.disabled = false;
        botao.textContent = "Salvar";
        
       

    } finally {
        salvandoIds.delete(registro.id);
    }
}

// ======================================================
// INICIALIZAÇÃO
// ======================================================

atualizarIndicadores();
verificarSessao();