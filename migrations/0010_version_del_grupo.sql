-- Versión del grupo: un número que sube cada vez que cambia algo que la app
-- descarga (nombre, integrantes, fotos, apodos, partidas). Al actualizar, el
-- celular manda la versión que ya tiene; si no cambió, el servidor responde "sin
-- cambios" sin leer ni mandar todas las partidas.
-- Lo suben los disparadores (triggers) de abajo: así ningún cambio se escapa,
-- aunque venga de una parte del código que no se acuerde de subirla.
ALTER TABLE groups ADD COLUMN revision INTEGER NOT NULL DEFAULT 0;

CREATE TRIGGER group_revision_group AFTER UPDATE OF name, admin_member_id, invite_code ON groups
BEGIN
  UPDATE groups SET revision = revision + 1 WHERE id = NEW.id;
END;

CREATE TRIGGER group_revision_member_insert AFTER INSERT ON members
BEGIN
  UPDATE groups SET revision = revision + 1 WHERE id = NEW.group_id;
END;

CREATE TRIGGER group_revision_member_update AFTER UPDATE ON members
BEGIN
  UPDATE groups SET revision = revision + 1 WHERE id IN (OLD.group_id, NEW.group_id);
END;

CREATE TRIGGER group_revision_member_delete AFTER DELETE ON members
BEGIN
  UPDATE groups SET revision = revision + 1 WHERE id = OLD.group_id;
END;

CREATE TRIGGER group_revision_alias_insert AFTER INSERT ON member_aliases
BEGIN
  UPDATE groups SET revision = revision + 1 WHERE id = NEW.group_id;
END;

CREATE TRIGGER group_revision_alias_update AFTER UPDATE ON member_aliases
BEGIN
  UPDATE groups SET revision = revision + 1 WHERE id IN (OLD.group_id, NEW.group_id);
END;

CREATE TRIGGER group_revision_alias_delete AFTER DELETE ON member_aliases
BEGIN
  UPDATE groups SET revision = revision + 1 WHERE id = OLD.group_id;
END;

CREATE TRIGGER group_revision_match_insert AFTER INSERT ON matches
BEGIN
  UPDATE groups SET revision = revision + 1 WHERE id = NEW.group_id;
END;

CREATE TRIGGER group_revision_match_update AFTER UPDATE ON matches
BEGIN
  UPDATE groups SET revision = revision + 1 WHERE id IN (OLD.group_id, NEW.group_id);
END;

CREATE TRIGGER group_revision_match_delete AFTER DELETE ON matches
BEGIN
  UPDATE groups SET revision = revision + 1 WHERE id = OLD.group_id;
END;

CREATE TRIGGER group_revision_player_insert AFTER INSERT ON match_players
BEGIN
  UPDATE groups SET revision = revision + 1
  WHERE id = (SELECT group_id FROM matches WHERE id = NEW.match_id);
END;

CREATE TRIGGER group_revision_player_update AFTER UPDATE ON match_players
BEGIN
  UPDATE groups SET revision = revision + 1
  WHERE id IN (SELECT group_id FROM matches WHERE id IN (OLD.match_id, NEW.match_id));
END;

CREATE TRIGGER group_revision_player_delete AFTER DELETE ON match_players
BEGIN
  UPDATE groups SET revision = revision + 1
  WHERE id = (SELECT group_id FROM matches WHERE id = OLD.match_id);
END;
