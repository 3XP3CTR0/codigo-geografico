const API_URL = "api.php";

/* =========================================================
   1. CONFIGURAÇÃO DAS TABELAS
   Define os campos e as informações de cada tabela.
========================================================= */

const configuracaoTabelas = {
    ilhas: {
        titulo: "Ilhas",
        descricao: "Consulta e gestão das ilhas de Cabo Verde.",
        chave: "id",
        campos: ["id", "ilha"]
    },

    concelhos: {
        titulo: "Concelhos",
        descricao: "Concelhos associados às ilhas.",
        chave: "id",
        campos: ["id", "concelho", "ilha_id"]
    },

    freguesias: {
        titulo: "Freguesias",
        descricao: "Freguesias associadas aos concelhos.",
        chave: "id",
        campos: ["id", "freguesia", "concelho_id", "ilha_id"]
    },

    zonas: {
        titulo: "Zonas",
        descricao: "Zonas associadas às freguesias.",
        chave: "id",
        campos: ["id", "zona", "freguesia_id", "concelho_id", "ilha_id"]
    },

    lugares: {
        titulo: "Lugares",
        descricao: "Lugares associados às zonas.",
        chave: "id",
        campos: ["id", "lugar", "zona_id", "freguesia_id", "concelho_id", "ilha_id"]
    }
};

// Nomes apresentados na interface para cada campo da base de dados.
const nomesCampos = {
    id: "ID",
    ilha: "Ilha",
    concelho: "Concelho",
    freguesia: "Freguesia",
    zona: "Zona",
    lugar: "Lugar",
    ilha_id: "ID da ilha",
    concelho_id: "ID do concelho",
    freguesia_id: "ID da freguesia",
    zona_id: "ID da zona"
};

// Indica a tabela relacionada com cada campo de relacionamento.
const tabelasRelacionadas = {
    ilha_id: "ilhas",
    concelho_id: "concelhos",
    freguesia_id: "freguesias",
    zona_id: "zonas"
};

// Textos iniciais apresentados nos filtros.
const nomesFiltros = {
    "filtro-ilha": "Todas as ilhas",
    "filtro-concelho": "Todos os concelhos",
    "filtro-freguesia": "Todas as freguesias",
    "filtro-localidade": "Todas as zonas",
    "filtro-lugar": "Todos os lugares"
};


/* =========================================================
   2. ELEMENTOS HTML
   Guarda referências aos elementos utilizados pelo JavaScript.
========================================================= */

const elementos = {
    titulo: document.getElementById("titulo-tabela"),
    descricao: document.getElementById("descricao-tabela"),
    total: document.getElementById("total-registos"),
    nomeTabela: document.getElementById("nome-tabela-cartao"),
    cabecalho: document.getElementById("cabecalho-tabela"),
    corpo: document.getElementById("corpo-tabela"),
    pesquisa: document.getElementById("pesquisa"),
    contador: document.getElementById("contador-resultados"),
    mensagem: document.getElementById("mensagem"),
    atualizar: document.getElementById("btn-atualizar"),
    adicionar: document.getElementById("btn-adicionar"),
    modal: document.getElementById("modal"),
    modalTitulo: document.getElementById("modal-titulo"),
    modalDescricao: document.getElementById("modal-descricao"),
    formulario: document.getElementById("form-registo"),
    camposFormulario: document.getElementById("campos-formulario"),
    guardar: document.getElementById("btn-guardar"),
    fechar: document.getElementById("btn-fechar"),
    cancelar: document.getElementById("btn-cancelar"),
    filtroIlha: document.getElementById("filtro-ilha"),
    filtroConcelho: document.getElementById("filtro-concelho"),
    filtroFreguesia: document.getElementById("filtro-freguesia"),
    filtroLocalidade: document.getElementById("filtro-localidade"),
    filtroLugar: document.getElementById("filtro-lugar"),
    limparFiltros: document.getElementById("btn-limpar-filtros")
};

// Variáveis que guardam o estado atual da aplicação.
let tabelaAtual = "ilhas";
let registosAtuais = [];
let modoFormulario = "criar";
let dadosRelacionados = {};


/* =========================================================
   3. COMUNICAÇÃO COM A API
   Funções responsáveis por enviar e receber dados do PHP.
========================================================= */

// Faz pedidos à API e verifica se a resposta é válida.
async function pedirAPI(url, opcoes = {}) {
    const resposta = await fetch(url, opcoes);
    let resultado;

    try {
        resultado = await resposta.json();
    } catch {
        throw new Error("A API não devolveu uma resposta JSON válida.");
    }

    if (!resposta.ok || resultado.sucesso === false) {
        throw new Error(resultado.mensagem || "Ocorreu um erro na operação.");
    }

    return resultado;
}

// Cria o endereço da API com a tabela e os filtros selecionados.
function criarURL(tabela, filtros = {}) {
    const parametros = new URLSearchParams({
        tabela,
        acao: "listar"
    });

    for (const [campo, valor] of Object.entries(filtros)) {
        if (valor !== "" && valor !== null && valor !== undefined) {
            parametros.set(campo, valor);
        }
    }

    return `${API_URL}?${parametros.toString()}`;
}

// Consulta os registos de uma tabela.
async function listarRegistos(tabela, filtros = {}) {
    const resultado = await pedirAPI(criarURL(tabela, filtros));
    return resultado.dados || [];
}

// Prepara os dados para enviar à API em formato JSON.
function opcoesJSON(dados, metodo = "POST") {
    return {
        method: metodo,
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(dados)
    };
}


/* =========================================================
   4. MENSAGENS
   Apresenta mensagens de sucesso ou de erro na interface.
========================================================= */

// Mostra uma mensagem na página.
function mostrarMensagem(texto, tipo = "sucesso") {
    elementos.mensagem.textContent = texto;
    elementos.mensagem.className = `mensagem ${tipo}`;
    elementos.mensagem.style.display = "block";
}

// Esconde e limpa a mensagem apresentada.
function limparMensagem() {
    elementos.mensagem.textContent = "";
    elementos.mensagem.className = "mensagem";
    elementos.mensagem.style.display = "none";
}


/* =========================================================
   5. FILTROS GEOGRÁFICOS
   Permite filtrar os registos pela hierarquia geográfica.
========================================================= */

// Obtém os valores atualmente selecionados nos filtros.
function obterFiltrosSelecionados() {
    return {
        ilha_id: elementos.filtroIlha.value,
        concelho_id: elementos.filtroConcelho.value,
        freguesia_id: elementos.filtroFreguesia.value,
        zona_id: elementos.filtroLocalidade.value
    };
}

// Define quais os filtros aplicáveis a cada tabela.
const filtrosPorTabela = {
    ilhas: [],
    concelhos: ["ilha_id"],
    freguesias: ["ilha_id", "concelho_id"],
    zonas: ["ilha_id", "concelho_id", "freguesia_id"],
    lugares: ["ilha_id", "concelho_id", "freguesia_id", "zona_id"]
};

// Obtém apenas os filtros necessários para determinada tabela.
function filtrosAplicaveis(tabela) {
    const selecionados = obterFiltrosSelecionados();

    return Object.fromEntries(
        filtrosPorTabela[tabela]
            .filter(campo => selecionados[campo])
            .map(campo => [campo, selecionados[campo]])
    );
}

// Preenche um elemento select com os registos recebidos.
function definirOpcoes(select, registos, textoInicial, campoNome) {
    const valorAnterior = select.value;

    const opcoes = [
        new Option(textoInicial, ""),
        ...registos.map(registo => new Option(registo[campoNome], registo.id))
    ];

    select.replaceChildren(...opcoes);

    // Mantém a seleção anterior, se ainda existir.
    select.value = registos.some(registo =>
        String(registo.id) === String(valorAnterior)
    ) ? valorAnterior : "";

    // Desativa o filtro quando não existem opções.
    select.disabled = registos.length === 0;
}

// Função genérica para carregar qualquer filtro.
// Evita repetir o mesmo código em cada função de carregamento.
async function carregarFiltro(select, tabela, campoNome, filtros = {}, textoInicial) {
    const registos = Object.keys(filtros).every(campo => filtros[campo])
        ? await listarRegistos(tabela, filtros)
        : [];

    definirOpcoes(select, registos, textoInicial, campoNome);
}

// Carrega as ilhas disponíveis.
async function carregarIlhasFiltro() {
    await carregarFiltro(
        elementos.filtroIlha,
        "ilhas",
        "ilha",
        {},
        nomesFiltros["filtro-ilha"]
    );
}

// Carrega os concelhos pertencentes à ilha selecionada.
async function carregarConcelhosFiltro() {
    await carregarFiltro(
        elementos.filtroConcelho,
        "concelhos",
        "concelho",
        { ilha_id: elementos.filtroIlha.value },
        nomesFiltros["filtro-concelho"]
    );
}

// Carrega as freguesias pertencentes ao concelho e à ilha selecionados.
async function carregarFreguesiasFiltro() {
    await carregarFiltro(
        elementos.filtroFreguesia,
        "freguesias",
        "freguesia",
        {
            ilha_id: elementos.filtroIlha.value,
            concelho_id: elementos.filtroConcelho.value
        },
        nomesFiltros["filtro-freguesia"]
    );
}

// Carrega as zonas pertencentes à freguesia selecionada.
async function carregarLocalidadesFiltro() {
    const filtros = {
        ilha_id: elementos.filtroIlha.value,
        concelho_id: elementos.filtroConcelho.value,
        freguesia_id: elementos.filtroFreguesia.value
    };

    await carregarFiltro(
        elementos.filtroLocalidade,
        "zonas",
        "zona",
        filtros,
        Object.values(filtros).every(Boolean)
            ? nomesFiltros["filtro-localidade"]
            : "Seleciona primeiro uma ilha, um concelho e uma freguesia"
    );
}

// Carrega os lugares pertencentes à zona selecionada.
async function carregarLugaresFiltro() {
    await carregarFiltro(
        elementos.filtroLugar,
        "lugares",
        "lugar",
        filtrosAplicaveis("lugares"),
        elementos.filtroLocalidade.value
            ? nomesFiltros["filtro-lugar"]
            : "Seleciona primeiro uma zona"
    );
}
/* =========================================================
   6. VISIBILIDADE DOS FILTROS
   Mostra apenas os filtros necessários para cada tabela.
========================================================= */

function atualizarVisibilidadeFiltros() {

    // Define os filtros que devem aparecer em cada tabela.
    const camposPorTabela = {
        ilhas: [],
        concelhos: ["filtro-ilha"],
        freguesias: ["filtro-ilha", "filtro-concelho"],
        zonas: [
            "filtro-ilha",
            "filtro-concelho",
            "filtro-freguesia"
        ],
        lugares: [
            "filtro-ilha",
            "filtro-concelho",
            "filtro-freguesia",
            "filtro-localidade",
            "filtro-lugar"
        ]
    };

    // Percorre todos os campos de filtro existentes no HTML.
    document.querySelectorAll(".campo-filtro").forEach(campo => {
        const select = campo.querySelector("select");

        if (select) {
            campo.style.display =
                camposPorTabela[tabelaAtual].includes(select.id)
                    ? ""
                    : "none";
        }
    });

    // O botão de limpar filtros só aparece quando existem filtros.
    elementos.limparFiltros.style.display =
        camposPorTabela[tabelaAtual].length > 0 ? "" : "none";
}


/* =========================================================
   7. ATUALIZAÇÃO DOS FILTROS
   Atualiza os menus dependentes quando uma seleção muda.
========================================================= */

// Atualiza todos os filtros pela ordem da hierarquia geográfica.
async function atualizarTodosOsFiltros() {
    await carregarConcelhosFiltro();
    await carregarFreguesiasFiltro();
    await carregarLocalidadesFiltro();
    await carregarLugaresFiltro();
}

// Executada quando o utilizador muda a ilha.
async function aoMudarIlha() {
    try {
        // Limpa as seleções que dependem da ilha.
        elementos.filtroConcelho.value = "";
        elementos.filtroFreguesia.value = "";
        elementos.filtroLocalidade.value = "";
        elementos.filtroLugar.value = "";

        await atualizarTodosOsFiltros();
        await carregarRegistos();

    } catch (erro) {
        mostrarMensagem(erro.message, "erro");
    }
}

// Executada quando o utilizador muda o concelho.
async function aoMudarConcelho() {
    try {
        // Limpa as seleções dependentes do concelho.
        elementos.filtroFreguesia.value = "";
        elementos.filtroLocalidade.value = "";
        elementos.filtroLugar.value = "";

        await carregarFreguesiasFiltro();
        await carregarLocalidadesFiltro();
        await carregarLugaresFiltro();
        await carregarRegistos();

    } catch (erro) {
        mostrarMensagem(erro.message, "erro");
    }
}

// Executada quando o utilizador muda a freguesia.
async function aoMudarFreguesia() {
    try {
        elementos.filtroLocalidade.value = "";
        elementos.filtroLugar.value = "";

        await carregarLocalidadesFiltro();
        await carregarLugaresFiltro();
        await carregarRegistos();

    } catch (erro) {
        mostrarMensagem(erro.message, "erro");
    }
}

// Executada quando o utilizador muda a zona.
async function aoMudarLocalidade() {
    try {
        elementos.filtroLugar.value = "";

        await carregarLugaresFiltro();
        await carregarRegistos();

    } catch (erro) {
        mostrarMensagem(erro.message, "erro");
    }
}

// Limpa todos os filtros e a pesquisa.
async function limparTodosOsFiltros() {

    elementos.filtroIlha.value = "";
    elementos.filtroConcelho.value = "";
    elementos.filtroFreguesia.value = "";
    elementos.filtroLocalidade.value = "";
    elementos.filtroLugar.value = "";
    elementos.pesquisa.value = "";

    try {
        await atualizarTodosOsFiltros();
        await carregarRegistos();

    } catch (erro) {
        mostrarMensagem(erro.message, "erro");
    }
}


/* =========================================================
   8. CARREGAR E MOSTRAR REGISTOS
   Consulta os dados da tabela selecionada e apresenta-os.
========================================================= */

async function carregarRegistos() {

    limparMensagem();

    // Obtém os filtros aplicáveis à tabela atual.
    const filtros = filtrosAplicaveis(tabelaAtual);

    // Define os filtros obrigatórios para consultar zonas e lugares.
    const filtrosObrigatorios = {
        zonas: ["ilha_id", "concelho_id", "freguesia_id"],
        lugares: ["ilha_id", "concelho_id", "freguesia_id", "zona_id"]
    };

    // Verifica se ainda falta selecionar algum filtro obrigatório.
    const camposEmFalta = (filtrosObrigatorios[tabelaAtual] || [])
        .filter(campo => !filtros[campo]);

    if (camposEmFalta.length) {

        const configuracao = configuracaoTabelas[tabelaAtual];

        const mensagem = tabelaAtual === "zonas"
            ? "Seleciona uma ilha, um concelho e uma freguesia para consultar as zonas."
            : "Seleciona uma ilha, um concelho, uma freguesia e uma zona para consultar os lugares.";

        // Limpa os registos anteriores.
        registosAtuais = [];
        elementos.total.textContent = "—";
        elementos.contador.textContent = mensagem;

        elementos.cabecalho.replaceChildren();
        elementos.corpo.replaceChildren();

        // Apresenta uma mensagem dentro da tabela.
        const linha = document.createElement("tr");
        const celula = document.createElement("td");

        celula.colSpan = configuracao.campos.length + 1;
        celula.className = "vazio";
        celula.textContent = mensagem;

        linha.appendChild(celula);
        elementos.corpo.appendChild(linha);

        return;
    }

    try {

        // Obtém os registos através da API.
        registosAtuais = await listarRegistos(tabelaAtual, filtros);

        // Se estiver selecionado um lugar específico,
        // apresenta apenas esse lugar.
        if (tabelaAtual === "lugares" && elementos.filtroLugar.value) {

            registosAtuais = registosAtuais.filter(registo =>
                String(registo.id) === String(elementos.filtroLugar.value)
            );
        }

        // Atualiza o total e apresenta os resultados.
        elementos.total.textContent = registosAtuais.length;

        renderizarTabela();

    } catch (erro) {

        registosAtuais = [];
        elementos.total.textContent = "—";
        elementos.contador.textContent =
            "Não foi possível carregar os registos.";

        mostrarMensagem(erro.message, "erro");
    }
}


/* =========================================================
   9. RENDERIZAR TABELA
   Cria dinamicamente o cabeçalho, os registos e as ações.
========================================================= */

function renderizarTabela() {

    const configuracao = configuracaoTabelas[tabelaAtual];

    // Obtém o texto escrito na caixa de pesquisa.
    const pesquisa = elementos.pesquisa.value.trim().toLowerCase();

    // Filtra os registos que correspondem à pesquisa.
    const registosFiltrados = registosAtuais.filter(registo =>
        configuracao.campos.some(campo =>
            String(registo[campo] ?? "").toLowerCase().includes(pesquisa)
        )
    );

    // Limpa o conteúdo anterior da tabela.
    elementos.cabecalho.replaceChildren();
    elementos.corpo.replaceChildren();

    // Cria o cabeçalho da tabela.
    const linhaCabecalho = document.createElement("tr");

    for (const campo of configuracao.campos) {

        const th = document.createElement("th");
        th.textContent = nomesCampos[campo] || campo;

        linhaCabecalho.appendChild(th);
    }

    // Adiciona a coluna das ações.
    const thAcoes = document.createElement("th");
    thAcoes.textContent = "Ações";

    linhaCabecalho.appendChild(thAcoes);
    elementos.cabecalho.appendChild(linhaCabecalho);

    // Verifica se existem resultados.
    if (registosFiltrados.length === 0) {

        const linha = document.createElement("tr");
        const celula = document.createElement("td");

        celula.colSpan = configuracao.campos.length + 1;
        celula.className = "vazio";
        celula.textContent = "Não foram encontrados registos.";

        linha.appendChild(celula);
        elementos.corpo.appendChild(linha);

    } else {

        // Cria uma linha para cada registo encontrado.
        for (const registo of registosFiltrados) {

            const linha = document.createElement("tr");

            // Apresenta os valores de cada campo.
            for (const campo of configuracao.campos) {

                const celula = document.createElement("td");
                celula.textContent = registo[campo] ?? "";

                linha.appendChild(celula);
            }

            // Cria a coluna das ações.
            const celulaAcoes = document.createElement("td");
            celulaAcoes.className = "acoes";

            // Botão para editar o registo.
            const botaoEditar = document.createElement("button");

            botaoEditar.type = "button";
            botaoEditar.className = "botao-acao";
            botaoEditar.textContent = "Editar";

            botaoEditar.addEventListener("click", () =>
                abrirFormulario("editar", registo)
            );

            // Botão para eliminar o registo.
            const botaoEliminar = document.createElement("button");

            botaoEliminar.type = "button";
            botaoEliminar.className = "botao-acao botao-eliminar";
            botaoEliminar.textContent = "Eliminar";

            botaoEliminar.addEventListener("click", () =>
                eliminarRegisto(registo)
            );

            // Adiciona os botões à linha.
            celulaAcoes.append(botaoEditar, botaoEliminar);
            linha.appendChild(celulaAcoes);

            elementos.corpo.appendChild(linha);
        }
    }

    // Atualiza o número de resultados apresentados.
    elementos.contador.textContent =
        `${registosFiltrados.length} registo(s) apresentado(s)`;

    // Atualiza a informação de paginação, caso exista no HTML.
    const paginaInfo = document.getElementById("pagina-info");

    if (paginaInfo) {
        paginaInfo.textContent =
            `A mostrar ${registosFiltrados.length} de ${registosAtuais.length} registo(s)`;
    }
}

/* =========================================================
   10. MUDAR DE TABELA
   Permite navegar entre as diferentes tabelas da aplicação.
========================================================= */

async function selecionarTabela(tabela) {

    // Verifica se a tabela existe na configuração.
    if (!configuracaoTabelas[tabela]) return;

    tabelaAtual = tabela;

    // Atualiza o botão ativo no menu lateral.
    document.querySelectorAll(".item-menu").forEach(botao => {
        botao.classList.toggle(
            "ativo",
            botao.dataset.tabela === tabela
        );
    });

    const configuracao = configuracaoTabelas[tabela];

    // Atualiza os títulos e a descrição da página.
    elementos.titulo.textContent = configuracao.titulo;
    elementos.descricao.textContent = configuracao.descricao;
    elementos.nomeTabela.textContent = configuracao.titulo;

    // Limpa a pesquisa anterior.
    elementos.pesquisa.value = "";

    // Atualiza os filtros e carrega os registos.
    atualizarVisibilidadeFiltros();
    await carregarRegistos();
}


/* =========================================================
   11. FORMULÁRIOS CRUD
   Cria os campos necessários para adicionar e editar registos.
========================================================= */

// Indica o campo que contém o nome principal de cada tabela.
const campoNomeTabelas = {
    ilhas: "ilha",
    concelhos: "concelho",
    freguesias: "freguesia",
    zonas: "zona",
    lugares: "lugar"
};


// Carrega os dados das tabelas relacionadas.
// Estes dados serão utilizados nos menus de seleção dos formulários.
async function carregarRelacionamentos() {

    const tabelas = ["ilhas", "concelhos", "freguesias", "zonas"];

    for (const tabela of tabelas) {
        dadosRelacionados[tabela] = await listarRegistos(tabela);
    }
}


/* =========================================================
   12. CRIAR CAMPOS DO FORMULÁRIO
   Gera automaticamente os campos conforme a tabela selecionada.
========================================================= */

function criarCampo(campo, registo = null) {

    const configuracao = configuracaoTabelas[tabelaAtual];
    const chave = configuracao.chave;

    // Cria o contentor do campo.
    const grupo = document.createElement("div");
    grupo.className = "campo";

    // Cria a etiqueta do campo.
    const label = document.createElement("label");
    label.htmlFor = `campo-${campo}`;
    label.textContent = nomesCampos[campo] || campo;

    let input;

    // Verifica se o campo corresponde ao nome de um registo.
    if (campoNomeTabelas[tabelaAtual] === campo) {

        // Cria uma caixa de texto.
        input = document.createElement("input");
        input.type = "text";
        input.required = true;
        input.placeholder = "Introduz o nome";

    // Verifica se o campo corresponde à chave primária.
    } else if (campo === chave) {

        // Cria uma caixa numérica para introduzir o ID.
        input = document.createElement("input");
        input.type = "number";
        input.required = true;
        input.min = "1";
        input.step = "1";
        input.placeholder = "Introduz o ID";

        // Durante a edição, o ID não pode ser alterado.
        if (modoFormulario === "editar") {
            input.readOnly = true;
        }

    } else {

        // Os restantes campos são relacionamentos.
        // Por isso, são apresentados através de menus de seleção.
        input = document.createElement("select");
        input.required = true;

        const opcaoInicial = new Option(
            "Seleciona uma opção",
            ""
        );

        input.appendChild(opcaoInicial);

        // Obtém a tabela relacionada com o campo.
        const tabelaRelacionada = tabelasRelacionadas[campo];

        const registos = dadosRelacionados[tabelaRelacionada] || [];
        const campoNome = campoNomeTabelas[tabelaRelacionada];

        // Cria uma opção para cada registo relacionado.
        for (const item of registos) {

            const opcao = new Option(
                `${item[campoNome]} (${item.id})`,
                item.id
            );

            input.appendChild(opcao);
        }
    }

    // Define os atributos comuns do campo.
    input.id = `campo-${campo}`;
    input.name = campo;

    // Preenche o campo com os dados existentes, se estiver a editar.
    if (registo && registo[campo] !== undefined) {
        input.value = registo[campo];
    }

    grupo.append(label, input);

    return grupo;
}


/* =========================================================
   13. ABRIR FORMULÁRIO
   Prepara o formulário para adicionar ou editar um registo.
========================================================= */

async function abrirFormulario(modo, registo = null) {

    modoFormulario = modo;

    try {

        // Carrega os dados necessários para os menus de seleção.
        await carregarRelacionamentos();

        // Limpa os campos anteriores.
        elementos.camposFormulario.replaceChildren();

        const configuracao = configuracaoTabelas[tabelaAtual];

        // Define o título do formulário.
        elementos.modalTitulo.textContent =
            modo === "criar"
                ? "Adicionar registo"
                : "Editar registo";

        // Define a descrição do formulário.
        elementos.modalDescricao.textContent =
            modo === "criar"
                ? "Preenche os campos para guardar o registo."
                : "Altera os dados pretendidos.";

        // Cria os campos definidos para a tabela atual.
        for (const campo of configuracao.campos) {

            elementos.camposFormulario.appendChild(
                criarCampo(campo, registo)
            );
        }

        // Mostra a janela do formulário.
        elementos.modal.hidden = false;

        // Atualiza as opções dos campos relacionados.
        atualizarCamposDependentesFormulario();

    } catch (erro) {
        mostrarMensagem(erro.message, "erro");
    }
}


/* =========================================================
   14. CAMPOS DEPENDENTES DO FORMULÁRIO
   Filtra os menus conforme as opções anteriormente selecionadas.
========================================================= */

function atualizarCamposDependentesFormulario() {

    const ilha = document.getElementById("campo-ilha_id");
    const concelho = document.getElementById("campo-concelho_id");
    const freguesia = document.getElementById("campo-freguesia_id");
    const zona = document.getElementById("campo-zona_id");

    // Filtra as opções de um menu conforme os relacionamentos.
    function filtrar(select, tabela, condicoes) {

        if (!(select instanceof HTMLSelectElement)) return;

        const valorAnterior = select.value;

        const registos = (dadosRelacionados[tabela] || []).filter(registo =>
            Object.entries(condicoes).every(([campo, valor]) =>
                !valor || String(registo[campo]) === String(valor)
            )
        );

        const textoInicial =
            select.options[0]?.textContent || "Seleciona uma opção";

        const campoNome = campoNomeTabelas[tabela];

        definirOpcoes(
            select,
            registos,
            textoInicial,
            campoNome
        );

        // Mantém a opção anterior caso continue válida.
        if (registos.some(registo =>
            String(registo.id) === String(valorAnterior)
        )) {
            select.value = valorAnterior;
        }
    }

    // Os concelhos dependem da ilha selecionada.
    filtrar(concelho, "concelhos", {
        ilha_id: ilha?.value
    });

    // As freguesias dependem da ilha e do concelho.
    filtrar(freguesia, "freguesias", {
        ilha_id: ilha?.value,
        concelho_id: concelho?.value
    });

    // As zonas dependem da ilha, do concelho e da freguesia.
    filtrar(zona, "zonas", {
        ilha_id: ilha?.value,
        concelho_id: concelho?.value,
        freguesia_id: freguesia?.value
    });
}


/* =========================================================
   15. FECHAR FORMULÁRIO
   Esconde a janela e limpa os campos.
========================================================= */

function fecharFormulario() {

    elementos.modal.hidden = true;

    elementos.formulario.reset();
    elementos.camposFormulario.replaceChildren();
}
/* =========================================================
   16. ADICIONAR E EDITAR REGISTOS
   Envia os dados do formulário para a API.
========================================================= */

elementos.formulario.addEventListener("submit", async evento => {

    // Impede o formulário de atualizar a página.
    evento.preventDefault();

    const configuracao = configuracaoTabelas[tabelaAtual];

    // Prepara os dados que serão enviados para a API.
    const dados = {
        acao: modoFormulario,
        tabela: tabelaAtual
    };

    // Obtém os valores de todos os campos do formulário.
    for (const campo of configuracao.campos) {

        const input = document.getElementById(`campo-${campo}`);

        if (input) {
            dados[campo] = input.value.trim();
        }
    }

    // Impede novos cliques enquanto os dados são enviados.
    elementos.guardar.disabled = true;

    try {

        // Define se a operação será de criação ou edição.
        const criar = modoFormulario === "criar";

        dados.acao = criar ? "criar" : "editar";

        // Envia os dados para a API.
        const resultado = await pedirAPI(
            API_URL,
            opcoesJSON(dados, criar ? "POST" : "PUT")
        );

        // Fecha o formulário e atualiza os dados apresentados.
        fecharFormulario();

        await atualizarTodosOsFiltros();
        await carregarRegistos();

        // Apresenta a mensagem de sucesso.
        mostrarMensagem(
            resultado.mensagem ||
            (criar
                ? "Registo adicionado com sucesso!"
                : "Registo atualizado com sucesso!")
        );

    } catch (erro) {

        mostrarMensagem(erro.message, "erro");

    } finally {

        // Volta a permitir a utilização do botão.
        elementos.guardar.disabled = false;
    }
});


/* =========================================================
   17. ELIMINAR REGISTOS
   Permite eliminar um registo da tabela selecionada.
========================================================= */

async function eliminarRegisto(registo) {

    const configuracao = configuracaoTabelas[tabelaAtual];

    // Obtém o ID e o nome do registo.
    const id = registo[configuracao.chave];
    const campoNome = campoNomeTabelas[tabelaAtual];
    const nome = registo[campoNome];

    // Solicita confirmação antes de eliminar.
    const confirmado = confirm(
        `Tens a certeza de que pretendes eliminar "${nome}"?\n\nID: ${id}`
    );

    if (!confirmado) return;

    try {

        // Envia o pedido de eliminação à API.
        const resultado = await pedirAPI(
            API_URL,
            opcoesJSON({
                acao: "eliminar",
                tabela: tabelaAtual,
                [configuracao.chave]: id
            }, "DELETE")
        );

        // Atualiza os filtros e a tabela.
        await atualizarTodosOsFiltros();
        await carregarRegistos();

        mostrarMensagem(
            resultado.mensagem || "Registo eliminado com sucesso!"
        );

    } catch (erro) {

        mostrarMensagem(erro.message, "erro");
    }
}


/* =========================================================
   18. EVENTOS DOS FILTROS
   Liga os filtros e os botões às respetivas funções.
========================================================= */

// Eventos de alteração dos filtros geográficos.
elementos.filtroIlha.addEventListener("change", aoMudarIlha);
elementos.filtroConcelho.addEventListener("change", aoMudarConcelho);
elementos.filtroFreguesia.addEventListener("change", aoMudarFreguesia);
elementos.filtroLocalidade.addEventListener("change", aoMudarLocalidade);
elementos.filtroLugar.addEventListener("change", carregarRegistos);

// Botão para limpar todos os filtros.
elementos.limparFiltros.addEventListener(
    "click",
    limparTodosOsFiltros
);


/* =========================================================
   19. EVENTOS DA INTERFACE
   Controla os menus, a pesquisa e os formulários.
========================================================= */

// Permite mudar entre as tabelas através do menu lateral.
document.querySelectorAll(".item-menu").forEach(botao => {

    botao.addEventListener("click", () => {
        selecionarTabela(botao.dataset.tabela);
    });
});

// Atualiza a tabela enquanto o utilizador escreve na pesquisa.
elementos.pesquisa.addEventListener("input", renderizarTabela);

// Atualiza os registos através do botão atualizar.
elementos.atualizar.addEventListener("click", carregarRegistos);

// Abre o formulário para adicionar um registo.
elementos.adicionar.addEventListener(
    "click",
    () => abrirFormulario("criar")
);

// Fecha o formulário através dos respetivos botões.
elementos.fechar.addEventListener("click", fecharFormulario);
elementos.cancelar.addEventListener("click", fecharFormulario);

// Fecha o formulário quando se clica fora da sua área.
elementos.modal.addEventListener("click", evento => {

    if (evento.target === elementos.modal) {
        fecharFormulario();
    }
});

// Permite fechar o formulário através da tecla Escape.
document.addEventListener("keydown", evento => {

    if (evento.key === "Escape" && !elementos.modal.hidden) {
        fecharFormulario();
    }
});


/* =========================================================
   20. EVENTOS DOS CAMPOS RELACIONADOS
   Atualiza os menus dependentes dentro dos formulários.
========================================================= */

elementos.camposFormulario.addEventListener("change", evento => {

    // Verifica se foi alterado um dos campos principais.
    if (
        evento.target.matches(
            "#campo-ilha_id, #campo-concelho_id, #campo-freguesia_id"
        )
    ) {

        atualizarCamposDependentesFormulario();
    }
});


/* =========================================================
   21. INICIAR A APLICAÇÃO
   Executa as operações necessárias quando a página abre.
========================================================= */

async function iniciarAplicacao() {

    try {

        // Limpa mensagens anteriores.
        limparMensagem();

        // Carrega as ilhas disponíveis.
        await carregarIlhasFiltro();

        // Atualiza os restantes filtros.
        await atualizarTodosOsFiltros();

        // Mostra os filtros adequados à tabela inicial.
        atualizarVisibilidadeFiltros();

        // Carrega os primeiros registos.
        await carregarRegistos();

    } catch (erro) {

        mostrarMensagem(
            "Não foi possível iniciar a aplicação: " + erro.message,
            "erro"
        );
    }
}

// Executa a inicialização.
iniciarAplicacao();