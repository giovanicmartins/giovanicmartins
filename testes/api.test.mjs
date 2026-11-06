// Teste automático do back-end: npm test
// Sobe o servidor local com um banco novo e um Mercado Pago falso, e testa as rotas.
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
const raiz = path.join(path.dirname(new URL(import.meta.url).pathname), "..");
const pasta = fs.mkdtempSync(path.join(raiz, ".dados-teste-"));
const srv = spawn(process.execPath, [path.join(raiz, "dev-server.mjs")], {
  env: { ...process.env, PORT: "3999", MP_ACCESS_TOKEN: "x", MP_WEBHOOK_SECRET: "segredo-wh", MP_API_BASE: "http://localhost:4001", DADOS_LOCAL: pasta, DATABASE_URL: "", POSTGRES_URL: "" },
  stdio: "inherit"
});
const fim = (c) => { srv.kill(); fs.rmSync(pasta, { recursive: true, force: true }); process.exit(c); };
await new Promise((ok) => setTimeout(ok, 2500));
import http from "node:http"; import crypto from "node:crypto";
const B="http://localhost:3999"; let ok=0, falha=0;
const t=(n,c,extra="")=>{c?ok++:falha++;console.log((c?"OK  ":"FALHA ")+n+" "+extra)};
// fake MP
const pagamentos={};
http.createServer((req,res)=>{let b="";req.on("data",d=>b+=d);req.on("end",()=>{
 res.setHeader("Content-Type","application/json");
 if(req.url.startsWith("/checkout/preferences")){return res.end(JSON.stringify({init_point:"https://mp/x"}))}
 const m=req.url.match(/\/v1\/payments\/(\w+)/); if(m&&pagamentos[m[1]])return res.end(JSON.stringify(pagamentos[m[1]]));
 res.statusCode=404;res.end("{}")})}).listen(4001);
let ck="";
async function f(p,{m="GET",body,h={}}={}){const r=await fetch(B+p,{method:m,headers:{"content-type":"application/json",cookie:ck,...h},body:body&&JSON.stringify(body)});const sc=r.headers.get("set-cookie");if(sc)ck=sc.split(";")[0];let j;try{j=await r.json()}catch{j=null}return{s:r.status,j}}
function assin(id){const ts=Date.now()+"",rid="req1";return{"x-signature":`ts=${ts},v1=`+crypto.createHmac("sha256","segredo-wh").update(`id:${id};request-id:${rid};ts:${ts};`).digest("hex"),"x-request-id":rid}}
const E="cli@teste.com";
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
console.log(`\n${ok} ok, ${falha} falhas`);fim(falha ? 1 : 0);
