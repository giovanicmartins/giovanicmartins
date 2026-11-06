// Teste automático do back-end: npm test
// Sobe o servidor local com um banco novo e um Mercado Pago falso, e testa as rotas.
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
const raiz = path.join(path.dirname(new URL(import.meta.url).pathname), "..");
const pasta = fs.mkdtempSync(path.join(raiz, ".dados-teste-"));
const srv = spawn(process.execPath, [path.join(raiz, "dev-server.mjs")], {
  env: { ...process.env, PORT: "3999", MP_ACCESS_TOKEN: "x", MP_WEBHOOK_SECRET: "segredo-wh", MP_API_BASE: "http://localhost:4001", RESEND_API_KEY: "re_teste", RESEND_API_BASE: "http://localhost:4001/emails", DADOS_LOCAL: pasta, DATABASE_URL: "", POSTGRES_URL: "" },
  stdio: "inherit"
});
const fim = (c) => { srv.kill(); fs.rmSync(pasta, { recursive: true, force: true }); process.exit(c); };
await new Promise((ok) => setTimeout(ok, 2500));
import http from "node:http"; import crypto from "node:crypto";
const B="http://localhost:3999"; let ok=0, falha=0;
const t=(n,c,extra="")=>{c?ok++:falha++;console.log((c?"OK  ":"FALHA ")+n+" "+extra)};
// fake MP
const pagamentos={};const emails=[];
http.createServer((req,res)=>{let b="";req.on("data",d=>b+=d);req.on("end",()=>{
 res.setHeader("Content-Type","application/json");
 if(req.url.startsWith("/emails")){emails.push(JSON.parse(b));return res.end("{}")}
 if(req.url.startsWith("/checkout/preferences")){return res.end(JSON.stringify({init_point:"https://mp/x"}))}
 const m=req.url.match(/\/v1\/payments\/(\w+)/); if(m&&pagamentos[m[1]])return res.end(JSON.stringify(pagamentos[m[1]]));
 res.statusCode=404;res.end("{}")})}).listen(4001);
let ck="";
async function f(p,{m="GET",body,h={}}={}){const r=await fetch(B+p,{method:m,headers:{"content-type":"application/json",cookie:ck,...h},body:body&&JSON.stringify(body)});const sc=r.headers.get("set-cookie");if(sc)ck=sc.split(";")[0];let j;try{j=await r.json()}catch{j=null}return{s:r.status,j}}
function assin(id){const ts=Date.now()+"",rid="req1";return{"x-signature":`ts=${ts},v1=`+crypto.createHmac("sha256","segredo-wh").update(`id:${id};request-id:${rid};ts:${ts};`).digest("hex"),"x-request-id":rid}}
const E="cli@teste.com";let chave;
let r=await f("/api/config");t("config",r.s==200,JSON.stringify(r.j));
r=await f("/api/checkout",{m:"POST",body:{email:E}});t("checkout",r.s==200&&r.j.url,JSON.stringify(r.j));
r=await f("/api/cadastro",{m:"POST",body:{email:E,senha:"123456"}});t("cadastro sem compra bloqueado",r.s==403);
r=await f("/api/mercadopago?data.id=111&type=payment",{m:"POST",body:{type:"payment",data:{id:"111"}},h:{"x-signature":"ts=1,v1=abc","x-request-id":"x"}});t("webhook assinatura falsa recusada",r.s==401);
pagamentos["111"]={id:111,status:"approved",metadata:{produto:"controller",email:E},external_reference:E,transaction_amount:97};
r=await f("/api/mercadopago?data.id=111&type=payment",{m:"POST",body:{type:"payment",data:{id:"111"}},h:assin("111")});t("webhook aprovado libera",r.j?.resultado=="liberado",JSON.stringify(r.j));
r=await f("/api/cadastro",{m:"POST",body:{email:E,senha:"123456"}});t("cadastro",r.s==200,JSON.stringify(r.j));
r=await f("/api/cadastro",{m:"POST",body:{email:E,senha:"123456"}});t("cadastro duplicado",r.s==409);
r=await f("/api/eu");t("eu",r.s==200&&r.j.email==E);
r=await f("/api/dados");t("dados vazio",r.s==200&&r.j.versao==0);
r=await f("/api/dados",{m:"PUT",body:{conteudo:{a:1},versao:0}});t("salvar 1",r.j?.versao==1,JSON.stringify(r.j));
r=await f("/api/dados",{m:"PUT",body:{conteudo:{a:2},versao:1}});t("salvar 2",r.j?.versao==2);
r=await f("/api/dados",{m:"PUT",body:{conteudo:{a:3},versao:1}});t("conflito versao velha",r.s==409);
r=await f("/api/dados");t("ler dados",r.j?.conteudo?.a==2);
r=await f("/api/sair",{m:"POST"});ck="";r=await f("/api/eu");t("sair",r.s==401);
r=await f("/api/login",{m:"POST",body:{email:E,senha:"errada"}});t("login senha errada",r.s==401);
r=await f("/api/login",{m:"POST",body:{email:E.toUpperCase(),senha:"123456"}});t("login",r.s==200);
r=await f("/api/admin",{m:"POST",body:{acao:"listar"}});t("admin sem senha",r.s==401);
r=await f("/api/admin",{m:"POST",body:{acao:"listar"},h:{"x-admin-key":"admin-local"}});t("admin listar",r.j?.compradores?.length==1,JSON.stringify(r.j));
r=await f("/api/chaves",{m:"POST",body:{nome:"ERP"}});chave=r.j?.chave;t("criar chave",r.s==200&&/^ctrl_/.test(chave||""),r.s);
r=await f("/api/chaves");t("listar chaves sem mostrar a chave",r.j?.chaves?.length==1&&!JSON.stringify(r.j).includes(chave));
const salvoCk=ck;ck="";
r=await f("/api/integracao");t("integracao sem chave 401",r.s==401);
r=await f("/api/integracao",{h:{authorization:"Bearer ctrl_"+"x".repeat(30)}});t("integracao chave falsa 401",r.s==401);
r=await f("/api/integracao",{h:{authorization:"Bearer "+chave}});t("integracao sem dados do app 409",r.s==409,r.s);
ck=salvoCk;await f("/api/dados",{m:"PUT",body:{conteudo:{plano:[],contas:[{id:"c1",nome:"Conta"}],titulos:[]},versao:2}});ck="";
r=await f("/api/integracao",{m:"POST",h:{authorization:"Bearer "+chave},body:{titulos:[{tipo:"Receita",descricao:"Venda loja",valor:"150.5",venc:"2026-11-06",externoId:"v1"}]}});t("integracao cria titulo",r.j?.criados?.length==1,JSON.stringify(r.j));
r=await f("/api/integracao",{m:"POST",h:{authorization:"Bearer "+chave},body:{titulos:[{tipo:"Receita",descricao:"Venda loja",valor:150.5,venc:"2026-11-06",externoId:"v1"}]}});t("integracao nao duplica externoId",r.j?.ignorados==1,JSON.stringify(r.j));
r=await f("/api/integracao",{m:"POST",h:{authorization:"Bearer "+chave},body:{titulos:[{tipo:"Outro",descricao:"x",valor:1,venc:"2026-11-06"}]}});t("integracao valida tipo 400",r.s==400,JSON.stringify(r.j));
r=await f("/api/integracao?tipo=titulos",{h:{authorization:"Bearer "+chave}});t("integracao le titulos",r.j?.titulos?.[0]?.valor==150.5&&r.j.titulos[0].contaId=="c1",JSON.stringify(r.j));
ck=salvoCk;r=await f("/api/dados");t("app ve titulo da integracao",r.j?.conteudo?.titulos?.length==1&&r.j.versao==4,r.j?.versao);
r=await f("/api/chaves");r=await f("/api/chaves",{m:"DELETE",body:{id:r.j.chaves[0].id}});t("apagar chave",r.s==200);ck="";
r=await f("/api/integracao",{h:{authorization:"Bearer "+chave}});t("chave apagada nao funciona",r.s==401);ck=salvoCk;
r=await f("/api/admin",{m:"POST",body:{acao:"resetar",email:E},h:{"x-admin-key":"admin-local"}});t("admin resetar",!!r.j?.senha);
pagamentos["111"].status="refunded";
r=await f("/api/mercadopago?data.id=111&type=payment",{m:"POST",body:{type:"payment",data:{id:"111"}},h:assin("111")});t("reembolso remove",r.j?.resultado=="removido");
r=await f("/api/eu");t("sem acesso apos reembolso",r.s==403);
r=await f("/api/login",{m:"POST",body:{email:E}});t("login sem senha nao quebra",r.s==401,r.s);
r=await f("/api/login",{m:"POST",body:{email:E,senha:{x:1}}});t("login senha objeto",r.s==401,r.s);
r=await fetch(B+"/api/login",{method:"POST",headers:{"content-type":"application/json"},body:"{xx"});t("json invalido 400",r.status==400,r.status);
pagamentos["111"].status="approved";await f("/api/mercadopago?data.id=111&type=payment",{m:"POST",body:{type:"payment",data:{id:"111"}},h:assin("111")});
r=await f("/api/dados",{m:"PUT",body:{conteudo:{a:4},versao:"abc"}});t("versao invalida 400",r.s==400,r.s);
r=await f("/api/dados",{m:"PUT",body:{conteudo:[1],versao:2}});t("lista recusada 400",r.s==400,r.s);
// ---- Esqueci a senha e bloqueio ----
pagamentos["111"].status="approved";await f("/api/mercadopago?data.id=111&type=payment",{m:"POST",body:{type:"payment",data:{id:"111"}},h:assin("111")});
ck="";
r=await f("/api/senha",{m:"POST",body:{acao:"pedir",email:"ninguem@teste.com"}});t("pedir senha e-mail sem conta responde igual",r.s==200&&emails.length==0);
r=await f("/api/senha",{m:"POST",body:{acao:"pedir",email:E}});t("pedir senha envia e-mail",r.s==200&&emails.length==1,JSON.stringify(r.j));
const tok=(emails[0]?.html.match(/redefinir=([\w-]+)/)||[])[1];t("e-mail tem link",!!tok);
r=await f("/api/senha",{m:"POST",body:{acao:"trocar",token:"errado",senha:"nova123"}});t("token errado recusado",r.s==400);
r=await f("/api/senha",{m:"POST",body:{acao:"trocar",token:tok,senha:"nova123"}});t("trocar senha",r.s==200,JSON.stringify(r.j));
r=await f("/api/senha",{m:"POST",body:{acao:"trocar",token:tok,senha:"outra123"}});t("link so vale uma vez",r.s==400);
r=await f("/api/login",{m:"POST",body:{email:E,senha:"nova123"}});t("login com senha nova",r.s==200,r.s);
ck="";
for(let i=0;i<5;i++) r=await f("/api/login",{m:"POST",body:{email:E,senha:"x"+i}});
t("5 erros ainda 401",r.s==401,r.s);
const av=emails[emails.length-1];t("e-mail de aviso de bloqueio enviado",emails.length==2&&/Aviso de segurança/.test(av.subject)&&/redefinir=/.test(av.html),emails.length);
r=await f("/api/login",{m:"POST",body:{email:E,senha:"nova123"}});t("6a tentativa bloqueada 429",r.s==429,JSON.stringify(r.j));
t("aviso enviado so uma vez",emails.length==2,emails.length);
r=await f("/api/admin",{m:"POST",body:{acao:"resetar",email:E},h:{"x-admin-key":"admin-local"}});
r=await f("/api/login",{m:"POST",body:{email:E,senha:r.j.senha}});t("admin resetar desbloqueia",r.s==200,r.s);
console.log(`\n${ok} ok, ${falha} falhas`);fim(falha ? 1 : 0);
