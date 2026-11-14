
<?php

$servidor = "localhost";
$utilizador = "root";
$senha = "";
$baseDados = "codigo_geografico_cv";

try {
    $pdo = new PDO(
        "mysql:host=$servidor;dbname=$baseDados;charset=utf8mb4",
        $utilizador,
        $senha
    );

    $pdo->setAttribute(
        PDO::ATTR_ERRMODE,
        PDO::ERRMODE_EXCEPTION
    );

    $pdo->setAttribute(
        PDO::ATTR_DEFAULT_FETCH_MODE,
        PDO::FETCH_ASSOC
    );

} catch (PDOException $erro) {
    die("Erro na ligação à base de dados: " . $erro->getMessage());
}
?>
