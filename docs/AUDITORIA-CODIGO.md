# Auditoria estática do código — 25/11/2026

## Escopo e limitações

Análise estática do ZIP fornecido. Foram excluídos os arquivos de dependências vendorizadas (`node_modules`) da leitura individual. A sintaxe dos 12 arquivos JavaScript examinados foi verificada com `node --check` e não apresentou erros de sintaxe.

Esta análise não equivale a testes de execução, testes automatizados, avaliação de segurança completa ou verificação em navegador. Não foi possível executar o site em navegador nesta sessão, nem conectar a um MySQL real. Portanto, os itens abaixo são riscos/observações estáticas e cenários de reprodução sugeridos, não bugs confirmados por execução.

## Resultado preliminar

### P0/P1 — bloqueadores

Nenhum bug funcional de prioridade crítica foi confirmado pela análise estática.

### Riscos e observações prioritárias

#### 1. Arquitetura local não sincronizada — impacto alto se expectativa for multiusuário
**Observação:** a interface principal usa Web Storage; a API está separada e não é carregada na página principal. Isso significa que dados de usuários/ empréstimos não são centralizados.

**Como reproduzir:**
1. Abra a aplicação em um navegador.
2. Crie/alterar um dado (por exemplo, livro ou empréstimo).
3. Abra a aplicação em outro navegador ou computador.
4. Compare os dados.

**Resultado esperado no modo local:** dados isolados por navegador/perfil. Se o requisito for sincronização, isso indica integração pendente, não bug no modo local.

#### 2. API e interface não estão integradas
**Observação:** `index.html` e `login.html` não carregam `js/api-client.js`; a interface utiliza `js/db.js` e `js/auth.js`. O adaptador de API no repositório modifica métodos da camada de dados para consulta e somente leitura, mas não está conectado às páginas examinadas.

**Impacto:** a API MySQL não deve ser apresentada como fonte de dados atual da aplicação principal.

#### 3. API local com restrição de host
**Observação:** o servidor escuta em `127.0.0.1` e valida o host da requisição contra a origem local construída a partir da porta configurada.

**Como reproduzir:** executar API e tentar abrir a partir de outro host/IP ou usar host diferente de `127.0.0.1` na URL. O servidor foi intencionalmente configurado para rejeitar esse acesso. Isso é uma restrição de projeto, não necessariamente um defeito.

#### 4. Sessões da API são voláteis
**Observação:** o mapa de sessões está em memória no módulo de contas.

**Como reproduzir:**
1. Iniciar a API.
2. Fazer login por uma rota/API client compatível.
3. Reiniciar o processo Node.
4. Consultar a sessão novamente.

**Resultado:** a sessão anterior não persiste. Isso é documentado como limitação.

#### 5. Script SQL não incluído
**Observação:** a API referencia tabelas e colunas MySQL, mas o pacote não inclui script SQL de criação/versionamento completo.

**Impacto:** a montagem do banco depende de esquema externo ou manual, reduzindo reprodutibilidade.

**Melhoria sugerida:** adicionar script SQL versionado e instruções de inicialização.

#### 6. Backup local inclui senha em texto puro
**Observação:** a versão local usa credenciais de demonstração no armazenamento local e o backup exporta os dados. Conforme informado pela equipe, os dados são intencionalmente fictícios para demonstração.

**Impacto:** risco somente se dados reais ou backup forem expostos. Não utilizar dados pessoais reais, nem publicar backups.

#### 7. API: limitador de tentativas global
**Observação:** o contador de tentativas de cadastro/login é compartilhado entre essas rotas no processo, e não segmentado por conta ou IP. Em execução local, é uma limitação. Se o serviço fosse público, uma pessoa poderia esgotar o limite para outros usuários.

**Melhoria futura:** rate limit por IP e/ou identificador de conta, com proteção adequada a implantação.

#### 8. Rota de sessão sem middleware JSON
**Observação:** `/api/sessao` é uma consulta GET e não exige middleware JSON nem proteção por Origin, o que é normal para esse tipo de endpoint. O cookie de sessão é HttpOnly e SameSite Strict no código observado. Não foi realizada análise completa de CSRF ou segurança de cookies.

## Cenários manuais recomendados

1. Cadastro: campos vazios, nome curto, e-mail inválido e e-mail duplicado.
2. Login: senha errada, usuário inexistente e sessão após reload.
3. Empréstimo: disponibilidade zero, limite de empréstimos e livro arquivado.
4. Devolução: pedido, confirmação, recusa e reabertura de devolução registrada.
5. Gestão: alteração de quantidade abaixo dos empréstimos ativos; arquivamento com histórico.
6. Usuários: tentativa de remover/rebaixar o último administrador e usuário com empréstimo ativo.
7. Backup: arquivo inválido, esquema incorreto, IDs duplicados, referências inválidas e restauração confirmada.
8. Persistência: recarregar, fechar e abrir o navegador e usar outro perfil.
9. Responsividade: 320px, 768px e desktop.
10. API: host permitido e host rejeitado, conexão MySQL ausente, login e cadastro duplicado, reinício de sessão.

## Próxima etapa

Executar os cenários manuais em ambiente de teste e registrar, para cada um, resultado real, captura de tela, versão/commit e se passou ou falhou. Só depois de reproduzir um defeito, classificar como bug confirmado.
