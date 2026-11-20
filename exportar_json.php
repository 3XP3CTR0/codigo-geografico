
<?php

// Define que a resposta será apresentada em JSON.
header("Content-Type: application/json; charset=UTF-8");

// Liga à base de dados através da ligação já existente.
require_once "conexao.php";

try {

    /*
    |--------------------------------------------------------------------------
    | 1. Configurar as tabelas
    |--------------------------------------------------------------------------
    */

    // Indica as tabelas e os campos utilizados para ordenar os dados.
    $tabelas = [
        "ilhas" => "ilha",
        "concelhos" => "concelho",
        "freguesias" => "freguesia",
        "zonas" => "zona",
        "lugares" => "lugar"
    ];

    /*
    |--------------------------------------------------------------------------
    | 2. Criar a pasta JSON
    |--------------------------------------------------------------------------
    */

    $pastaJSON = __DIR__ . "/json";

    // Se a pasta não existir, será criada automaticamente.
    if (!is_dir($pastaJSON)) {

        if (!mkdir($pastaJSON, 0755, true)) {
            throw new Exception("Não foi possível criar a pasta JSON.");
        }
    }

    /*
    |--------------------------------------------------------------------------
    | 3. Consultar e exportar os dados
    |--------------------------------------------------------------------------
    */

    $resultados = [];

    foreach ($tabelas as $tabela => $campoOrdenacao) {

        // Consultar todos os registos da tabela.
        $sql = "SELECT * FROM `$tabela`
                ORDER BY `$campoOrdenacao` ASC";

        $consulta = $pdo->query($sql);

        $dados = $consulta->fetchAll(PDO::FETCH_ASSOC);

        // Converter os dados para formato JSON.
        $json = json_encode(
            $dados,
            JSON_PRETTY_PRINT |
            JSON_UNESCAPED_UNICODE |
            JSON_UNESCAPED_SLASHES
        );

        if ($json === false) {
            throw new Exception("Erro ao converter a tabela $tabela.");
        }

        // Definir o caminho do ficheiro.
        $caminho = $pastaJSON . "/" . $tabela . ".json";

        // Criar ou atualizar o ficheiro JSON.
        $gravado = file_put_contents(
            $caminho,
            $json,
            LOCK_EX
        );

        if ($gravado === false) {
            throw new Exception("Erro ao guardar $tabela.json.");
        }

        // Guardar informações sobre a exportação.
        $resultados[$tabela] = [
            "ficheiro" => $tabela . ".json",
            "total_registos" => count($dados),
            "estado" => "Exportado com sucesso"
        ];
    }

    /*
    |--------------------------------------------------------------------------
    | 4. Apresentar o resultado
    |--------------------------------------------------------------------------
    */

    echo json_encode([
        "sucesso" => true,
        "mensagem" => "Todos os ficheiros JSON foram gerados com sucesso!",
        "resultados" => $resultados
    ],
    JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

} catch (Throwable $erro) {

    http_response_code(500);

    echo json_encode([
        "sucesso" => false,
        "mensagem" => $erro->getMessage()
    ],
    JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
}

?>
