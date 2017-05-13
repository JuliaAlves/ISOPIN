DELIMITER $$

-- Criação da tabela
CREATE TABLE IF NOT EXISTS interaction_cache (
	locus VARCHAR (11),
	interactions TEXT
);

$$

-- Procedure para limpar todas as linhas do cache relacionadas a uma proteína
-- específica
CREATE PROCEDURE clearCacheForLocus(
  l VARCHAR(11)
)
BEGIN
  DELETE FROM interaction_cache WHERE locus = l OR interactions LIKE CONCAT('%', l, '%');
END;

$$

-- Triggers para limpar o cache de todas as proteínas relacionadas a qualquer 
-- interactoma que seja alterado no banco de dados
CREATE TRIGGER tg_updateCacheForInteractomeOnInsert AFTER INSERT
ON interactome FOR EACH ROW
BEGIN
  CALL clearCacheForLocus(NEW.locusA);
  CALL clearCacheForLocus(NEW.locusB);
END;

CREATE TRIGGER tg_updateCacheForInteractomeOnUpdate AFTER UPDATE
ON interactome FOR EACH ROW
BEGIN
  CALL clearCacheForLocus(OLD.locusA);
  CALL clearCacheForLocus(OLD.locusB);
  CALL clearCacheForLocus(NEW.locusA);
  CALL clearCacheForLocus(NEW.locusB);
END;

CREATE TRIGGER tg_updateCacheForInteractomeOnDelete AFTER DELETE
ON interactome FOR EACH ROW
BEGIN
  CALL clearCacheForLocus(OLD.locusA);
  CALL clearCacheForLocus(OLD.locusB);
END;

$$
