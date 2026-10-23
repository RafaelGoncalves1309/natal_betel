
import { supabase } from "./supabase.js";

// ==================================================
// CONFIGURAÇÃO
// ==================================================

const TABELA = "criancas";

// IMPORTANTE: substitua pelo nome EXATO do seu bucket.
const BUCKET = "criancas";

// ==================================================
// ELEMENTOS HTML
// ==================================================

const grid = document.getElementById("grid-criancas");

const modalFormulario = document.getElementById("modal-formulario");
const fecharFormulario = document.getElementById("fechar-modal-formulario");

const campoNome = document.getElementById("nome");
const campoTelefone = document.getElementById("telefone");
const campoEmail = document.getElementById("email");
const campoCampus = document.getElementById("campus");
const botaoApadrinhar = document.getElementById("btn-apadrinhar");

const formNomeCrianca = document.getElementById("form-nome-crianca");
const formIdadeCrianca = document.getElementById("form-idade-crianca");
const formFotoCrianca = document.getElementById("form-foto-crianca");

let criancaSelecionada = null;
let listaCriancas = [];

// ==================================================
// FUNÇÕES AUXILIARES
// ==================================================

function normalizar(texto) {
    return String(texto ?? "")
        .trim()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
}

function estaApadrinhada(valor) {
    return ["sim", "true", "1", "yes"].includes(normalizar(valor));
}

function obterUrlFoto(caminho) {
    if (!caminho) return "";

    // Também aceita URLs completas armazenadas na tabela.
    if (/^https?:\/\//i.test(caminho)) {
        return caminho;
    }

    const { data } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(String(caminho).replace(/^\/+/, ""));

    return data.publicUrl;
}

function criarElemento(tag, classe, texto = "") {
    const elemento = document.createElement(tag);

    if (classe) elemento.className = classe;
    elemento.textContent = texto;

    return elemento;
}

function mostrarMensagem(texto) {
    if (!grid) return;

    grid.replaceChildren();

    const mensagem = criarElemento("p", "mensagem-grid", texto);
    mensagem.style.gridColumn = "1 / -1";
    mensagem.style.textAlign = "center";
    mensagem.style.padding = "24px";

    grid.appendChild(mensagem);
}

// ==================================================
// CRIAÇÃO DOS CARDS
// ==================================================

function criarCard(crianca) {
    const card = criarElemento("article", "card-crianca");

    const urlFoto = obterUrlFoto(crianca.foto_url);

    const foto = document.createElement("img");
    foto.className = "foto-crianca";
    foto.alt = crianca.nome
        ? `Foto de ${crianca.nome}`
        : "Foto da criança";
    foto.loading = "lazy";

    if (urlFoto) {
        foto.src = urlFoto;
    } else {
        foto.style.display = "none";
    }

    foto.addEventListener("error", () => {
        foto.style.display = "none";

        if (!card.querySelector(".aviso-sem-foto")) {
            const aviso = criarElemento(
                "div",
                "aviso-sem-foto",
                "Foto não disponível"
            );
            card.prepend(aviso);
        }
    });

    const conteudo = criarElemento("div", "conteudo-card");

    const nome = criarElemento(
        "h3",
        "nome-crianca",
        crianca.nome || "Nome não informado"
    );

    const idade = criarElemento(
        "p",
        "idade-crianca",
        crianca.idade
            ? `${crianca.idade} anos`
            : "Idade não informada"
    );

    const medidas = criarElemento("div", "dados-crianca");

    const camiseta = criarElemento(
        "p",
        "dado-crianca",
        `👕 Camiseta: ${crianca.camiseta || "Não informado"}`
    );

    const calca = criarElemento(
        "p",
        "dado-crianca",
        `👖 Calça: ${crianca.calca || "Não informado"}`
    );

    const sapato = criarElemento(
        "p",
        "dado-crianca",
        `👟 Calçado: ${crianca.sapato || "Não informado"}`
    );

    medidas.append(camiseta, calca, sapato);

    conteudo.append(nome, idade, medidas);

    if (crianca.hobby) {
        const hobby = criarElemento(
            "p",
            "hobby-crianca",
            `💚 Gosta de ${crianca.hobby}`
        );

        conteudo.appendChild(hobby);
    }

    const apadrinhada = estaApadrinhada(crianca.apadrinhada);

    const botao = criarElemento(
        "button",
        "btn-apadrinhar-crianca",
        apadrinhada ? "Já apadrinhada ❤️" : "🎁 Apadrinhar"
    );

    botao.type = "button";
    botao.disabled = apadrinhada;

    if (apadrinhada) {
        card.classList.add("crianca-apadrinhada");
    } else {
        botao.addEventListener("click", () => abrirFormulario(crianca));
    }

    conteudo.appendChild(botao);
    card.append(foto, conteudo);

    return card;
}

// ==================================================
// CARREGAR CRIANÇAS DO SUPABASE
// ==================================================

async function carregarCriancas() {
    if (!grid) {
        console.error('Não encontrei o elemento HTML "#grid-criancas".');
        return;
    }

    mostrarMensagem("Carregando as crianças...");

    try {
        const { data, error } = await supabase
            .from(TABELA)
            .select(
                "id, nome, idade, camiseta, calca, sapato, hobby, foto_url, apadrinhada"
            )
            .order("nome", { ascending: true });

        if (error) throw error;

        listaCriancas = data || [];

        if (listaCriancas.length === 0) {
            mostrarMensagem(
                "Nenhuma criança encontrada. Verifique se há registros na tabela criancas e se o acesso de leitura está configurado."
            );
            return;
        }

        grid.replaceChildren();

        const fragmento = document.createDocumentFragment();

        listaCriancas.forEach((crianca) => {
            fragmento.appendChild(criarCard(crianca));
        });

        grid.appendChild(fragmento);

        console.log(
            `Grade carregada: ${listaCriancas.length} criança(s).`
        );
    } catch (erro) {
        console.error("Erro ao carregar crianças:", erro);

        mostrarMensagem(
            "Não foi possível carregar as crianças. Abra o console do navegador (F12) para consultar o erro."
        );
    }
}

// ==================================================
// ABRIR FORMULÁRIO DE APADRINHAMENTO
// ==================================================

function abrirFormulario(crianca) {
    if (estaApadrinhada(crianca.apadrinhada)) {
        alert("Esta criança já foi apadrinhada.");
        return;
    }

    criancaSelecionada = crianca;

    if (formNomeCrianca) {
        formNomeCrianca.textContent = crianca.nome || "";
    }

    if (formIdadeCrianca) {
        formIdadeCrianca.textContent = crianca.idade
            ? `${crianca.idade} anos`
            : "";
    }

    if (formFotoCrianca) {
        formFotoCrianca.src = obterUrlFoto(crianca.foto_url);
        formFotoCrianca.alt = `Foto de ${crianca.nome || "criança"}`;
        formFotoCrianca.style.display = crianca.foto_url ? "" : "none";
    }

    if (campoNome) campoNome.value = "";
    if (campoTelefone) campoTelefone.value = "";
    if (campoEmail) campoEmail.value = "";
    if (campoCampus) campoCampus.value = "";

    if (botaoApadrinhar) {
        botaoApadrinhar.disabled = false;
        botaoApadrinhar.textContent = "Confirmar apadrinhamento";
    }

    if (modalFormulario) {
        modalFormulario.style.display = "flex";
        modalFormulario.setAttribute("aria-hidden", "false");
    }
}

function fecharModalFormulario() {
    if (modalFormulario) {
        modalFormulario.style.display = "none";
        modalFormulario.setAttribute("aria-hidden", "true");
    }

    criancaSelecionada = null;
}

fecharFormulario?.addEventListener("click", fecharModalFormulario);

modalFormulario?.addEventListener("click", (evento) => {
    if (evento.target === modalFormulario) {
        fecharModalFormulario();
    }
});

document.addEventListener("keydown", (evento) => {
    if (evento.key === "Escape") {
        fecharModalFormulario();
    }
});


 // ==================================================
// SALVAR APADRINHAMENTO
// ==================================================

async function salvarApadrinhamento() {
    if (!criancaSelecionada) {
        alert("Selecione uma criança antes de continuar.");
        return;
    }

    const nomePadrinho = campoNome?.value.trim() || "";
    const telefonePadrinho = campoTelefone?.value.trim() || "";
    const emailPadrinho = campoEmail?.value.trim() || "";
    const lifePadrinho = campoCampus?.value.trim() || "";

    if (!nomePadrinho || !telefonePadrinho || !lifePadrinho) {
        alert("Preencha seu nome, telefone e Life Group.");
        return;
    }

    if (botaoApadrinhar) {
        botaoApadrinhar.disabled = true;
        botaoApadrinhar.textContent = "Salvando...";
    }

    try {
        const crianca = criancaSelecionada;

        const dadosPadrinho = {
            apadrinhada: "Sim",
            nome_padrinho: nomePadrinho,
            telefone_padrinho: telefonePadrinho,
            email_padrinho: emailPadrinho,
            life_padrinho: lifePadrinho
        };

        // Atualiza somente se a criança ainda estiver
        // com o mesmo status de apadrinhamento.
        let consulta = supabase
            .from(TABELA)
            .update(dadosPadrinho)
            .eq("id", crianca.id)
            .eq("apadrinhada", crianca.apadrinhada);

        if (crianca.apadrinhada == null) {
            consulta = supabase
                .from(TABELA)
                .update(dadosPadrinho)
                .eq("id", crianca.id)
                .is("apadrinhada", null);
        }

        const { data, error } = await consulta.select("id");

        if (error) throw error;

        if (!data || data.length === 0) {
            alert(
                "Esta criança pode ter sido apadrinhada por outra pessoa. Atualize a página para conferir."
            );

            fecharModalFormulario();
            await carregarCriancas();
            return;
        }
       

        sessionStorage.setItem(
        "confirmacaoApadrinhamento",
        JSON.stringify({
            nome: crianca.nome,
            idade: crianca.idade,
            camiseta: crianca.camiseta,
            calca: crianca.calca,
            sapato: crianca.sapato,
            hobby: crianca.hobby,
            nomePadrinho: nomePadrinho,
            lifePadrinho: lifePadrinho
        })
        );

window.location.href = "/pages/confirmacao.html";
return;

window.location.href = "/pages/confirmacao.html";
return;

    } catch (erro) {
        console.error("Erro ao salvar apadrinhamento:", erro);

        alert(
            "Não foi possível salvar o apadrinhamento. Verifique as permissões de atualização no Supabase e tente novamente."
        );

    } finally {
        if (botaoApadrinhar) {
            botaoApadrinhar.disabled = false;
            botaoApadrinhar.textContent = "Confirmar apadrinhamento";
        }
    }
}

botaoApadrinhar?.addEventListener("click", salvarApadrinhamento);
// ==================================================
// INICIALIZAÇÃO
// ==================================================

carregarCriancas();