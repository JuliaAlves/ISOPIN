DELIMITER $$

-- Criação da tabela
CREATE TABLE IF NOT EXISTS interaction_cache (
	locus VARCHAR (11),
	interactions TEXT
);

$$

-- Trigger para limpar o cache de todas as proteínas relacionadas a qualquer 
-- interactoma que seja alterado no banco de dados
CREATE TRIGGER tg_updateCacheForInteractome AFTER UPDATE ON interactome FOR EACH ROW
BEGIN
	DECLARE interacoes TEXT;
	DECLARE locusAtual VARCHAR(11);
	DECLARE i INT DEFAULT 0;
	DECLARE caractereAtual CHAR;
	DECLARE tamanho INT DEFAULT 0;
    DECLARE done BOOL;
        
	DECLARE cur CURSOR FOR SELECT interactions FROM interaction_cache WHERE locus = OLD.locusA OR locus = OLD.locusB;
	DECLARE CONTINUE HANDLER FOR NOT FOUND SET done := TRUE;
	
    
	OPEN cur;
	interactionsLoop: LOOP
		FETCH cur INTO interacoes;
		
		WHILE i < LEN(interacoes) DO
			SET tamanho = tamanho + 1;
			SET caractereAtual := SUBSTRING(interacoes, i, 1);
			IF caractereAtual = ',' THEN			
				SET locusAtual := SUBSTRING(interacoes, i, tamanho);
				DELETE FROM cache WHERE locus = locusAtual;
				SET tamanho := 0;
			END IF;
			
			SET i := i + 1;
		END WHILE;
		
		IF done THEN
			LEAVE interactionsLoop;
		END IF;
	END LOOP interactionsLoop;
	CLOSE cur;
	
	DELETE FROM cache WHERE locus = OLD.locusA OR locus = OLD.locusB;
END;

$$