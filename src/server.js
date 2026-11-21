import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import SQLiteStoreFactory from 'connect-sqlite3';
import helmet from 'helmet';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import { initDb, db } from './store.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT || 3000);
const SQLiteStore = SQLiteStoreFactory(session);
await initDb();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: '100kb' }));
app.use(session({
  store: new SQLiteStore({ db: 'sessions.sqlite', dir: './data' }),
  secret: process.env.SESSION_SECRET || 'troque-esta-chave-antes-de-publicar',
  resave: false, saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 1000*60*60*24*7 }
}));
app.use(express.static(path.join(__dirname, '../public')));

const products = [
  { id: 'starter', name: 'STARTER HOST', price: 19.90, description: 'Ideal para começar', features: ['1 site', '10 GB SSD', 'SSL grátis', 'Suporte padrão'] },
  { id: 'pro', name: 'PRO HOST', price: 39.90, description: 'Para projetos em crescimento', features: ['5 sites', '30 GB SSD', 'SSL grátis', 'Suporte prioritário'] },
  { id: 'business', name: 'BUSINESS HOST', price: 79.90, description: 'Mais recursos para negócios', features: ['Sites ilimitados*', '80 GB SSD', 'SSL grátis', 'Suporte prioritário'] }
];

function user(req,res,next){ if(!req.session.user) return res.redirect('/login'); next(); }
function admin(req,res,next){ if(!req.session.user || req.session.user.role!=='admin') return res.status(403).send(page('Acesso negado','Somente administradores podem acessar esta área.')); next(); }
function money(v){ return Number(v).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}); }
function page(title, body){ return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#10090b"><title>${title} | NAMIKAZX HOST</title><link rel="stylesheet" href="/styles.css"></head><body>${body}<script src="/app.js"></script></body></html>`; }
function shell(req,content){ const u=req.session.user; return page('Painel',`<header class="top"><a class="brand" href="/">NAMIKAZX <b>HOST</b></a><nav><a href="/#planos">Planos</a>${u?'<a href="/dashboard">Minha conta</a>':''}${u?.role==='admin'?'<a href="/admin">Admin</a>':''}${u?'<form method="post" action="/logout"><button class="linkbtn">Sair</button></form>':'<a href="/login">Entrar</a>'}</nav></header>${content}<footer>© ${new Date().getFullYear()} NAMIKAZX HOST · Plataforma independente</footer>`); }

app.get('/',(req,res)=>res.send(shell(req,`<main><section class="hero"><div class="eyebrow">HOSPEDAGEM • PERFORMANCE • CONFIANÇA</div><h1>Sua presença online.<br><span>Em outro nível.</span></h1><p>Hospedagem simples, planos transparentes e gerenciamento em um só lugar.</p><a class="btn" href="#planos">VER PLANOS</a><div class="hero-orb"></div></section><section id="planos" class="section"><div class="section-head"><small>ESCOLHA SEU PLANO</small><h2>Planos feitos para crescer</h2></div><div class="plans">${products.map((p,i)=>`<article class="plan ${i===1?'featured':''}"><div class="tag">${i===1?'MAIS ESCOLHIDO':'NAMIKAZX HOST'}</div><h3>${p.name}</h3><p>${p.description}</p><div class="price">${money(p.price)}<small>/mês</small></div><ul>${p.features.map(f=>`<li>✓ ${f}</li>`).join('')}</ul><a class="btn full" href="/checkout/${p.id}">CONTRATAR</a></article>`).join('')}</div><p class="muted center">* Consulte limites de uso. Planos demonstrativos: configure sua oferta real antes de vender.</p></section><section class="cta"><h2>Pronto para começar?</h2><p>Crie sua conta e acompanhe seus pedidos.</p><a class="btn" href="/register">CRIAR CONTA</a></section></main>`)));

app.get('/register',(req,res)=>res.send(shell(req,`<main class="auth"><h1>Criar conta</h1><form method="post" action="/register" class="panel"><label>Nome<input name="name" required maxlength="70"></label><label>E-mail<input name="email" type="email" required maxlength="150"></label><label>Senha<input name="password" type="password" minlength="8" required></label><button class="btn full">CRIAR CONTA</button><p class="muted">Já tem conta? <a href="/login">Entrar</a></p></form></main>`)));
app.post('/register',async(req,res)=>{ const {name,email,password}=req.body; if(!name||!email||!password||password.length<8) return res.status(400).send('Dados inválidos. A senha precisa ter pelo menos 8 caracteres.'); const hash=await bcrypt.hash(password,12); try{const r=await db.run('INSERT INTO users(name,email,password_hash) VALUES(?,?,?)',[name.trim(),email.trim().toLowerCase(),hash]); req.session.user={id:r.lastID,name:name.trim(),email:email.trim().toLowerCase(),role:'customer'}; res.redirect('/dashboard');}catch{res.status(409).send(page('Cadastro','Este e-mail já está cadastrado. <a href="/register">Voltar</a>'));}});
app.get('/login',(req,res)=>res.send(shell(req,`<main class="auth"><h1>Bem-vindo de volta</h1><form method="post" action="/login" class="panel"><label>E-mail<input name="email" type="email" required></label><label>Senha<input name="password" type="password" required></label><button class="btn full">ENTRAR</button><p class="muted">Não tem conta? <a href="/register">Criar conta</a></p></form></main>`)));
app.post('/login',async(req,res)=>{const row=await db.get('SELECT * FROM users WHERE email=?',[String(req.body.email||'').toLowerCase()]); if(!row||!await bcrypt.compare(req.body.password||'',row.password_hash)) return res.status(401).send(page('Login','E-mail ou senha incorretos. <a href="/login">Tentar novamente</a>')); req.session.user={id:row.id,name:row.name,email:row.email,role:row.role}; res.redirect('/dashboard');});
app.post('/logout',(req,res)=>req.session.destroy(()=>res.redirect('/')));

app.get('/checkout/:id',user,(req,res)=>{const p=products.find(x=>x.id===req.params.id); if(!p)return res.status(404).send('Plano não encontrado'); res.send(shell(req,`<main class="auth"><h1>Confirmar contratação</h1><div class="panel"><h2>${p.name}</h2><p>${p.description}</p><div class="price">${money(p.price)}<small>/mês</small></div><p>Cliente: ${req.session.user.name}</p><form method="post" action="/checkout/${p.id}"><button class="btn full">CONTINUAR PARA PAGAMENTO</button></form><p class="muted">O pagamento será processado pelo Mercado Pago quando as credenciais estiverem configuradas.</p></div></main>`));});
app.post('/checkout/:id',user,async(req,res)=>{const p=products.find(x=>x.id===req.params.id);if(!p)return res.status(404).send('Plano não encontrado');const order=await db.run('INSERT INTO orders(user_id,plan_id,plan_name,amount,status) VALUES(?,?,?,?,?)',[req.session.user.id,p.id,p.name,p.price,'pending']);const token=process.env.MP_ACCESS_TOKEN;if(!token){return res.send(shell(req,`<main class="auth"><div class="panel"><h1>Pedido criado</h1><p>Pedido #${order.lastID} registrado como aguardando pagamento.</p><p class="notice">Configure MP_ACCESS_TOKEN no arquivo .env para ativar o checkout real.</p><a class="btn" href="/dashboard">IR PARA MINHA CONTA</a></div></main>`));}
try{const client=new MercadoPagoConfig({accessToken:token});const preference=new Preference(client);const base=(process.env.BASE_URL||`http://localhost:${PORT}`).replace(/\/$/,'');const result=await preference.create({body:{items:[{id:p.id,title:p.name,quantity:1,currency_id:'BRL',unit_price:p.price}],external_reference:String(order.lastID),notification_url:base+'/webhooks/mercadopago',back_urls:{success:base+'/payment/success',pending:base+'/payment/pending',failure:base+'/payment/failure'},auto_return:'approved'}});await db.run('UPDATE orders SET payment_id=? WHERE id=?',[result.id,order.lastID]);res.redirect(result.init_point);}catch(e){console.error('Mercado Pago:',e.message);res.status(502).send(shell(req,`<main class="auth"><div class="panel"><h1>Não foi possível iniciar o pagamento</h1><p>O pedido #${order.lastID} foi salvo. Confira as credenciais e tente novamente.</p><a href="/dashboard">Voltar</a></div></main>`));}});
for(const [route,label] of [['success','Pagamento aprovado'],['pending','Pagamento pendente'],['failure','Pagamento não concluído']])app.get('/payment/'+route,user,(req,res)=>res.send(shell(req,`<main class="auth"><div class="panel"><h1>${label}</h1><p>Consulte o status atualizado em sua conta.</p><a class="btn" href="/dashboard">MINHA CONTA</a></div></main>`)));

app.post('/webhooks/mercadopago',async(req,res)=>{try{const id=req.query['data.id']||req.body?.data?.id;if(id&&process.env.MP_ACCESS_TOKEN){const client=new MercadoPagoConfig({accessToken:process.env.MP_ACCESS_TOKEN});const {Payment}=await import('mercadopago');const payment=await new Payment(client).get({id});const orderId=Number(payment.external_reference);if(orderId){const status=payment.status==='approved'?'paid':payment.status==='rejected'?'failed':'pending';await db.run('UPDATE orders SET status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?',[status,orderId]);}}}catch(e){console.error('Webhook:',e.message);}res.sendStatus(200);});

app.get('/dashboard',user,async(req,res)=>{const orders=await db.all('SELECT * FROM orders WHERE user_id=? ORDER BY id DESC',[req.session.user.id]);res.send(shell(req,`<main class="section"><div class="section-head"><small>ÁREA DO CLIENTE</small><h1>Olá, ${escapeHtml(req.session.user.name)}</h1><p>Acompanhe suas contratações.</p></div><div class="panel"><h2>Meus pedidos</h2>${orders.length?`<div class="table-wrap"><table><tr><th>Pedido</th><th>Plano</th><th>Valor</th><th>Status</th><th>Data</th></tr>${orders.map(o=>`<tr><td>#${o.id}</td><td>${escapeHtml(o.plan_name)}</td><td>${money(o.amount)}</td><td><span class="status">${o.status}</span></td><td>${o.created_at}</td></tr>`).join('')}</table></div>`:'<p class="muted">Você ainda não possui pedidos.</p>'}<a class="btn" href="/#planos">VER PLANOS</a></div></main>`));});
function escapeHtml(s=''){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

app.get('/admin',admin,async(req,res)=>{const users=await db.all('SELECT id,name,email,role,created_at FROM users ORDER BY id DESC');const orders=await db.all('SELECT o.*,u.name customer FROM orders o JOIN users u ON u.id=o.user_id ORDER BY o.id DESC');const total=orders.filter(o=>o.status==='paid').reduce((s,o)=>s+o.amount,0);res.send(shell(req,`<main class="section"><div class="section-head"><small>CONTROLE DA PLATAFORMA</small><h1>Painel administrativo</h1></div><div class="stats"><div class="stat"><small>CLIENTES</small><b>${users.length}</b></div><div class="stat"><small>PEDIDOS</small><b>${orders.length}</b></div><div class="stat"><small>RECEITA APROVADA</small><b>${money(total)}</b></div></div><div class="panel"><h2>Pedidos</h2><div class="table-wrap"><table><tr><th>#</th><th>Cliente</th><th>Plano</th><th>Valor</th><th>Status</th><th>Ação</th></tr>${orders.map(o=>`<tr><td>${o.id}</td><td>${escapeHtml(o.customer)}</td><td>${escapeHtml(o.plan_name)}</td><td>${money(o.amount)}</td><td>${o.status}</td><td><form method="post" action="/admin/order/${o.id}/status"><select name="status"><option value="pending">Pendente</option><option value="paid">Pago (manual)</option><option value="failed">Falhou</option><option value="cancelled">Cancelado</option></select><button class="smallbtn">Salvar</button></form></td></tr>`).join('')}</table></div></div><div class="panel"><h2>Clientes</h2><div class="table-wrap"><table><tr><th>#</th><th>Nome</th><th>E-mail</th><th>Perfil</th><th>Cadastro</th></tr>${users.map(u=>`<tr><td>${u.id}</td><td>${escapeHtml(u.name)}</td><td>${escapeHtml(u.email)}</td><td>${u.role}</td><td>${u.created_at}</td></tr>`).join('')}</table></div></div></main>`));});
app.post('/admin/order/:id/status',admin,async(req,res)=>{const allowed=['pending','paid','failed','cancelled'];if(allowed.includes(req.body.status))await db.run('UPDATE orders SET status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?',[req.body.status,req.params.id]);res.redirect('/admin');});

app.get('/health',(req,res)=>res.json({ok:true,app:'NAMIKAZX HOST'}));
app.use((req,res)=>res.status(404).send(page('Não encontrado','<main class="auth"><h1>Página não encontrada</h1><a href="/">Voltar ao início</a></main>')));
app.listen(PORT,()=>console.log(`\n[NAMIKAZX HOST] Online em http://localhost:${PORT}\n`));
