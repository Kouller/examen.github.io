
/** Configuración de tiempo (2 horas por defecto) */
const DEFAULT_DURATION_MS = 2 * 60 * 60 * 1000; // Cambia aquí la duración

// Construye el banco a partir de TODAS (definido en bank.js)
const QUESTIONS_BANK = (function(){ return Array.isArray(TODAS) ? TODAS : []; })();

const pick42=(arr)=>{const pool=[...arr];for(let i=pool.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]]}return pool.slice(0,42)};
const flattenBank=(x)=>{const out=[];const w=(y)=>Array.isArray(y)?y.forEach(w):out.push(y);w(x);return out};

let EXAM={items:[],i:0,answers:[],deadline:0,timerId:null,recording:{rec:null,chunks:[],stream:null}};
const $=id=>document.getElementById(id);
const welcome=$("welcome"),exam=$("exam"),results=$("results");
const qTitle=$("qTitle"),qText=$("qText"),options=$("options"),qIndex=$("qIndex"),qTotal=$("qTotal"),modePill=$("modePill");
const btnStart=$("btnStart"),btnNext=$("btnNext"),btnFinish=$("btnFinish"),btnRestart=$("btnRestart");
const timerEl=$("timer"),bar=$("bar"),scoreEl=$("score"),btnDownload=$("btnDownload");
const btnCam=$("btnCam"),cam=$("cam"),btnRecord=$("btnRecord");

btnCam?.addEventListener('click', async()=>{
  try{const stream=await navigator.mediaDevices.getUserMedia({video:true,audio:false});cam.srcObject=stream;cam.style.display='block';btnCam.disabled=true;btnCam.textContent='Cámara activa'}catch(e){alert('No se pudo activar la cámara: '+e.message)}
});

btnRecord?.addEventListener('click', async()=>{
  if(EXAM.recording.rec){EXAM.recording.rec.stop();btnRecord.textContent='Procesando…';btnRecord.disabled=true;return;}
  try{const display=await navigator.mediaDevices.getDisplayMedia({video:true,audio:true});EXAM.recording.stream=display;EXAM.recording.chunks=[];const rec=new MediaRecorder(display,{mimeType:'video/webm; codecs=vp9,opus'});rec.ondataavailable=e=>{if(e.data&&e.data.size>0)EXAM.recording.chunks.push(e.data)};rec.onstop=()=>{btnRecord.textContent='Grabación lista';btnRecord.disabled=true};rec.start();EXAM.recording.rec=rec;btnRecord.textContent='Detener grabación'}catch(e){alert('No se pudo iniciar la grabación de pantalla: '+e.message)}
});

btnStart.addEventListener('click',()=>{
  const flat=flattenBank(QUESTIONS_BANK);
  if(!flat.length){alert('No hay banco de preguntas cargado.');return;}
  EXAM.items=pick42(flat);EXAM.i=0;EXAM.answers=Array(EXAM.items.length).fill(null);qTotal.textContent=EXAM.items.length;
  const qs=new URLSearchParams(location.search);const overrideMin=parseInt(qs.get('mins'));const duration=Number.isFinite(overrideMin)?overrideMin*60*1000:DEFAULT_DURATION_MS;
  EXAM.deadline=Date.now()+duration;startTimer();welcome.style.display='none';results.style.display='none';exam.style.display='block';renderQuestion();
});

function startTimer(){const total=EXAM.deadline-Date.now();const totalMs=Math.max(total,0);tick();EXAM.timerId=setInterval(tick,1000);function tick(){const now=Date.now();const left=Math.max(EXAM.deadline-now,0);updateClock(left);const ratio=1-(left/totalMs);bar.style.width=`${Math.max(0,Math.min(1,ratio))*100}%`;if(left<=0){finalize('time');}}}
function updateClock(ms){const sec=Math.floor(ms/1000)%60;const min=Math.floor(ms/(60*1000))%60;const hrs=Math.floor(ms/(60*60*1000));const pad=n=>String(n).padStart(2,'0');timerEl.textContent=`${pad(hrs)}:${pad(min)}:${pad(sec)}`;timerEl.style.background=ms<5*60*1000?'rgba(239,68,68,.2)':''}

function renderQuestion(){const item=EXAM.items[EXAM.i];qIndex.textContent=EXAM.i+1;qTitle.textContent=`Pregunta ${EXAM.i+1}`;qText.textContent=item.question;const multi=(item.answer_letters||[]).length>1;modePill.textContent=multi?'Selección múltiple':'Única respuesta';const opts=(item.options||[]).map(o=>({label:o.label,text:o.text,correct:(item.answer_letters||[]).includes(o.label)}));for(let i=opts.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[opts[i],opts[j]]=[opts[j],opts[i]]}options.innerHTML='';opts.forEach((o,idx)=>{const id=`opt_${EXAM.i}_${idx}`;const wrap=document.createElement('label');wrap.className='opt';const input=document.createElement('input');input.type=multi?'checkbox':'radio';input.name='q';input.value=o.label;input.id=id;const span=document.createElement('div');span.innerHTML=`<div><strong>${o.label.toUpperCase()}.</strong> ${escapeHtml(o.text||'')}</div>`;wrap.appendChild(input);wrap.appendChild(span);options.appendChild(wrap);});btnNext.textContent=(EXAM.i===EXAM.items.length-1)?'Finalizar →':'Continuar →'}

btnNext.addEventListener('click',(e)=>{e.preventDefault();const selected=[...options.querySelectorAll('input:checked')].map(x=>x.value);if(selected.length===0){alert('Selecciona al menos una opción.');return;}EXAM.answers[EXAM.i]=selected.sort();if(EXAM.i===EXAM.items.length-1){finalize('manual')}else{EXAM.i++;renderQuestion();}});
btnFinish.addEventListener('click',(e)=>{e.preventDefault();if(confirm('¿Deseas finalizar el examen? No podrás volver atrás.'))finalize('manual')});

function finalize(reason){clearInterval(EXAM.timerId);if(EXAM.recording&&EXAM.recording.rec&&EXAM.recording.rec.state!=='inactive'){try{EXAM.recording.rec.stop()}catch{}}const total=EXAM.items.length;let correct=0;for(let i=0;i<total;i++){const item=EXAM.items[i];const need=(item.answer_letters||[]).slice().sort();const got=(EXAM.answers[i]||[]).slice().sort();if(JSON.stringify(need)===JSON.stringify(got))correct++}const nota=(correct/total)*20;exam.style.display='none';results.style.display='block';scoreEl.textContent=`${nota.toFixed(2)} / 20 (aciertos: ${correct}/${total})`}
btnDownload.addEventListener('click',()=>{if(!EXAM.recording||!EXAM.recording.chunks||EXAM.recording.chunks.length===0){alert('No hay grabación disponible.');return;}const blob=new Blob(EXAM.recording.chunks,{type:'video/webm'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`examen-${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.webm`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),10000)});
btnRestart?.addEventListener('click',()=>{location.reload()});
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",""":"&quot;","'":"&#39;"}[c]))}
