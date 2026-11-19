# Execução e manutenção

## 1. Requisitos

### Aplicação local

- Navegador atualizado com suporte a JavaScript e Web Storage.
- Pasta do projeto extraída integralmente.

### API

- Node.js compatível com Express 5.
- npm.
- Servidor MySQL acessível.
- Banco e tabelas criados conforme as consultas e comandos utilizados pela API.

## 2. Iniciar a aplicação local

1. Extraia a pasta `Biblioteca Maynard`.
2. Abra `login.html` no navegador.
3. Entre com uma conta de demonstração ou crie uma conta de leitor.
4. A aplicação cria os dados iniciais automaticamente se não encontrar um esquema local válido.

Os dados são específicos do navegador e do perfil utilizado. Abrir a aplicação em outro navegador não recupera automaticamente os mesmos cadastros.

## 3. Iniciar a API

Dentro do terminal:

```bash
cd "Biblioteca Maynard/api"
npm install
```

Crie `api/.env` com base em `.env.example`, configure a conexão MySQL e execute:

```bash
node server.js
```

Acesse:

```text
http://127.0.0.1:3000/
```

A API verifica a conexão com o MySQL antes de iniciar. Se a conexão falhar, confira host, porta, usuário, senha, nome do banco e disponibilidade do serviço MySQL.

**Importante:** iniciar o servidor não muda automaticamente a persistência da interface. A integração completa das páginas com a API ainda está pendente.

## 4. Backup local

Na interface, entre como administrador e abra a área de administração de dados:

1. Escolha a opção para baixar backup.
2. Armazene o arquivo JSON em local seguro.
3. No computador de destino, abra a aplicação e entre como administrador.
4. Selecione a opção de importar backup.
5. Confira a confirmação: a importação substitui os dados locais atuais.
6. Após a importação, entre novamente com uma conta presente no backup.

O backup contém senhas em texto puro. Não o envie em canais públicos nem o armazene sem proteção.

## 5. Diagnóstico

| Sintoma | Verificação recomendada |
|---|---|
| Catálogo vazio ou dados ausentes | Verifique se o navegador permite armazenamento local e se a inicialização de `data.js` ocorreu. |
| Conta não reconhecida | Confirme se está usando o mesmo navegador/perfil em que a conta foi criada. |
| Dados diferentes em outro computador | O armazenamento local não é compartilhado entre dispositivos; utilize backup e restauração. |
| API não inicia | Verifique Node.js, dependências, porta disponível e conexão MySQL. |
| API informa falha de banco | Confira as variáveis do `.env` e a existência das tabelas esperadas. |
| Imagens não aparecem | Algumas imagens são obtidas de serviços externos e dependem de conexão com a internet. |
| Sessão da API deixa de funcionar após reiniciar Node | As sessões da API são mantidas em memória e são descartadas quando o processo termina. |

## 6. Cuidados para manutenção

- Faça backup antes de alterações estruturais nos dados.
- Atualize a versão do esquema quando modificar a estrutura local.
- Mantenha as validações de integridade na camada de dados.
- Não remova registros que possuam histórico sem uma estratégia de preservação.
- Não publique `.env`, senhas ou backups com dados pessoais.
- Documente e teste qualquer endpoint novo.
- Antes de implantação real, migre a autorização para o servidor e não confie apenas em controles visuais do navegador.

## 7. Testes recomendados

Os seguintes cenários são adequados para validar a aplicação:

1. Login válido e inválido para cada perfil.
2. Cadastro de leitor com e-mail válido, inválido e duplicado.
3. Pesquisa por título, autor e categoria.
4. Cadastro de livro com todos os campos válidos.
5. Tentativa de cadastro com campos obrigatórios inválidos.
6. Edição de livro e atualização dos dados no catálogo.
7. Tentativa de arquivar livro com empréstimo ativo.
8. Empréstimo de livro disponível e tentativa de empréstimo indisponível.
9. Tentativa de ultrapassar o limite de cinco empréstimos ativos.
10. Devolução pelo próprio leitor.
11. Tentativa de devolução de empréstimo de outro leitor.
12. Confirmação de devolução pelo administrador.
13. Verificação de atualização da disponibilidade.
14. Importação de backup válido e rejeição de backup inválido.
15. Verificação do comportamento em telas menores.

Os itens acima são cenários recomendados. A presença deles nesta documentação não significa que exista um relatório de execução de testes aprovado.
