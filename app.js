
'use strict';
const DEFAULT_DURATION_MS = 2 * 60 * 60 * 1000;
const $ = (id)=>document.getElementById(id);
const escapeHtml = (s)=> String(s).replace(/[&<>"']/g, c=>({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;" }[c]));
const diag = (msg)=>{ const el = $('diag'); if(el) { el.textContent += msg + '\n'; } }
const shuffle = (arr)=>{ const a=[...arr]; for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; };
const pick42 = (arr)=> shuffle(arr).slice(0,42);
const flattenBank = (x)=>{ const out=[]; (function walk(y){ Array.isArray(y) ? y.forEach(walk) : out.push(y) })(x); return out; };
let EXAM={items:[],i:0,answers:[],deadline:0,timerId:null,recording:{rec:null,chunks:[],stream:null}};

document.addEventListener('DOMContentLoaded', () => {
  diag('DOM listo');
  const welcome = $('welcome'), exam = $('exam'), results = $('results');
  const qTitle=$('qTitle'), qText=$('qText'), options=$('options'), qIndex=$('qIndex'), qTotal=$('qTotal'), modePill=$('modePill');
  const btnStart=$('btnStart'), btnNext=$('btnNext'), btnFinish=$('btnFinish'), btnRestart=$('btnRestart');
  const timerEl=$('timer'), bar=$('bar'), scoreEl=$('score');
  const btnCam=$('btnCam'), cam=$('cam'), btnRecord=$('btnRecord');

  if(!Array.isArray(window.TODAS)) { diag('ERROR: TODAS no es un array. Revisa bank.js'); }
  else { diag('Banco cargado: ' + window.TODAS.length + ' preguntas'); }

  const isSecure = location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  if(!isSecure){ diag('Aviso: No es contexto seguro. Cámara/Grabación pueden fallar. Usa HTTPS o localhost.'); }
  if(btnCam) btnCam.disabled = !isSecure;
  if(btnRecord) btnRecord.disabled = !isSecure;

  btnCam?.addEventListener('click', async ()=>{
    try{ const stream=await navigator.mediaDevices.getUserMedia({video:true,audio:false}); cam.srcObject=stream; cam.style.display='block'; btnCam.disabled=true; btnCam.textContent='Cámara activa'; diag('Cámara activada'); }
    catch(e){ alert('No se pudo activar la cámara: '+e.message); diag('Cam error: '+e.message); }
  });

  btnRecord?.addEventListener('click', async ()=>{
    if(EXAM.recording.rec){ try{ EXAM.recording.rec.stop(); btnRecord.textContent='Procesando…'; btnRecord.disabled=true; }catch{} return; }
    try{ const display=await navigator.mediaDevices.getDisplayMedia({video:true,audio:true}); EXAM.recording.stream=display; EXAM.recording.chunks=[]; const rec=new MediaRecorder(display,{mimeType:'video/webm; codecs=vp9,opus'}); rec.ondataavailable=e=>{ if(e.data && e.data.size>0) EXAM.recording.chunks.push(e.data) }; rec.onstop=()=>{ btnRecord.textContent='Grabación lista'; btnRecord.disabled=true }; rec.start(); EXAM.recording.rec=rec; btnRecord.textContent='Detener grabación' }
    catch(e){ alert('No se pudo iniciar la grabación de pantalla: '+e.message); diag('Rec error: '+e.message); }
  });

  btnStart.addEventListener('click', ()=>{
    try{
      const flat = flattenBank(window.TODAS || []);
      diag('Start: banco aplanado = ' + flat.length);
      if(!flat.length){ alert('No hay banco de preguntas cargado.'); return; }
      EXAM.items = pick42(flat); EXAM.i=0; EXAM.answers=Array(EXAM.items.length).fill(null); qTotal.textContent=String(EXAM.items.length);
      const qs=new URLSearchParams(location.search); const overrideMin=parseInt(qs.get('mins')); const duration=Number.isFinite(overrideMin)? overrideMin*60*1000 : DEFAULT_DURATION_MS;
      EXAM.deadline = Date.now()+duration; startTimer(); welcome.style.display='none'; results.style.display='none'; exam.style.display='block'; renderQuestion(); diag('Examen iniciado');
    }catch(e){ diag('Error al iniciar: '+e.message); alert('Error al iniciar: '+e.message) }
  });

  btnNext.addEventListener('click', (e)=>{
    e.preventDefault();
    const selected = [...options.querySelectorAll('input:checked')].map(x=>x.value);
    if(selected.length===0){ alert('Selecciona al menos una opción.'); return; }
    EXAM.answers[EXAM.i] = selected.sort();
    if(EXAM.i === EXAM.items.length-1){ finalize('manual'); } else { EXAM.i++; renderQuestion(); }
  });

  btnFinish.addEventListener('click', (e)=>{ e.preventDefault(); if(confirm('¿Deseas finalizar el examen? No podrás volver atrás.')) finalize('manual') });
  btnRestart?.addEventListener('click', ()=> location.reload() );

  function renderQuestion(){
    const item=EXAM.items[EXAM.i];
    qIndex.textContent=String(EXAM.i+1);
    qTitle.textContent=`Pregunta ${EXAM.i+1}`;
    qText.textContent=item.question;
    const multi=(item.answer_letters||[]).length>1;
    modePill.textContent=multi?'Selección múltiple':'Única respuesta';
    const opts = shuffle((item.options||[]).map(o=>({label:o.label, text:o.text})));
    options.innerHTML='';
    opts.forEach((o,idx)=>{
      const type = multi? 'checkbox':'radio';
      options.insertAdjacentHTML('beforeend', `<label class="opt"><input type="${type}" name="q" value="${o.label}"><div><strong>${o.label.toUpperCase()}.</strong> ${escapeHtml(o.text||'')}</div></label>`);
    });
    $('btnNext').textContent=(EXAM.i===EXAM.items.length-1)?'Finalizar →':'Continuar →';
  }

  function startTimer(){ const totalMs=Math.max(EXAM.deadline-Date.now(),0); tick(); EXAM.timerId=setInterval(tick,1000); function tick(){ const left=Math.max(EXAM.deadline-Date.now(),0); updateClock(left); const ratio=1-(left/(totalMs||1)); $('bar').style.width=`${Math.max(0,Math.min(1,ratio))*100}%`; if(left<=0){ finalize('time'); } } }
  function updateClock(ms){ const sec=Math.floor(ms/1000)%60; const min=Math.floor(ms/(60*1000))%60; const hrs=Math.floor(ms/(60*60*1000)); const pad=n=>String(n).padStart(2,'0'); $('timer').textContent=`${pad(hrs)}:${pad(min)}:${pad(sec)}`; $('timer').style.background = ms < 5*60*1000 ? 'rgba(239,68,68,.2)' : ''; }

  function finalize(reason){ clearInterval(EXAM.timerId); if(EXAM.recording && EXAM.recording.rec && EXAM.recording.rec.state!=='inactive'){ try{ EXAM.recording.rec.stop(); }catch{} } const total=EXAM.items.length; let correct=0; for(let i=0;i<total;i++){ const need=(EXAM.items[i].answer_letters||[]).slice().sort(); const got=(EXAM.answers[i]||[]).slice().sort(); if(JSON.stringify(need)===JSON.stringify(got)) correct++; } const nota=(correct/total)*20; $('score').textContent=`${nota.toFixed(2)} / 20 (aciertos: ${correct}/${total})`; $('exam').style.display='none'; $('results').style.display='block'; }
});
