# Execução e manutenção

## Aplicação local

1. Baixe ou clone o repositório.
2. Abra `login.html` em um navegador moderno.
3. Use uma conta de demonstração ou crie uma conta.
4. Os dados são mantidos no navegador/perfil utilizado.

Não se trata de uma aplicação sincronizada entre dispositivos.

## API (componente independente)

Requisitos: Node.js, npm e MySQL configurado com as tabelas esperadas.

```bash
cd api
npm install
```

Crie `api/.env` localmente e configure conexão e porta. Não versionar esse arquivo.

```bash
node server.js
```

O servidor usa por padrão a porta 3000 e escuta em `127.0.0.1`. A API exige conexão MySQL válida antes de iniciar. O servidor não ativa automaticamente a integração MySQL da interface local.

## Backup/restauração local

1. Faça login como administrador.
2. Acesse a área administrativa de dados.
3. Exporte o backup JSON.
4. Guarde o arquivo de maneira privada.
5. Na instalação destino, importe o arquivo conforme a confirmação exibida.

A restauração substitui dados locais. O backup contém senhas em texto puro de contas locais de demonstração; não o compartilhe publicamente.

## Diagnóstico

| Sintoma | Verificação |
|---|---|
| Dados ausentes | Verifique navegador, perfil e Web Storage. |
| Dados não aparecem em outro computador | Dados locais não são sincronizados; utilize backup/restauração. |
| API não inicia | Verifique Node, dependências, porta e conexão MySQL. |
| API falha nas consultas | Verifique `.env` e tabelas. |
| Sessão API perdida | Sessões em memória são descartadas quando o processo reinicia. |
| Imagens externas não carregam | Verifique internet e serviços externos. |

## Manutenção

- Faça backup antes de mudanças estruturais.
- Teste migrações em uma cópia.
- Preserve histórico de empréstimos.
- Não publique `.env`, dados de usuário ou backup.
- Registre alterações e cenários de teste.
- Para uso real, migre autorização e persistência para o backend, com revisão de segurança.
