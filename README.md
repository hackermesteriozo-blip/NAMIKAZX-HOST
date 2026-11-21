# NAMIKAZX HOST

Plataforma web de hospedagem com identidade visual preta e vermelha.

## Recursos incluídos
- Página inicial e catálogo de planos.
- Cadastro e login com senha protegida por hash.
- Área do cliente e histórico de pedidos.
- Painel administrativo com clientes, pedidos e atualização manual de status.
- Banco SQLite criado automaticamente.
- Checkout via Mercado Pago (quando configurado).
- Endpoint inicial de webhook e rota `/health`.

## Requisitos
- Node.js 20 ou superior
- npm
- Windows, Linux ou servidor Node.js

## Rodar no Windows
1. Baixe este repositório pelo botão **Code > Download ZIP** no GitHub e extraia.
2. Abra a pasta extraída.
3. Na barra de endereço do Explorador, digite `cmd` e pressione Enter.
4. Instale as dependências:

   ```bash
   npm install
   ```

5. Faça uma cópia de `.env.example` com o nome `.env`.
6. Edite `.env` e configure pelo menos `SESSION_SECRET`, `ADMIN_EMAIL` e `ADMIN_PASSWORD`.
7. Inicie o projeto:

   ```bash
   npm run dev
   ```

8. Acesse `http://localhost:3000`.

Na primeira inicialização, o administrador é criado com os dados de `ADMIN_EMAIL` e `ADMIN_PASSWORD`. Guarde essas credenciais. Se o banco já tiver sido criado, alterar as variáveis não altera automaticamente a conta existente.

## Publicar no GitHub
1. Entre no GitHub e crie um repositório chamado `namikazx-host`.
2. Deixe o repositório vazio (não marque para criar README, licença ou `.gitignore`, pois eles já estão neste projeto).
3. Extraia o ZIP deste projeto.
4. Na página do repositório, clique em **Add file > Upload files**.
5. Envie todos os arquivos e pastas que estão dentro da pasta `NAMIKAZX-HOST` (incluindo `.env.example` e `.github`).
6. Clique em **Commit changes**.

**Não envie o arquivo `.env`, a pasta `node_modules` ou `data/`.** O `.gitignore` já bloqueia esses itens.

## Publicar o site na internet
O GitHub guarda o código, mas GitHub Pages não executa este backend Node.js. Para deixar login, banco e pagamentos funcionando, publique o repositório em um serviço que execute Node.js e tenha armazenamento persistente.

Configure no provedor:
- Build command: `npm install`
- Start command: `npm start`
- Node.js: versão 20 ou superior
- Variáveis: `NODE_ENV=production`, `SESSION_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `BASE_URL` e `MP_ACCESS_TOKEN`.
- Armazenamento persistente para a pasta `data/`, pois o SQLite fica nela.

Use HTTPS e um domínio/URL público em `BASE_URL`. Não publique segredos em arquivos, prints ou commits.

## Configurar Mercado Pago
1. Crie uma aplicação no painel oficial do Mercado Pago.
2. Comece com credenciais de teste.
3. Defina `MP_ACCESS_TOKEN` nas variáveis de ambiente do servidor, nunca no frontend.
4. Configure o webhook para `https://SEU-DOMINIO/webhooks/mercadopago`.
5. Configure `BASE_URL` para a URL pública HTTPS.
6. Faça pagamentos de teste e confirme os estados no painel antes de ativar produção.

O checkout cria uma preferência no Mercado Pago. Os meios de pagamento exibidos, inclusive Pix, dependem das configurações e elegibilidade da conta Mercado Pago. O webhook incluído é uma implementação inicial: antes de operar comercialmente, implemente a validação criptográfica da assinatura do webhook, idempotência e conciliação do pagamento consultando a API.

## Personalizar os planos
Os planos e preços demonstrativos estão no array `products`, no início de `src/server.js`. Altere nome, preço, descrição e recursos antes de divulgar a loja.

## Limitações desta versão
- O sistema cria pedidos e recebe notificações de pagamento, mas **não provisiona automaticamente** hospedagem, VPS, domínio, cPanel ou servidores. Isso exige integração com a API do fornecedor contratado.
- Atualização manual de status no admin existe para suporte/testes; não substitui confirmação de pagamento pelo provedor.
- Antes de vender, acrescente termos de serviço, política de privacidade, política de reembolso/cancelamento, dados de contato e adequação à LGPD.
- Faça backup periódico do banco e use armazenamento persistente.
- Use senhas fortes e exclusivas para o administrador.

## Estrutura
```text
NAMIKAZX-HOST/
├── public/
│   ├── app.js
│   └── styles.css
├── src/
│   ├── server.js
│   └── store.js
├── .env.example
├── .gitignore
├── package.json
└── README.md
```
