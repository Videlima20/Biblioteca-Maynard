ALTER TABLE usuarios ADD COLUMN ativo BOOLEAN NOT NULL DEFAULT TRUE;
-- Confira primeiro SHOW COLUMNS FROM reservas LIKE 'status';
-- Execute a linha seguinte somente se a tabela estiver vazia e não aceitar estes valores.
-- ALTER TABLE reservas MODIFY status ENUM('ativa','cancelada','atendida') NOT NULL DEFAULT 'ativa';
