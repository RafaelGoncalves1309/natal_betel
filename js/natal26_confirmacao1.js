import { supabase } from "./supabase.js";

// ==========================================
// PAZ KIDS EM AÇÃO
// CONFIRMAÇÃO DO APADRINHAMENTO - NATAL 2026
// ==========================================


// ======================================================
// ELEMENTOS
// ======================================================

const mensagemErro =
    document.getElementById(
        "mensagem-erro"
    );


// ======================================================
// OBTER ID DA CRIANÇA PELA URL
// ======================================================

function obterIdCrianca() {

    const parametros =
        new URLSearchParams(
            window.location.search
        );


    const id =
        parametros.get("id");


    return id;

}


// ======================================================
// CALCULAR IDADE
// ======================================================

function calcularIdade(dataNascimento) {

    if (!dataNascimento) {

        return "";

    }


    const nascimento =
        new Date(dataNascimento);


    const hoje =
        new Date();


    let idade =
        hoje.getFullYear() -
        nascimento.getFullYear();


    const diferencaMes =
        hoje.getMonth() -
        nascimento.getMonth();


    if (
        diferencaMes < 0 ||
        (
            diferencaMes === 0 &&
            hoje.getDate() < nascimento.getDate()
        )
    ) {

        idade--;

    }


    return `${idade} anos`;

}


// ======================================================
// OBTER URL DA FOTO
// ======================================================

function obterUrlFoto(foto) {

    if (!foto) {

        return "";

    }


    if (
        foto.startsWith("http://") ||
        foto.startsWith("https://")
    ) {

        return foto;

    }


    const { data } =
        supabase
            .storage
            .from("fotos-criancas")
            .getPublicUrl(foto);


    return data?.publicUrl || "";

}


// ======================================================
// CARREGAR APADRINHAMENTO
// ======================================================

async function carregarApadrinhamento() {

    const id =
        obterIdCrianca();


    console.log(
        "ID recebido pela confirmação:",
        id
    );


    // --------------------------------------------------
    // VERIFICAR ID
    // --------------------------------------------------

    if (!id) {

        console.error(
            "Nenhum ID de criança foi informado na URL."
        );


        mostrarErro();

        return;

    }


    // --------------------------------------------------
    // BUSCAR NO SUPABASE
    // --------------------------------------------------

    const { data, error } =

        await supabase

            .from("criancas_natal26")

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
                nome_padrinho,
                tel_padrinho,
                email_padrinho,
                campus_padrinho,
                data_adocao,
                status_entrega
            `)

            .eq(
                "id",
                id
            )

            .single();


    // --------------------------------------------------
    // ERRO
    // --------------------------------------------------

    if (error) {

        console.error(
            "Erro ao buscar o apadrinhamento:",
            error
        );


        mostrarErro();

        return;

    }


    // --------------------------------------------------
    // NENHUM REGISTRO
    // --------------------------------------------------

    if (!data) {

        console.error(
            "Nenhum registro encontrado."
        );


        mostrarErro();

        return;

    }


    console.log(
        "Dados carregados do Supabase:",
        data
    );


    // --------------------------------------------------
    // PREENCHER CARD
    // --------------------------------------------------

    preencherCard(
        data
    );

}


// ======================================================
// MOSTRAR ERRO
// ======================================================

function mostrarErro() {

    if (mensagemErro) {

        mensagemErro.style.display =
            "flex";

    }

}


// ======================================================
// PREENCHER CARD
// ======================================================

function preencherCard(dados) {

    const nome =
        dados.nome ||
        "Criança";


    const idade =
        calcularIdade(
            dados.data_nascimento
        );


    const foto =
        obterUrlFoto(
            dados.foto_url
        );


    // --------------------------------------------------
    // NOME
    // --------------------------------------------------

    document.getElementById(
        "card-nome"
    ).textContent =
        nome;


    // --------------------------------------------------
    // IDADE
    // --------------------------------------------------

    document.getElementById(
        "card-idade"
    ).textContent =
        idade;


    // --------------------------------------------------
    // SÉRIE
    // --------------------------------------------------

    document.getElementById(
        "card-serie"
    ).textContent =
        dados.serie_escolar ||
        "Não informado";


    // --------------------------------------------------
    // BLUSA
    // --------------------------------------------------

    document.getElementById(
        "card-blusa"
    ).textContent =
        dados.tamanho_blusa ||
        "Não informado";


    // --------------------------------------------------
    // CALÇA
    // --------------------------------------------------

    document.getElementById(
        "card-calca"
    ).textContent =
        dados.tamanho_calca ||
        "Não informado";


    // --------------------------------------------------
    // CALÇADO
    // --------------------------------------------------

    document.getElementById(
        "card-calcado"
    ).textContent =
        dados.tamanho_calcado ||
        "Não informado";


    // --------------------------------------------------
    // HOBBY
    // --------------------------------------------------

    document.getElementById(
        "card-hobby"
    ).textContent =
        dados.hobby ||
        "Não informado";


    // --------------------------------------------------
    // FOTO
    // --------------------------------------------------

    const imagem =
        document.getElementById(
            "card-foto"
        );


    if (foto) {

        imagem.src =
            foto;


        imagem.alt =
            `Foto de ${nome}`;


        imagem.style.display =
            "block";


        imagem.onerror =
            () => {

                console.error(
                    "Não foi possível carregar a foto:",
                    foto
                );


                imagem.style.display =
                    "none";

            };


    } else {

        console.warn(
            "Nenhuma foto foi encontrada."
        );


        imagem.style.display =
            "none";

    }


    // --------------------------------------------------
    // MENSAGEM PARA O PADRINHO
    // --------------------------------------------------

    const padrinho =
        dados.nome_padrinho ||
        "padrinho(a)";


    const mensagemPadrinho =
        document.getElementById(
            "mensagem-padrinho"
        );


    if (mensagemPadrinho) {

        mensagemPadrinho.innerHTML =

            `Obrigado, <strong>${escaparHTML(padrinho)}</strong>! ` +

            `Você escolheu preparar uma sacolinha de Natal para ` +

            `<strong>${escaparHTML(nome)}</strong>.`;

    }

}


// ======================================================
// DOWNLOAD
// ======================================================

const botaoDownload =
    document.getElementById(
        "btn-download"
    );


if (botaoDownload) {

    botaoDownload.addEventListener(
        "click",
        baixarCard
    );

}


// ======================================================
// BAIXAR CARD
// ======================================================

async function baixarCard() {

    const botao =
        document.getElementById(
            "btn-download"
        );


    const card =
        document.getElementById(
            "card-sacolininha"
        );


    botao.disabled =
        true;


    botao.textContent =
        "⏳ Preparando sua sacolinha...";


    try {

        const imagem =
            await criarImagemCard(
                card
            );


        const link =
            document.createElement(
                "a"
            );


        const nomeCrianca =
            document
                .getElementById(
                    "card-nome"
                )
                .textContent
                .trim()
                .replace(
                    /\s+/g,
                    "_"
                )
                .replace(
                    /[^\wÀ-ÿ_-]/g,
                    ""
                );


        link.download =
            `Sacolinha_Natal_2026_${nomeCrianca}.png`;


        link.href =
            imagem;


        document.body.appendChild(
            link
        );


        link.click();


        link.remove();


    } catch (erro) {

        console.error(
            "Erro ao gerar imagem:",
            erro
        );


        alert(
            "Não foi possível gerar a imagem automaticamente. " +
            "Você pode usar o botão Imprimir ou tirar um print do card."
        );


    } finally {

        botao.disabled =
            false;


        botao.textContent =
            "📥 Baixar minha sacolinha";

    }

}


// ======================================================
// CARREGAR IMAGEM COM CORS
// ======================================================

function carregarImagemParaCanvas(url) {

    return new Promise(
        (resolve) => {

            if (!url) {

                resolve(null);

                return;

            }


            const imagem =
                new Image();


            imagem.crossOrigin =
                "anonymous";


            imagem.onload =
                () => {

                    resolve(
                        imagem
                    );

                };


            imagem.onerror =
                () => {

                    console.warn(
                        "A foto não pôde ser carregada com CORS. " +
                        "O PNG será gerado sem a foto."
                    );


                    resolve(
                        null
                    );

                };


            imagem.src =
                url;

        }
    );

}


// ======================================================
// GERAR PNG
// ======================================================

async function criarImagemCard(elemento) {

    const largura =
        900;


    const altura =
        1100;


    const escala =
        2;


    const canvas =
        document.createElement(
            "canvas"
        );


    canvas.width =
        largura * escala;


    canvas.height =
        altura * escala;


    const contexto =
        canvas.getContext(
            "2d"
        );


    contexto.scale(
        escala,
        escala
    );


    // ==================================================
    // FUNDO
    // ==================================================

    contexto.fillStyle =
        "#fffaf2";


    contexto.fillRect(
        0,
        0,
        largura,
        altura
    );


    // ==================================================
    // CARD
    // ==================================================

    contexto.fillStyle =
        "#ffffff";


    arredondarRetangulo(
        contexto,
        30,
        30,
        840,
        1040,
        28
    );


    contexto.fill();


    // ==================================================
    // CABEÇALHO
    // ==================================================

    contexto.fillStyle =
        "#b52222";


    arredondarTopo(
        contexto,
        30,
        30,
        840,
        180,
        28
    );


    contexto.fill();


    contexto.fillStyle =
        "#ffffff";


    contexto.textAlign =
        "center";


    contexto.font =
        "800 22px Montserrat, Arial";


    contexto.fillText(
        "PAZ KIDS EM AÇÃO",
        450,
        78
    );


    contexto.font =
        "400 42px 'Berkshire Swash', cursive";


    contexto.fillText(
        "Sacolinha de Natal",
        450,
        125
    );


    contexto.font =
        "700 14px Montserrat, Arial";


    contexto.fillText(
        "NATAL 2026",
        450,
        155
    );


    // ==================================================
    // FOTO DA CRIANÇA
    // ==================================================

    const imagemOriginal =
        document.getElementById(
            "card-foto"
        );


    let fotoElemento = null;


    if (
        imagemOriginal &&
        imagemOriginal.src
    ) {

        fotoElemento =
            await carregarImagemParaCanvas(
                imagemOriginal.src
            );

    }


    if (
        fotoElemento &&
        fotoElemento.complete &&
        fotoElemento.naturalWidth > 0
    ) {

        try {

            const fotoY =
                215;


            const fotoTamanho =
                220;


            contexto.save();


            contexto.beginPath();


            contexto.arc(
                450,
                fotoY + fotoTamanho / 2,
                fotoTamanho / 2,
                0,
                Math.PI * 2
            );


            contexto.closePath();


            contexto.clip();


            const proporcao =
                Math.max(
                    fotoTamanho /
                        fotoElemento.naturalWidth,

                    fotoTamanho /
                        fotoElemento.naturalHeight
                );


            const larguraFoto =
                fotoElemento.naturalWidth *
                proporcao;


            const alturaFoto =
                fotoElemento.naturalHeight *
                proporcao;


            const fotoXCentralizada =
                450 -
                larguraFoto / 2;


            const fotoYCentralizada =
                fotoY +
                fotoTamanho / 2 -
                alturaFoto / 2;


            contexto.drawImage(
                fotoElemento,
                fotoXCentralizada,
                fotoYCentralizada,
                larguraFoto,
                alturaFoto
            );


            contexto.restore();


            contexto.strokeStyle =
                "#d6a738";


            contexto.lineWidth =
                5;


            contexto.beginPath();


            contexto.arc(
                450,
                fotoY + fotoTamanho / 2,
                fotoTamanho / 2,
                0,
                Math.PI * 2
            );


            contexto.stroke();


        } catch (erro) {

            console.warn(
                "Não foi possível desenhar a foto no PNG:",
                erro
            );

        }

    } else {

        console.warn(
            "PNG será gerado sem a foto da criança."
        );

    }


    // ==================================================
    // NOME
    // ==================================================

    const nome =
        document
            .getElementById(
                "card-nome"
            )
            .textContent;


    contexto.fillStyle =
        "#b52222";


    contexto.font =
        "400 42px 'Berkshire Swash', cursive";


    contexto.textAlign =
        "center";


    contexto.fillText(
        nome,
        450,
        485
    );


    contexto.fillStyle =
        "#777777";


    contexto.font =
        "800 12px Montserrat, Arial";


    contexto.fillText(
        "ESTA SACOLINHA É PARA",
        450,
        440
    );


    contexto.font =
        "400 18px Montserrat, Arial";


    contexto.fillText(
        document
            .getElementById(
                "card-idade"
            )
            .textContent,
        450,
        515
    );


    // ==================================================
    // LINHA
    // ==================================================

    contexto.strokeStyle =
        "#d6a738";


    contexto.lineWidth =
        2;


    contexto.beginPath();


    contexto.moveTo(
        130,
        545
    );


    contexto.lineTo(
        770,
        545
    );


    contexto.stroke();


    // ==================================================
    // INFORMAÇÕES
    // ==================================================

    const informacoes = [

        [
            "Série",
            document
                .getElementById(
                    "card-serie"
                )
                .textContent
        ],

        [
            "Blusa",
            document
                .getElementById(
                    "card-blusa"
                )
                .textContent
        ],

        [
            "Calça",
            document
                .getElementById(
                    "card-calca"
                )
                .textContent
        ],

        [
            "Calçado",
            document
                .getElementById(
                    "card-calcado"
                )
                .textContent
        ]

    ];


    informacoes.forEach(
        ([rotulo, valor], indice) => {

            const coluna =
                indice % 2;


            const linha =
                Math.floor(
                    indice / 2
                );


            const posX =
                120 +
                coluna * 350;


            const posY =
                585 +
                linha * 90;


            contexto.fillStyle =
                "#fff0f0";


            arredondarRetangulo(
                contexto,
                posX,
                posY,
                300,
                65,
                12
            );


            contexto.fill();


            contexto.textAlign =
                "left";


            contexto.fillStyle =
                "#777777";


            contexto.font =
                "10px Montserrat, Arial";


            contexto.fillText(
                rotulo.toUpperCase(),
                posX + 18,
                posY + 22
            );


            contexto.fillStyle =
                "#333333";


            contexto.font =
                "700 16px Montserrat, Arial";


            contexto.fillText(
                valor,
                posX + 18,
                posY + 45
            );

        }
    );


    // ==================================================
    // HOBBY
    // ==================================================

    contexto.fillStyle =
        "#fff8e8";


    arredondarRetangulo(
        contexto,
        120,
        780,
        660,
        70,
        12
    );


    contexto.fill();


    contexto.textAlign =
        "left";


    contexto.fillStyle =
        "#777777";


    contexto.font =
        "10px Montserrat, Arial";


    contexto.fillText(
        "SUGESTÃO DE PRESENTE / HOBBY",
        140,
        805
    );


    contexto.fillStyle =
        "#333333";


    contexto.font =
        "700 16px Montserrat, Arial";


    contexto.fillText(
        document
            .getElementById(
                "card-hobby"
            )
            .textContent,
        140,
        828
    );


    // ==================================================
    // SACOLINHA
    // ==================================================

    contexto.fillStyle =
        "#333333";


    contexto.font =
        "700 17px Montserrat, Arial";


    contexto.fillText(
        "Minha sacolinha deve conter:",
        120,
        875
    );


    contexto.font =
        "600 14px Montserrat, Arial";


    contexto.fillText(
        "1 roupa     1 sapato     1 presente     1 kit escolar",
        120,
        905
    );


    // ==================================================
    // ENTREGA
    // ==================================================

    contexto.fillStyle =
        "#f6f6f6";


    arredondarRetangulo(
        contexto,
        120,
        925,
        660,
        90,
        14
    );


    contexto.fill();


    contexto.textAlign =
        "center";


    contexto.fillStyle =
        "#b52222";


    contexto.font =
        "700 15px Montserrat, Arial";


    contexto.fillText(
        "ENTREGA",
        450,
        955
    );


    contexto.fillStyle =
        "#333333";


    contexto.font =
        "400 13px Montserrat, Arial";


    contexto.fillText(
        "Entregue na igreja / Paz Kids do seu Campus.",
        450,
        980
    );


    // ==================================================
    // RODAPÉ
    // ==================================================

    contexto.fillStyle =
        "#176b45";


    contexto.fillRect(
        30,
        1000,
        840,
        70
    );


    contexto.fillStyle =
        "#ffffff";


    contexto.font =
        "600 13px Montserrat, Arial";


    contexto.fillText(
        "Alcançando Além das Quatro Paredes",
        450,
        1028
    );


    contexto.font =
        "600 12px Montserrat, Arial";


    contexto.fillText(
        "Paz Kids em Ação",
        450,
        1052
    );


    // ==================================================
    // GERAR PNG
    // ==================================================

    return canvas.toDataURL(
        "image/png"
    );

}


// ======================================================
// FUNÇÕES DE DESENHO
// ======================================================

function arredondarRetangulo(
    ctx,
    x,
    y,
    largura,
    altura,
    raio
) {

    ctx.beginPath();


    ctx.roundRect(
        x,
        y,
        largura,
        altura,
        raio
    );


    ctx.closePath();

}


function arredondarTopo(
    ctx,
    x,
    y,
    largura,
    altura,
    raio
) {

    ctx.beginPath();


    ctx.moveTo(
        x + raio,
        y
    );


    ctx.lineTo(
        x + largura - raio,
        y
    );


    ctx.quadraticCurveTo(
        x + largura,
        y,
        x + largura,
        y + raio
    );


    ctx.lineTo(
        x + largura,
        y + altura
    );


    ctx.lineTo(
        x,
        y + altura
    );


    ctx.lineTo(
        x,
        y + raio
    );


    ctx.quadraticCurveTo(
        x,
        y,
        x + raio,
        y
    );


    ctx.closePath();

}


// ======================================================
// IMPRESSÃO
// ======================================================

const botaoImprimir =
    document.getElementById(
        "btn-imprimir"
    );


if (botaoImprimir) {

    botaoImprimir.addEventListener(
        "click",
        () => {

            window.print();

        }
    );

}


// ======================================================
// PROTEÇÃO CONTRA HTML INJETADO
// ======================================================

function escaparHTML(valor) {

    const div =
        document.createElement(
            "div"
        );


    div.textContent =
        valor;


    return div.innerHTML;

}


// ======================================================
// INICIALIZAÇÃO
// ======================================================

carregarApadrinhamento();

