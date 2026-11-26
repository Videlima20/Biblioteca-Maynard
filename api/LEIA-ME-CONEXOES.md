# Conexões remotas — Biblioteca Maynard

## 1. Certificado CA do Aiven

Baixe o certificado CA da instância MySQL no painel Aiven e salve o arquivo original em `api/certs/ca.pem`. Não publique o certificado no GitHub. O `.gitignore` da API ignora arquivos `.pem`.

## 2. Variáveis de ambiente

Crie/edite `api/.env` usando `api/.env.example` como referência. Preencha os valores reais localmente. `DB_SSL_CA=./certs/ca.pem` aponta para o certificado dentro de `api/certs/`.

No Atlas, a URI deve incluir o usuário e senha do Database Access e o nome do banco pode ser definido em `MONGODB_DB`. Se a senha tiver caracteres especiais, faça o percent-encoding deles na URI.

## 3. Instalar dependências

No terminal, entre em `Biblioteca-Maynard/api` e execute:

```bash
npm install
```

Isso instalará o driver oficial `mongodb` e atualizará o `package-lock.json` do projeto.

## 4. Testar as duas conexões

Com o Aiven e o Atlas permitindo o IP público de onde a API está sendo executada, rode:

```bash
npm run test:db
```

O teste deve mostrar uma confirmação para MySQL e outra para MongoDB. Não compartilhe o `.env`, URIs, senhas ou certificados privados.

## 5. Iniciar a API

```bash
npm start
```

A API só inicia depois que os dois bancos responderem. Nesta etapa, o servidor continua vinculado a `127.0.0.1` para desenvolvimento local. A publicação da API e a revisão de host/origem serão feitas em uma etapa posterior.
