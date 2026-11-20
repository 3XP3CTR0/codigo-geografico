
<?php
require_once "conexao.php";

header("Content-Type: application/json; charset=UTF-8");

function responder($dados, $estado = 200)
{
    http_response_code($estado);

    echo json_encode(
        $dados,
        JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
    );

    exit;
}

/*
|--------------------------------------------------------------------------
| Configuração das tabelas permitidas
|--------------------------------------------------------------------------
*/

$tabelas = [
    "ilhas" => [
        "chave" => "id",
        "campos" => ["id", "ilha"],
        "pais" => []
    ],

    "concelhos" => [
        "chave" => "id",
        "campos" => ["id", "concelho", "ilha_id"],
        "pais" => ["ilha_id"]
    ],

    "freguesias" => [
        "chave" => "id",
        "campos" => [
            "id",
            "freguesia",
            "concelho_id",
            "ilha_id"
        ],
        "pais" => ["ilha_id", "concelho_id"]
    ],

    "zonas" => [
        "chave" => "id",
        "campos" => [
            "id",
            "zona",
            "freguesia_id",
            "concelho_id",
            "ilha_id"
        ],
        "pais" => [
            "ilha_id",
            "concelho_id",
            "freguesia_id"
        ]
    ],

    "lugares" => [
        "chave" => "id",
        "campos" => [
            "id",
            "lugar",
            "zona_id",
            "freguesia_id",
            "concelho_id",
            "ilha_id"
        ],
        "pais" => [
            "ilha_id",
            "concelho_id",
            "freguesia_id",
            "zona_id"
        ]
    ]
];

/*
|--------------------------------------------------------------------------
| Receber o pedido
|--------------------------------------------------------------------------
*/

$metodo = $_SERVER["REQUEST_METHOD"];

$dados = json_decode(file_get_contents("php://input"), true);

if ($metodo === "GET") {
    $acao = $_GET["acao"] ?? "listar";
    $tabela = $_GET["tabela"] ?? "";
} else {
    $acao = is_array($dados) ? ($dados["acao"] ?? "") : "";
    $tabela = is_array($dados) ? ($dados["tabela"] ?? "") : "";
}

if (!isset($tabelas[$tabela])) {
    responder([
        "sucesso" => false,
        "mensagem" => "Tabela inválida ou não permitida."
    ], 400);
}

$config = $tabelas[$tabela];
$chave = $config["chave"];
$campos = $config["campos"];

/*
|--------------------------------------------------------------------------
| Campos utilizados para ordenar os registos
|--------------------------------------------------------------------------
*/

$camposOrdenacao = [
    "ilhas" => "ilha",
    "concelhos" => "concelho",
    "freguesias" => "freguesia",
    "zonas" => "zona",
    "lugares" => "lugar"
];

try {

    /*
    |--------------------------------------------------------------------------
    | LISTAR REGISTOS COM FILTROS
    |--------------------------------------------------------------------------
    */

    if ($metodo === "GET" && $acao === "listar") {

        $condicoes = [];
        $valores = [];

        foreach ($config["pais"] as $campo) {
            if (isset($_GET[$campo]) && trim($_GET[$campo]) !== "") {
                $condicoes[] = "`$campo` = :$campo";
                $valores[":$campo"] = trim($_GET[$campo]);
            }
        }

        $sql = "SELECT * FROM `$tabela`";

        if (!empty($condicoes)) {
            $sql .= " WHERE " . implode(" AND ", $condicoes);
        }

        $campoOrdenacao = $camposOrdenacao[$tabela];

        $sql .= " ORDER BY `$campoOrdenacao` ASC";

        $consulta = $pdo->prepare($sql);
        $consulta->execute($valores);

        $registos = $consulta->fetchAll();

        responder([
            "sucesso" => true,
            "total" => count($registos),
            "dados" => $registos
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | CONSULTAR UM REGISTO PELO ID
    |--------------------------------------------------------------------------
    */

    if ($metodo === "GET" && $acao === "consultar") {

        $id = trim($_GET["id"] ?? "");

        if ($id === "") {
            responder([
                "sucesso" => false,
                "mensagem" => "Indica o ID do registo."
            ], 400);
        }

        $consulta = $pdo->prepare(
            "SELECT * FROM `$tabela` WHERE `$chave` = :id"
        );

        $consulta->execute([":id" => $id]);
        $registo = $consulta->fetch();

        if (!$registo) {
            responder([
                "sucesso" => false,
                "mensagem" => "Registo não encontrado."
            ], 404);
        }

        responder([
            "sucesso" => true,
            "dados" => $registo
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | CRIAR REGISTO
    |--------------------------------------------------------------------------
    */

    if ($metodo === "POST" && $acao === "criar") {

        foreach ($campos as $campo) {
            if (
                !array_key_exists($campo, $dados ?? []) ||
                !is_scalar($dados[$campo]) ||
                trim((string) $dados[$campo]) === ""
            ) {
                responder([
                    "sucesso" => false,
                    "mensagem" => "Preenche corretamente todos os campos obrigatórios.",
                    "campo" => $campo
                ], 400);
            }
        }

        $colunas = implode(
            ", ",
            array_map(fn($campo) => "`$campo`", $campos)
        );

        $parametros = implode(
            ", ",
            array_map(fn($campo) => ":$campo", $campos)
        );

        $sql = "INSERT INTO `$tabela` ($colunas) VALUES ($parametros)";

        $valores = [];

        foreach ($campos as $campo) {
            $valores[":$campo"] = trim((string) $dados[$campo]);
        }

        $consulta = $pdo->prepare($sql);
        $consulta->execute($valores);

        responder([
            "sucesso" => true,
            "mensagem" => "Registo adicionado com sucesso!"
        ], 201);
    }

    /*
    |--------------------------------------------------------------------------
    | EDITAR REGISTO
    |--------------------------------------------------------------------------
    */

    if ($metodo === "PUT" && $acao === "editar") {

        $codigo = trim((string) ($dados[$chave] ?? ""));

        if ($codigo === "") {
            responder([
                "sucesso" => false,
                "mensagem" => "Indica o ID do registo."
            ], 400);
        }

        $camposEditar = array_values(array_filter(
            $campos,
            fn($campo) =>
                $campo !== $chave &&
                array_key_exists($campo, $dados ?? [])
        ));

        if (empty($camposEditar)) {
            responder([
                "sucesso" => false,
                "mensagem" => "Não foram indicados campos para editar."
            ], 400);
        }

        $atribuicoes = [];
        $valores = [":codigo" => $codigo];

        foreach ($camposEditar as $campo) {

            if (
                !is_scalar($dados[$campo]) ||
                trim((string) $dados[$campo]) === ""
            ) {
                responder([
                    "sucesso" => false,
                    "mensagem" => "Os campos não podem estar vazios.",
                    "campo" => $campo
                ], 400);
            }

            $atribuicoes[] = "`$campo` = :$campo";
            $valores[":$campo"] = trim((string) $dados[$campo]);
        }

        $sql = "UPDATE `$tabela` SET "
            . implode(", ", $atribuicoes)
            . " WHERE `$chave` = :codigo";

        $consulta = $pdo->prepare($sql);
        $consulta->execute($valores);

        if ($consulta->rowCount() === 0) {
            $verificar = $pdo->prepare(
                "SELECT 1 FROM `$tabela` WHERE `$chave` = :codigo"
            );

            $verificar->execute([":codigo" => $codigo]);

            if (!$verificar->fetchColumn()) {
                responder([
                    "sucesso" => false,
                    "mensagem" => "Registo não encontrado."
                ], 404);
            }
        }

        responder([
            "sucesso" => true,
            "mensagem" => "Registo atualizado com sucesso."
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | ELIMINAR REGISTO
    |--------------------------------------------------------------------------
    */

    if ($metodo === "DELETE" && $acao === "eliminar") {

        $codigo = trim((string) ($dados[$chave] ?? ""));

        if ($codigo === "") {
            responder([
                "sucesso" => false,
                "mensagem" => "Indica o ID do registo."
            ], 400);
        }

        /*
        |--------------------------------------------------------------------------
        | VERIFICAR REGISTOS DEPENDENTES
        |--------------------------------------------------------------------------
        */

        // Define as relações entre cada tabela e a sua subcategoria.
        $dependencias = [
            "ilhas" => [
                "tabela" => "concelhos",
                "campo" => "ilha_id",
                "nome" => "concelhos"
            ],

            "concelhos" => [
                "tabela" => "freguesias",
                "campo" => "concelho_id",
                "nome" => "freguesias"
            ],

            "freguesias" => [
                "tabela" => "zonas",
                "campo" => "freguesia_id",
                "nome" => "zonas"
            ],

            "zonas" => [
                "tabela" => "lugares",
                "campo" => "zona_id",
                "nome" => "lugares"
            ]
        ];

        // Verifica se a tabela atual possui uma subcategoria.
        if (isset($dependencias[$tabela])) {

            $dependencia = $dependencias[$tabela];

            $sql = "SELECT COUNT(*) FROM `{$dependencia['tabela']}`
                    WHERE `{$dependencia['campo']}` = :codigo";

            $verificar = $pdo->prepare($sql);

            $verificar->execute([
                ":codigo" => $codigo
            ]);

            $total = (int) $verificar->fetchColumn();

            // Se existirem registos dependentes, impede a eliminação.
            if ($total > 0) {

                responder([
                    "sucesso" => false,
                    "mensagem" => "Não é possível eliminar este registo porque existem "
                        . $total . " registos dependentes ("
                        . $dependencia["nome"]
                        . ") associados. Elimina ou transfere primeiro esses registos."
                ], 409);
            }
        }

        /*
        |--------------------------------------------------------------------------
        | ELIMINAR REGISTO
        |--------------------------------------------------------------------------
        */

        // Só chega aqui se não existirem dependências.
        $consulta = $pdo->prepare(
            "DELETE FROM `$tabela` WHERE `$chave` = :codigo"
        );

        $consulta->execute([":codigo" => $codigo]);

        if ($consulta->rowCount() === 0) {
            responder([
                "sucesso" => false,
                "mensagem" => "Registo não encontrado."
            ], 404);
        }

        responder([
            "sucesso" => true,
            "mensagem" => "Registo eliminado com sucesso."
        ]);
    }

  

    responder([
        "sucesso" => false,
        "mensagem" => "Operação inválida para este método HTTP."
    ], 405);

} catch (PDOException $erro) {

    if ($erro->getCode() === "23000") {
        responder([
            "sucesso" => false,
            "mensagem" => "O ID indicado já existe ou existe um problema de integridade dos dados."
        ], 409);
    }

    responder([
        "sucesso" => false,
        "mensagem" => "Ocorreu um erro ao executar a operação na base de dados."
    ], 500);

} catch (Throwable $erro) {

    responder([
        "sucesso" => false,
        "mensagem" => "Ocorreu um erro interno no servidor."
    ], 500);
}