# Inscrições de Atividades Extras

Aplicação React + Express para inscrições e boletins das atividades extras.

## Produção

A imagem Docker compila o frontend e o backend em um único serviço. O Express publica o frontend e a API na porta 3000.

Variáveis:

- `PORT=3000`
- `DB_PATH=/app/data/database.sqlite`
- `FRONTEND_PATH=/app/dist`
- `BOOTSTRAP_ADMIN_EMAIL`: e-mail criado quando ainda n?o existe administrador
- `BOOTSTRAP_ADMIN_PASSWORD`: senha inicial do administrador

O diretório `/app/data` deve usar um volume persistente. O banco SQLite contém dados pessoais e não é versionado no GitHub.

Health check: `/api/health`