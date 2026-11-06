import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
const source=await readFile(new URL('../app/senha.js',import.meta.url),'utf8');
const tick=()=>new Promise(r=>setTimeout(r,0));
function fixture({api=async()=>({ok:true,d:{mensagem:'Pedido recebido'}}),tipo='esqueci',token=null,url='https://controller.test/app/'}={}){
 const dom=new JSDOM('<div id="root"></div>',{url,runScripts:'outside-only'});
 const w=dom.window;w.eval(source);const root=w.document.querySelector('#root');let back=0,request=0;
 const close=w.ControllerSenha.abrir(root,{api,tipo,token,voltar:()=>back++,novoPedido:()=>request++});
 return {w,root,close,back:()=>back,request:()=>request};
}
function submit(f){f.root.querySelector('form').dispatchEvent(new f.w.Event('submit',{cancelable:true}))}
function passwords(f,password='nova-senha-local',confirm=password){f.root.querySelector('[name=senha]').value=password;f.root.querySelector('[name=confirmacao]').value=confirm}
test('solicita link com rota, ação e email corretos e mostra mensagem genérica',async()=>{
 let call;const f=fixture({api:async(u,o)=>{call=[u,o];return {ok:true,d:{mensagem:'Se este e-mail tiver conta, enviamos um link.'}}}});
 f.root.querySelector('[name=email]').value='cliente@example.test';submit(f);await tick();
 assert.equal(call[0],'/api/senha');assert.equal(call[1].method,'POST');assert.deepEqual(JSON.parse(call[1].body),{acao:'pedir',email:'cliente@example.test'});
 assert.match(f.root.textContent,/Se este e-mail tiver conta/);assert.equal(f.root.querySelector('form button').disabled,false);f.close();
});
test('email inválido não envia pedido',()=>{let n=0;const f=fixture({api:async()=>{n++}});f.root.querySelector('[name=email]').value='invalido';submit(f);assert.equal(n,0);f.close()});
test('confirmação diferente não envia nem expõe senha no aviso',()=>{let n=0;const f=fixture({tipo:'redefinir',token:'token-local',api:async()=>{n++}});passwords(f,'nova-senha-local','outra-senha-local');submit(f);assert.equal(n,0);assert.match(f.root.textContent,/não são iguais/);assert.equal(f.root.textContent.includes('nova-senha-local'),false);f.close()});
test('senha curta não chama API',()=>{let n=0;const f=fixture({tipo:'redefinir',token:'token-local',api:async()=>{n++}});passwords(f,'123');submit(f);assert.equal(n,0);f.close()});
test('troca senha, limpa campos e token da URL e oferece entrada',async()=>{
 let call;const f=fixture({tipo:'redefinir',token:'token-local',url:'https://controller.test/app/?redefinir=token-local&origem=email',api:async(u,o)=>{call=[u,o];return {ok:true,d:{mensagem:'Senha trocada. Agora é só entrar.'}}}});
 passwords(f);const inputs=Array.from(f.root.querySelectorAll('input'));submit(f);await tick();
 assert.deepEqual(JSON.parse(call[1].body),{acao:'trocar',token:'token-local',senha:'nova-senha-local'});
 assert.equal(f.root.querySelector('form'),null);assert.equal(new URL(f.w.location.href).searchParams.has('redefinir'),false);assert.match(f.w.location.search,/origem=email/);
 assert.ok(inputs.every(i=>i.value===''));assert.equal(f.w.localStorage.length,0);assert.equal(f.w.sessionStorage.length,0);
 assert.match(f.root.textContent,/Senha trocada/);f.root.querySelector('[data-back]').click();assert.equal(f.back(),1);f.close();
});
test('link incompleto não pode trocar senha e oferece novo pedido',()=>{let n=0;const f=fixture({tipo:'redefinir',token:'',api:async()=>{n++}});assert.equal(f.root.querySelector('form'),null);assert.match(f.root.textContent,/incompleto/);f.root.querySelector('[data-new-link]').click();assert.equal(f.request(),1);assert.equal(n,0);f.close()});
test('link vencido mostra erro do servidor como texto',async()=>{
 const f=fixture({tipo:'redefinir',token:'vencido',api:async()=>({ok:false,status:400,d:{erro:'Link vencido ou já usado. <b>Peça um novo.</b>'}})});passwords(f);submit(f);await tick();
 assert.match(f.root.querySelector('[role=alert]').textContent,/Link vencido/);assert.equal(f.root.querySelector('[data-feedback] b'),null);assert.equal(f.root.querySelector('form button').disabled,false);f.close();
});
test('bloqueio 429 mostra orientação do back-end',async()=>{const f=fixture({api:async()=>({ok:false,status:429,d:{erro:'Aguarde 15 minutos antes de tentar novamente.'}})});f.root.querySelector('[name=email]').value='cliente@example.test';submit(f);await tick();assert.match(f.root.textContent,/15 minutos/);f.close()});
test('falha de rede permite repetir pedido e não deixa botão travado',async()=>{const f=fixture({api:async()=>{throw new Error('offline')}});f.root.querySelector('[name=email]').value='cliente@example.test';submit(f);await tick();assert.match(f.root.textContent,/Sem conexão/);assert.equal(f.root.querySelector('button[type=submit]').disabled,false);f.close()});
test('envio duplo é bloqueado e resposta tardia não altera tela fechada',async()=>{let n=0,resolve,signal;const f=fixture({tipo:'redefinir',token:'local',api:async(u,o)=>{n++;signal=o.signal;return new Promise(r=>resolve=r)}});passwords(f);submit(f);submit(f);assert.equal(n,1);const input=f.root.querySelector('[name=senha]');f.close();assert.equal(input.value,'');assert.equal(signal.aborted,true);resolve({ok:true,d:{mensagem:'ok'}});await tick();assert.equal(f.root.childElementCount,0)});

// Testes da ligação entre as telas e a inicialização do aplicativo.
const html=await readFile(new URL('../app/index.html',import.meta.url),'utf8');
const app=await readFile(new URL('../app/app.js',import.meta.url),'utf8');
function application(url,fetcher){const dom=new JSDOM(html,{url,runScripts:'outside-only'});dom.window.fetch=fetcher;dom.window.eval(source);dom.window.eval(app);return dom.window}
test('link do email tem prioridade mesmo com sessão ativa ou demo na URL',async()=>{let calls=0;const w=application('https://controller.test/app/?redefinir=local&demo=1',async()=>{calls++;throw new Error('Não deveria consultar sessão')});await tick();assert.equal(calls,0);assert.match(w.document.querySelector('#auth-content h2').textContent,/Criar nova senha/);assert.equal(w.document.querySelector('input[name=senha]').type,'password');w.close()});
test('novo pedido e voltar removem token da URL',async()=>{const w=application('https://controller.test/app/?redefinir=local',async()=>{throw new Error('Não chamar')});await tick();w.document.querySelector('[data-new-link]').click();assert.equal(new URL(w.location.href).searchParams.has('redefinir'),false);assert.match(w.document.querySelector('h2').textContent,/Esqueci/);w.document.querySelector('[data-back]').click();assert.equal(w.document.querySelector('h2').textContent,'Entrar');w.close()});
test('login exibe mensagem 429 da API existente',async()=>{const w=application('https://controller.test/app/',async(url)=>({ok:false,status:url==='/api/login'?429:401,json:async()=>url==='/api/login'?{erro:'Aguarde 15 minutos.'}:{}}));await tick();const form=w.document.querySelector('#f');form.elements.email.value='cliente@example.test';form.elements.senha.value='senha-de-teste';form.dispatchEvent(new w.Event('submit',{cancelable:true}));await tick();assert.match(w.document.querySelector('#auth-content').textContent,/Aguarde 15 minutos/);w.close()});
test('olho alterna somente o campo escolhido sem enviar o formulário',()=>{
 let requests=0;const f=fixture({tipo:'redefinir',token:'local',api:async()=>{requests++}});passwords(f);
 const input=f.root.querySelector('[name=senha]'),confirm=f.root.querySelector('[name=confirmacao]'),eye=input.parentElement.querySelector('button');
 assert.equal(input.type,'password');assert.equal(eye.type,'button');assert.equal(eye.getAttribute('aria-pressed'),'false');
 eye.click();assert.equal(input.type,'text');assert.equal(input.value,'nova-senha-local');assert.equal(confirm.type,'password');assert.equal(eye.getAttribute('aria-label'),'Ocultar senha');assert.equal(eye.getAttribute('aria-pressed'),'true');
 eye.click();assert.equal(input.type,'password');assert.equal(eye.getAttribute('aria-label'),'Mostrar senha');assert.equal(requests,0);f.close();
});
test('senha revelada também é limpa ao sair da tela',()=>{const f=fixture({tipo:'redefinir',token:'local'});passwords(f);const input=f.root.querySelector('[name=senha]');input.parentElement.querySelector('button').click();assert.equal(input.type,'text');f.close();assert.equal(input.value,'')});
