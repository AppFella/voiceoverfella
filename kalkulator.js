(function(){
  const NS='http://www.w3.org/2000/svg';
  const el=(t,c,html)=>{const e=document.createElement(t);if(c)e.className=c;if(html!=null)e.innerHTML=html;return e;};
  const svgEl=(t,attrs)=>{const e=document.createElementNS(NS,t);for(const k in attrs)e.setAttribute(k,attrs[k]);return e;};
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const pt=(cx,cy,r,a)=>{const rad=a*Math.PI/180;return [cx+r*Math.sin(rad),cy-r*Math.cos(rad)];};
  function arcPath(cx,cy,r,a1,a2){const [x1,y1]=pt(cx,cy,r,a1),[x2,y2]=pt(cx,cy,r,a2);
    const large=Math.abs(a2-a1)>180?1:0,sweep=a2>=a1?1:0;
    return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${large} ${sweep} ${x2.toFixed(2)} ${y2.toFixed(2)}`;}

  /* ---------- Chassis ---------- */
  function chassis(title,{onair=false,vu=0}={}){
    const rack=el('div','rack');
    ['tl','bl','tr','br'].forEach(p=>{rack.appendChild(el('div','slot '+p));rack.appendChild(el('div','screw '+p));});
    const t=el('div','rack-title',title);rack.appendChild(t);
    if(onair){rack.appendChild(el('div','onair','<span class="led"></span>ON AIR'));}
    for(let i=0;i<vu;i++){rack.appendChild(makeVU(i>0));}
    const body=el('div','rack-body');rack.appendChild(body);
    rack._body=body;return rack;
  }

  /* ---------- VU-Meter ---------- */
  const vuNeedles=[];
  function makeVU(second){
    const box=el('div','vu'+(second?' second':''));
    const svg=svgEl('svg',{viewBox:'0 0 78 44'});
    for(let i=0;i<=10;i++){const a=-52+ (104*i/10); const [x1,y1]=pt(39,40,22,a),[x2,y2]=pt(39,40,26,a);
      const ln=svgEl('line',{x1,y1,x2,y2,class:'vu-tick'+(i>=8?' hot':'')});svg.appendChild(ln);}
    const nd=svgEl('line',{x1:39,y1:40,x2:39,y2:14,class:'vu-needle'});svg.appendChild(nd);
    const lb=svgEl('text',{x:39,y:38,'text-anchor':'middle',class:'vu-label'});lb.textContent='VU';svg.appendChild(lb);
    box.appendChild(svg);
    vuNeedles.push({nd,seed:Math.random()*100,cur:0.4,kick:0});
    return box;
  }
  // lebendige Nadelbewegung
  let vuT=0;
  function vuLoop(){
    vuT+=0.016;
    vuNeedles.forEach(v=>{
      const slow=Math.sin(vuT*0.8+v.seed)*0.5+Math.sin(vuT*1.5+v.seed*1.4)*0.3;
      let target=clamp(0.42+slow*0.16+v.kick,0.06,0.97);
      v.cur+=(target-v.cur)*0.05;            // starkes Glätten → ruhige Bewegung
      const ang=-52+104*v.cur;
      v.nd.setAttribute('transform',`rotate(${ang.toFixed(2)} 39 40)`);
      v.kick*=0.95;
    });
    requestAnimationFrame(vuLoop);
  }
  function vuKick(amt){vuNeedles.forEach(v=>v.kick=Math.min(0.5,v.kick+(amt||0.3)));}

  /* ---------- Druckknöpfe (Radio) ---------- */
  function pushGroup(options,onchange,colors){
    const row=el('div','pushrow');const btns=[];
    options.forEach((o,i)=>{
      const b=el('div','push'+(i===0?' on':''),
        '<span class="cap-led"></span><span class="cap"></span><span class="lbl">'+o+'</span>');
      const col=colors&&colors[i];
      if(col){b.style.setProperty('--c',col.c);b.style.setProperty('--cl',col.l);b.style.setProperty('--cd',col.d);b.style.setProperty('--cg',col.g);}
      b.addEventListener('click',()=>{btns.forEach(x=>x.classList.remove('on'));b.classList.add('on');vuKick(.35);onchange&&onchange(i,o);});
      btns.push(b);row.appendChild(b);
    });
    return row;
  }

  /* ---------- Kippschalter (Radio) ---------- */
  function rockerGroup(options,active,onchange){
    const row=el('div','rockrow');const items=[];
    options.forEach((o,i)=>{
      if(i>0)row.appendChild(el('div','wire'));
      const r=el('div','rocker'+(i===active?' on':''),
        '<div class="rk"><div class="win"></div></div><span class="lbl">'+o+'</span>');
      r.addEventListener('click',()=>{items.forEach(x=>x.classList.remove('on'));r.classList.add('on');vuKick(.3);onchange&&onchange(i,o);});
      items.push(r);row.appendChild(r);
    });
    return row;
  }
  // Nutzungsrechte mit Digital-Erklärung (Pixel-Font)
  function nutzungsrechte(){
    const DESCS=['Nur privat, keine Veröffentlichung','Eigene Kanäle & Social ohne Media-Budget','TV, Radio & bezahlte Ads mit Media-Buy'];
    const wrap=el('div','rights');
    const lcd=el('div','lcd','<span class="lcd-text"></span>');
    const rk=rockerGroup(['PRIVAT','UNBEZAHLTE MEDIEN','BEZAHLTE MEDIEN'],1,i=>{lcd.querySelector('.lcd-text').textContent=DESCS[i];});
    wrap.appendChild(rk);wrap.appendChild(lcd);
    lcd.querySelector('.lcd-text').textContent=DESCS[1];
    return wrap;
  }
  // Vertikaler Fader (Lautstärke-Optik) für GEBIET
  function vfader(ticks){
    const wrap=el('div','vfader');const track=el('div','vtrack');const fill=el('div','vfill');const cap=el('div','vcap');
    track.appendChild(fill);track.appendChild(cap);
    const scale=el('div','vscale');const tks=[];const n=ticks.length;
    ticks.forEach((t,i)=>{const p=100*i/(n-1);
      const label=typeof t==='string'?t:t.n;const icon=(t&&t.icon)?t.icon:'';
      const tk=el('div','vtk','<span class="vm"></span>'+(icon?'<span class="vi">'+icon+'</span>':'')+'<span class="vn">'+label+'</span>');
      tk.style.bottom=p+'%';tk.dataset.p=p;tk.addEventListener('click',()=>setIdx(i));scale.appendChild(tk);tks.push(tk);});
    wrap.appendChild(track);wrap.appendChild(scale);
    let idx=0;
    function setPct(p){cap.style.bottom=p+'%';fill.style.height=p+'%';}
    function setIdx(i){idx=clamp(i,0,n-1);setPct(+tks[idx].dataset.p);tks.forEach((t,j)=>t.classList.toggle('act',j===idx));vuKick(.35);}
    function nearest(p){let best=0,bd=1e9;tks.forEach((t,j)=>{const d=Math.abs(+t.dataset.p-p);if(d<bd){bd=d;best=j;}});return best;}
    function drag(cy){const r=track.getBoundingClientRect();let p=clamp((r.bottom-cy)/r.height*100,0,100);cap.style.bottom=p+'%';fill.style.height=p+'%';}
    let dragging=false;
    const down=e=>{dragging=true;cap.classList.add('drag');drag(e.touches?e.touches[0].clientY:e.clientY);e.preventDefault();};
    const move=e=>{if(!dragging)return;drag(e.touches?e.touches[0].clientY:e.clientY);};
    const up=e=>{if(!dragging)return;dragging=false;cap.classList.remove('drag');setIdx(nearest(parseFloat(cap.style.bottom)));};
    cap.addEventListener('mousedown',down);track.addEventListener('mousedown',down);
    window.addEventListener('mousemove',move);window.addEventListener('mouseup',up);
    cap.addEventListener('touchstart',down,{passive:false});window.addEventListener('touchmove',move,{passive:false});window.addEventListener('touchend',up);
    setIdx(idx);return wrap;
  }
  // Kombiniert: Nutzungsdauer (Knob) + Gebiet (vertikaler Fader)
  const ICON_FLAG='<svg viewBox="0 0 24 24" width="17" height="17"><path d="M5.5 3v18" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"/><path d="M6.5 4h11l-2.4 4 2.4 4h-11z" fill="#fff"/></svg>';
  const ICON_GLOBE='<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="#fff" stroke-width="1.6"><circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/><path d="M5 7.5h14M5 16.5h14"/></svg>';
  const ICON_EU=(function(){let s='<svg viewBox="0 0 24 24" width="17" height="17">';for(let k=0;k<12;k++){const a=k*Math.PI/6;const x=(12+8*Math.sin(a)).toFixed(1),y=(12-8*Math.cos(a)).toFixed(1);s+='<circle cx="'+x+'" cy="'+y+'" r="1.3" fill="#fff"/>';}return s+'</svg>';})();
  function dauerGebiet(){
    const wrap=el('div','duo');
    const c1=el('div','duo-col');c1.appendChild(el('div','duo-cap','NUTZUNGSDAUER'));
    c1.appendChild(knob(['1 JAHR','2 JAHRE','∞'],{big:true,sweepStart:-80,sweepEnd:80}));
    const c2=el('div','duo-col');c2.appendChild(el('div','duo-cap','GEBIET'));
    c2.appendChild(vfader([{n:'1 LAND',icon:ICON_FLAG},{n:'EUROPAWEIT',icon:ICON_EU},{n:'WELTWEIT',icon:ICON_GLOBE}]));
    wrap.appendChild(c1);wrap.appendChild(c2);return wrap;
  }
  // TAKES: 4 Regler (0–9) mit je einem einstelligen Digital-Fenster → 0000–9999
  function takesControl(){
    const wrap=el('div','takes');
    const rowc=el('div','takes-row');
    for(let d=0;d<4;d++){
      const col=el('div','take-col');
      const seg=el('div','seg7','<span class="seg7-num">0</span>');
      const num=seg.querySelector('.seg7-num');
      col.appendChild(knob(['0','1','2','3','4','5','6','7','8','9'],
        {big:false,sweepStart:-135,sweepEnd:135,showLabels:false,knobPx:70,stagePx:120,initial:0,onchange:i=>{num.textContent=i;}}));
      col.appendChild(seg);
      rowc.appendChild(col);
    }
    wrap.appendChild(rowc);
    wrap.appendChild(el('div','takes-anzahl','ANZAHL'));
    return wrap;
  }

  /* ---------- Fader ---------- */
  function fader(ticks,unit){
    const positions=[4,13,22,31,40,49,65,82,96]; // nicht-lineare Prozent-Positionen
    const wrap=el('div','fader');
    const track=el('div','track');
    const fill=el('div','fill');
    const cap=el('div','cap');
    track.appendChild(fill);track.appendChild(cap);
    const scale=el('div','scale');
    const tks=[];
    ticks.forEach((t,i)=>{
      const p=positions[i]!=null?positions[i]:(100*i/(ticks.length-1));
      const tk=el('div','tk','<span class="m"></span><span class="n">'+t+'</span>');
      tk.style.left=p+'%';tk.dataset.p=p;tk.dataset.i=i;
      tk.addEventListener('click',()=>setIdx(i));
      scale.appendChild(tk);tks.push(tk);
    });
    const u=el('span','unit',unit||'');scale.appendChild(u);
    wrap.appendChild(track);wrap.appendChild(scale);

    let idx=5;
    function setPct(p,smooth){cap.style.left=p+'%';fill.style.width=p+'%';}
    function setIdx(i){idx=clamp(i,0,ticks.length-1);const p=+tks[idx].dataset.p;setPct(p);
      tks.forEach((t,j)=>t.classList.toggle('act',j===idx));vuKick(.35);}
    function nearest(p){let best=0,bd=1e9;tks.forEach((t,j)=>{const d=Math.abs(+t.dataset.p-p);if(d<bd){bd=d;best=j;}});return best;}
    // Drag
    function drag(clientX){const r=track.getBoundingClientRect();let p=clamp((clientX-r.left)/r.width*100,0,100);
      cap.style.left=p+'%';fill.style.width=p+'%';}
    let dragging=false;
    const down=e=>{dragging=true;cap.classList.add('drag');const x=(e.touches?e.touches[0].clientX:e.clientX);drag(x);e.preventDefault();};
    const move=e=>{if(!dragging)return;drag(e.touches?e.touches[0].clientX:e.clientX);};
    const up=e=>{if(!dragging)return;dragging=false;cap.classList.remove('drag');
      const p=parseFloat(cap.style.left);setIdx(nearest(p));};
    cap.addEventListener('mousedown',down);track.addEventListener('mousedown',down);
    window.addEventListener('mousemove',move);window.addEventListener('mouseup',up);
    cap.addEventListener('touchstart',down,{passive:false});window.addEventListener('touchmove',move,{passive:false});window.addEventListener('touchend',up);
    setIdx(idx);
    return wrap;
  }

  /* ---------- Knob ---------- */
  function knob(detents,{big=true,sweepStart=-135,sweepEnd=135,unit='',labelEvery=1,readout=null,readout2=null,showLabels=true,onchange=null,knobPx=null,stagePx=null,initial=null}={}){
    const size=knobPx||(big?150:104);const stageSize=stagePx||(big?250:190);const cx=stageSize/2,cy=stageSize/2;
    const rLabel=big?stageSize/2-14:stageSize/2-12;const rTickO=size/2+ (big?26:20),rTickI=size/2+ (big?16:12);
    const rArc=size/2+ (big?21:16);
    const wrap=el('div','knob-wrap');
    const stage=el('div','knob-stage');stage.style.width=stageSize+'px';stage.style.height=stageSize+'px';
    const svg=svgEl('svg',{viewBox:`0 0 ${stageSize} ${stageSize}`});
    const bg=svgEl('path',{class:'karc-bg',d:arcPath(cx,cy,rArc,sweepStart,sweepEnd)});svg.appendChild(bg);
    const arc=svgEl('path',{class:'karc',d:''});svg.appendChild(arc);
    const n=detents.length;
    const angleOf=i=>sweepStart+(sweepEnd-sweepStart)*(n===1?0:i/(n-1));
    const tickEls=[],labelEls={};
    detents.forEach((d,i)=>{
      const a=angleOf(i);
      const major=(i%labelEvery===0)||i===0||i===n-1;
      const [x1,y1]=pt(cx,cy,rTickI+(major?0:5),a),[x2,y2]=pt(cx,cy,rTickO,a);
      const tk=svgEl('line',{x1,y1,x2,y2,class:'ktick'+(major?' major':'')});svg.appendChild(tk);tickEls.push(tk);
      if(major&&showLabels){
        const [lx,ly]=pt(cx,cy,rLabel,a);
        const tx=svgEl('text',{x:lx,y:ly+(d==='∞'?7:4),'text-anchor':(lx<cx-4?'end':lx>cx+4?'start':'middle'),class:'klabel'+(d==='∞'?' inf':'')});
        tx.textContent=d;svg.appendChild(tx);labelEls[i]=tx;
        tx.style.cursor='pointer';tx.addEventListener('click',()=>setIdx(i));
      }
    });
    stage.appendChild(svg);
    const kb=el('div','knob','<span class="pointer"></span>');
    kb.style.width=size+'px';kb.style.height=size+'px';
    stage.appendChild(kb);wrap.appendChild(stage);
    let readoutEl=null,readout2El=null;
    if(readout){
      const rr=el('div','kreadout-row');
      readoutEl=el('div','kreadout','<span class="kr-num">–</span> '+readout);rr.appendChild(readoutEl);
      if(readout2){readout2El=el('div','kreadout kr2','<span class="kr-num">–</span> '+(readout2.unit||''));rr.appendChild(readout2El);}
      wrap.appendChild(rr);
    }
    else if(unit){const u=el('div','kunit',unit);wrap.appendChild(u);}

    let idx=(initial!=null?initial:Math.floor(n/2));
    function apply(a){kb.style.setProperty('--ang',a+'deg');arc.setAttribute('d',arcPath(cx,cy,rArc,sweepStart,a));}
    function nearest(a){let best=0,bd=1e9;for(let i=0;i<n;i++){const d=Math.abs(angleOf(i)-a);if(d<bd){bd=d;best=i;}}return best;}
    function updReadout(i){if(readoutEl)readoutEl.querySelector('.kr-num').textContent=detents[i];
      if(readout2El)readout2El.querySelector('.kr-num').textContent=readout2.fn(+detents[i]);}
    function setIdx(i){idx=clamp(i,0,n-1);const a=angleOf(idx);apply(a);
      tickEls.forEach((t,j)=>t.classList.toggle('act',j===idx));
      for(const k in labelEls)labelEls[k].classList.toggle('act',+k===idx);
      updReadout(idx);if(onchange)onchange(idx);vuKick(.4);}
    let dragging=false;
    function angFromEvent(clientX,clientY){const r=kb.getBoundingClientRect();const dx=clientX-(r.left+r.width/2),dy=clientY-(r.top+r.height/2);
      let a=Math.atan2(dx,-dy)*180/Math.PI;return clamp(a,sweepStart,sweepEnd);}
    const down=e=>{dragging=true;kb.classList.add('drag');e.preventDefault();};
    const move=e=>{if(!dragging)return;const x=e.touches?e.touches[0].clientX:e.clientX,y=e.touches?e.touches[0].clientY:e.clientY;
      const a=angFromEvent(x,y);apply(a);updReadout(nearest(a));};
    const up=e=>{if(!dragging)return;dragging=false;kb.classList.remove('drag');
      const cur=parseFloat(kb.style.getPropertyValue('--ang'))||0;setIdx(nearest(cur));};
    kb.addEventListener('mousedown',down);window.addEventListener('mousemove',move);window.addEventListener('mouseup',up);
    kb.addEventListener('touchstart',down,{passive:false});window.addEventListener('touchmove',move,{passive:false});window.addEventListener('touchend',up);
    setIdx(idx);
    return wrap;
  }

  /* ---------- Hebelschalter ---------- */
  function lever(topLabel,botLabel){
    const wrap=el('div','lever-wrap');
    const top=el('div','lever-lbl top hot',topLabel);
    const lv=el('div','lever','<div class="base"></div><div class="nut"></div><div class="bat"><div class="stem"></div><div class="tip"></div></div>');
    const bot=el('div','lever-lbl bot',botLabel);
    wrap.appendChild(top);wrap.appendChild(lv);wrap.appendChild(bot);
    let up=true;
    function set(u){up=u;lv.querySelector('.bat').style.setProperty('--rx',(up?-16:196)+'deg');
      top.classList.toggle('hot',up);bot.classList.toggle('hot',!up);vuKick(.35);}
    lv.addEventListener('click',()=>set(!up));
    set(true);
    return wrap;
  }

  /* ---------- Genre-Konfiguration ---------- */
  const GENRES={
    allgemein:[
      {title:'NUTZUNGSRECHTE',build:()=>nutzungsrechte()},
      {title:'LÄNGE',build:()=>fader(['0','1','2','3','4','5','10','20','30'],'MIN')},
      {title:'NUTZUNGSDAUER · GEBIET',build:()=>dauerGebiet()},
    ],
    hoerbuch:[
      {title:'LÄNGE',vu:2,build:()=>knob(Array.from({length:31},(_,i)=>String(i)),{big:true,sweepStart:-135,sweepEnd:135,labelEvery:5,readout:'STD',readout2:{unit:'WÖRTER',fn:v=>(v*7500).toLocaleString('de-DE')}})},
      {title:'VERARBEITUNG',build:()=>lever('GEMASTERED','NICHT GEMASTERED')},
    ],
    games:[
      {title:'TAKES',onair:true,vu:1,build:()=>takesControl()},
      {title:'AUFTEILUNG',build:()=>lever('EINE DATEI FÜR ALLE TAKES','EINE DATEI PRO TAKE')},
    ],
  };

  const stack=document.getElementById('stack');
  let currentGenre='allgemein';
  function buildGenre(key){
    currentGenre=key;
    // VU-Referenzen der alten Racks entfernen
    vuNeedles.length=0;
    stack.innerHTML='';
    GENRES[key].forEach((cfg,i)=>{
      const rack=chassis(cfg.title,{onair:cfg.onair,vu:cfg.vu||0});
      rack.classList.add('swap');
      rack._body.appendChild(cfg.build());
      stack.appendChild(rack);
      setTimeout(()=>rack.classList.add('in'),40+i*110);
    });
  }

  // GENRE-Streifen (immer gleich)
  const gr=chassis('GENRE');
  gr._body.appendChild(pushGroup(['ALLGEMEIN','HÖRBUCH','GAMES'],(i,name)=>{
    buildGenre(['allgemein','hoerbuch','games'][i]);
  },[
    {c:'#FF3D2E',l:'#ff8a72',d:'#D92A1C',g:'255,61,46'},   // ALLGEMEIN — rot
    {c:'#2EC16B',l:'#7be6a8',d:'#1a7d42',g:'46,193,107'},  // HÖRBUCH — grün
    {c:'#3A8DFF',l:'#8fc0ff',d:'#1f5fbf',g:'58,141,255'},  // GAMES — blau
  ]));
  document.getElementById('genreRack').appendChild(gr);

  buildGenre('allgemein');

  /* ---------- Kalkulations-Rack (immer unten) ---------- */
  function countTo(elm,target){const t0=performance.now();function tick(t){const p=Math.min(1,(t-t0)/750),e=1-Math.pow(1-p,3);elm.textContent=Math.round(target*e).toLocaleString('de-DE');if(p<1)requestAnimationFrame(tick);}requestAnimationFrame(tick);}
  // ---- Preis-Berechnung ----
  function computePrice(){
    const t=sel=>((document.querySelector(sel)||{}).textContent||'').trim();
    let price;
    if(currentGenre==='allgemein'){
      const recht=t('#stack .rocker.on .lbl');
      const minuten=parseInt(t('#stack .fader .tk.act .n')||'0',10)||0;
      const jahreLbl=t('#stack .duo .knob-wrap .klabel.act');
      const jahr=jahreLbl==='∞'?3:(jahreLbl==='2 JAHRE'?2:1);
      const gebiet=/WELT/.test(t('#stack .duo .vtk.act .vn'))?3:(/EUROPA/.test(t('#stack .duo .vtk.act .vn'))?2:1);
      if(recht==='PRIVAT'){
        price=100*minuten;                                     // Jahre + Gebiet ignoriert
      } else if(/UNBEZAHLTE/.test(recht)){
        const base=minuten<=2?350:(minuten<=5?500:500+100*((minuten-5)/5));
        price=base*gebiet;                                     // Jahre ignoriert
      } else {                                                  // BEZAHLTE MEDIEN
        price=600*jahr*gebiet;                                 // Minuten ignoriert
      }
    } else if(currentGenre==='hoerbuch'){
      const stunden=parseInt(t('#stack .kreadout .kr-num')||'0',10)||0;
      const rate=/NICHT/.test(t('#stack .lever-lbl.hot'))?350:400;   // gemastered 400 / nicht 350
      price=rate*stunden;
    } else if(currentGenre==='games'){
      const takes=parseInt([...document.querySelectorAll('#stack .seg7-num')].map(s=>s.textContent).join(''),10)||0;
      const perTake=/PRO TAKE/.test(t('#stack .lever-lbl.hot'))?4.5:3;  // pro Take 4,50 / alle Takes 3
      price=100+takes*perTake;
    } else return null;
    return Math.max(100,Math.round(price*100)/100);
  }

  function buildCalcRack(){
    const rack=chassis('PREIS',{onair:true});rack.classList.add('calc-rack');
    const body=rack._body;
    const row=el('div','deck-row');

    // --- Transport-Tasten (Audio-Player) ---
    const ICON={
      rew:'<svg viewBox="0 0 24 24"><path d="M11 6 4 12l7 6zM20 6l-7 6 7 6z"/></svg>',
      play:'<svg viewBox="0 0 24 24"><path d="M7 5v14l12-7z"/></svg>',
      pause:'<svg viewBox="0 0 24 24"><rect x="6.5" y="5" width="4" height="14" rx="1"/><rect x="13.5" y="5" width="4" height="14" rx="1"/></svg>',
      stop:'<svg viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>',
      fwd:'<svg viewBox="0 0 24 24"><path d="M13 6l7 6-7 6zM4 6l7 6-7 6z"/></svg>',
      rec:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="6"/></svg>'
    };
    const transport=el('div','transport');
    [['rew','deco'],['play','main'],['pause','deco'],['stop'],['fwd','deco'],['rec','deco']].forEach(([k,cls])=>{
      const b=el('button','tbtn '+k+(cls?' '+cls:''),ICON[k]);b.type='button';b.setAttribute('aria-label',k);
      transport.appendChild(b);
    });

    // --- Blaues Digital-Display ---
    const disp=el('div','cd-display');
    disp.innerHTML=
      '<div class="cdd-price"><span class="cdd-cur">€</span>&nbsp;<span class="cdd-num">0,00</span></div>'
      +'<div class="cdd-sub">PREIS / TOTAL</div>'
      +'<div class="cdd-foot"><div class="cdd-bar">'+Array(12).fill('<i></i>').join('')+'</div>'
      +'<div class="cdd-calc"><span class="cdd-led"></span>CALC</div></div>';

    row.appendChild(transport);row.appendChild(disp);
    const actions=el('div','pp-actions');actions.style.display='none';
    actions.innerHTML='<button type="button" class="pp-btn primary" id="ppOffer">Angebot anfragen</button>'
      +'<a class="pp-btn wa" href="https://wa.me/491713473248?text=Hallo%20Dominik%2C%20ich%20h%C3%A4tte%20eine%20Frage%20zu%20meinem%20Voice-Over-Projekt." target="_blank" rel="noopener">'
      +'<svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.5 15.3L2 22l4.8-1.5A10 10 0 1 0 12 2zm5.8 14.2c-.25.7-1.24 1.3-1.7 1.35-.44.05-.98.07-1.58-.1-.36-.11-.83-.27-1.43-.53-2.5-1.08-4.14-3.6-4.26-3.77-.13-.17-1.02-1.36-1.02-2.6 0-1.23.65-1.83.88-2.08.23-.25.5-.31.67-.31l.48.01c.15.01.36-.06.56.43.2.5.7 1.73.76 1.85.06.12.1.27.02.44-.08.17-.12.27-.25.42l-.37.43c-.12.12-.25.26-.11.5.14.25.62 1.02 1.33 1.65.91.81 1.68 1.07 1.92 1.19.24.12.38.1.52-.06.14-.17.6-.7.76-.94.16-.24.32-.2.54-.12.22.08 1.4.66 1.64.78.24.12.4.18.46.28.06.1.06.6-.19 1.3z"/></svg>'
      +'Schnell per WhatsApp quatschen</a>';
    body.appendChild(row);body.appendChild(actions);

    const numEl=disp.querySelector('.cdd-num');
    const bars=[...disp.querySelectorAll('.cdd-bar i')];
    const playBtn=transport.querySelector('.tbtn.play');
    let busy=false,lastPrice=null;
    const fmt=n=>n.toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2});

    function reset(){busy=false;disp.classList.remove('calc','done');playBtn.classList.remove('active');
      numEl.textContent='0,00';bars.forEach(b=>b.classList.remove('on'));actions.style.display='none';}

    function calc(){
      if(busy)return;busy=true;actions.style.display='none';
      disp.classList.add('calc');disp.classList.remove('done');playBtn.classList.add('active');vuKick(0.5);
      bars.forEach(b=>b.classList.remove('on'));
      const real=computePrice();
      const target=(real!=null)?real:(890+Math.floor(Math.random()*46)*10);   // ALLGEMEIN: echt · GAMES/HÖRBUCH: Platzhalter
      let seg=0;const segTimer=setInterval(()=>{ if(seg<bars.length){bars[seg++].classList.add('on');vuKick(.08);} else clearInterval(segTimer); },100);
      setTimeout(()=>{
        const t0=performance.now(),dur=900;
        (function tick(t){const p=Math.min(1,(t-t0)/dur),e=1-Math.pow(1-p,3);numEl.textContent=fmt(target*e);
          if(p<1)requestAnimationFrame(tick);
          else{disp.classList.remove('calc');disp.classList.add('done');playBtn.classList.remove('active');actions.style.display='flex';busy=false;lastPrice=target;}
        })(performance.now());
      },700);
    }

    playBtn.addEventListener('click',calc);
    transport.querySelector('.tbtn.stop').addEventListener('click',reset);
    ['pause','rew','fwd','rec'].forEach(k=>transport.querySelector('.tbtn.'+k).addEventListener('click',()=>vuKick(.2)));
    actions.querySelector('#ppOffer').addEventListener('click',()=>openModal());
    return rack;
  }
  // ---- Angebots-Maske (Modal) ----
  function collectSettings(){
    const items=[];
    const genre=document.querySelector('#genreRack .push.on .lbl');
    if(genre)items.push({k:'Genre',v:genre.textContent.trim()});
    document.querySelectorAll('#stack .rack').forEach(rack=>{
      const title=((rack.querySelector('.rack-title')||{}).textContent||'').trim();
      let v='';
      if(rack.querySelector('.takes')){
        v=[...rack.querySelectorAll('.seg7-num')].map(s=>s.textContent).join('')+' Takes';
      } else if(rack.querySelector('.duo')){
        const dauer=((rack.querySelector('.knob-wrap .klabel.act')||{}).textContent||'–').trim();
        const gebiet=((rack.querySelector('.vtk.act .vn')||{}).textContent||'–').trim();
        items.push({k:'Nutzungsdauer',v:dauer});items.push({k:'Gebiet',v:gebiet});return;
      } else if(rack.querySelector('.rocker.on')){
        v=(rack.querySelector('.rocker.on .lbl')||{}).textContent||'';
      } else if(rack.querySelector('.fader')){
        v=(((rack.querySelector('.tk.act .n')||{}).textContent||'')+' '+((rack.querySelector('.fader .unit')||{}).textContent||'')).trim();
      } else if(rack.querySelector('.kreadout')){
        v=[...rack.querySelectorAll('.kreadout')].map(r=>r.textContent.replace(/\s+/g,' ').trim()).join(' · ');
      } else if(rack.querySelector('.lever')){
        v=(rack.querySelector('.lever-lbl.hot')||{}).textContent||'';
      } else if(rack.querySelector('.klabel.act')){
        v=(rack.querySelector('.klabel.act')||{}).textContent||'';
      }
      if(title&&title!=='PREIS')items.push({k:title,v:(v||'').trim()});
    });
    return items;
  }

  const modal=el('div','modal-overlay');
  modal.innerHTML=
    '<div class="modal">'
    +'<button type="button" class="modal-x" aria-label="Schließen">×</button>'
    +'<div class="modal-head"><h3>Unverbindliches Angebot anfragen</h3>'
      +'<span class="modal-badge">⚡ Antwort innerhalb von 8 Stunden</span></div>'
    +'<div class="modal-config"><span class="mc-label">Deine Konfiguration</span><div class="mc-list"></div></div>'
    +'<form class="modal-form" name="angebot" data-netlify="true" netlify-honeypot="bot-field" enctype="multipart/form-data" novalidate>'
      +'<input type="hidden" name="form-name" value="angebot">'
      +'<input name="bot-field" style="display:none" tabindex="-1" autocomplete="off">'
      +'<input type="hidden" name="konfiguration">'
      +'<input type="hidden" name="preis">'
      +'<input type="hidden" name="demo">'
      +'<div class="frow"><label>Vorname<sup class="req">*</sup><input name="vorname" required></label><label>Name<sup class="req">*</sup><input name="name" required></label></div>'
      +'<label>Firma<input name="firma"></label>'
      +'<div class="frow"><label class="f-plz">PLZ<sup class="req">*</sup><input name="plz" inputmode="numeric" required></label><label>Straße &amp; Nr.<sup class="req">*</sup><input name="strasse" required></label></div>'
      +'<div class="script-block"><span class="sb-label">Skript</span><div class="script-row">'
        +'<textarea name="skript" placeholder="Kurzes Skript hier direkt einfügen …"></textarea>'
        +'<span class="script-or">oder</span>'
        +'<label class="dropzone"><input type="file" name="datei" accept=".pdf,.doc,.docx,.txt" hidden>'
          +'<span class="dz-icon">⬆</span><span class="dz-text">Datei hochladen<small>PDF · Word · TXT</small></span></label>'
      +'</div></div>'
      +'<div class="demo-opt"><span class="do-label">Kostenlose Demo deines Textes?</span>'
        +'<div class="do-toggle"><button type="button" class="do-btn on" data-v="ja">Ja</button><button type="button" class="do-btn" data-v="nein">Nein</button></div></div>'
      +'<span class="modal-badge sub">🎁 Kostenlose Demo innerhalb von 24 Stunden</span>'
      +'<div class="modal-actions"><p class="req-note"><span class="req">*</span> Pflichtfeld</p>'
        +'<button type="submit" class="pp-btn primary">Angebot anfordern</button></div>'
    +'</form>'
    +'<div class="modal-done" hidden><div class="md-check">✓</div><h3>Danke!</h3><p class="md-text"></p>'
      +'<button type="button" class="pp-btn ghost md-close">Schließen</button></div>'
    +'</div>';
  document.body.appendChild(modal);

  const mform=modal.querySelector('.modal-form');
  const fileInput=modal.querySelector('input[type=file]');
  function openModal(){
    const list=modal.querySelector('.mc-list');list.innerHTML='';
    collectSettings().forEach(it=>list.appendChild(el('div','mc-item','<span>'+it.k+'</span><b>'+(it.v||'–')+'</b>')));
    mform.hidden=false;modal.querySelector('.modal-config').hidden=false;modal.querySelector('.modal-done').hidden=true;
    modal.classList.add('show');document.body.style.overflow='hidden';
  }
  function closeModal(){modal.classList.remove('show');document.body.style.overflow='';}
  modal.querySelector('.modal-x').addEventListener('click',closeModal);
  modal.querySelector('.md-close').addEventListener('click',closeModal);
  modal.addEventListener('click',e=>{if(e.target===modal)closeModal();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal();});
  fileInput.addEventListener('change',()=>{const f=fileInput.files[0];const dz=modal.querySelector('.dz-text');
    dz.innerHTML=f?('<b>'+f.name+'</b><small>Datei ausgewählt</small>'):'Datei hochladen<small>PDF · Word · TXT</small>';
    modal.querySelector('.dropzone').classList.toggle('has',!!f);});
  modal.querySelectorAll('.do-btn').forEach(b=>b.addEventListener('click',()=>{
    modal.querySelectorAll('.do-btn').forEach(x=>x.classList.remove('on'));b.classList.add('on');}));
  mform.addEventListener('submit',e=>{
    e.preventDefault();
    const req=[...mform.querySelectorAll('[required]')];req.forEach(x=>x.classList.toggle('invalid',!x.value.trim()));
    if(req.some(x=>!x.value.trim())){req.find(x=>!x.value.trim()).focus();return;}
    const demo=(((modal.querySelector('.do-btn.on')||{}).dataset||{}).v==='nein')?'Nein':'Ja';
    mform.elements['demo'].value=demo;
    mform.elements['konfiguration'].value=collectSettings().map(it=>it.k+': '+(it.v||'–')).join('\n');
    const preisAnzeige=(document.querySelector('.cdd-num')||{}).textContent||'';
    mform.elements['preis'].value=preisAnzeige&&preisAnzeige!=='0,00'?preisAnzeige+' €':'(noch nicht berechnet)';
    const submitBtn=mform.querySelector('[type=submit]');
    submitBtn.disabled=true;submitBtn.textContent='Wird gesendet …';
    fetch('/',{method:'POST',body:new FormData(mform)})
      .then(r=>{if(!r.ok)throw new Error(r.status);
        mform.hidden=true;modal.querySelector('.modal-config').hidden=true;
        const done=modal.querySelector('.modal-done');done.hidden=false;
        done.querySelector('.md-text').textContent='Wir haben deine Anfrage erhalten und melden uns innerhalb von 8 Stunden.';
        vuKick(.6);})
      .catch(()=>{submitBtn.disabled=false;submitBtn.textContent='Angebot anfordern';
        let err=mform.querySelector('.form-err');
        if(!err){err=document.createElement('p');err.className='form-err';
          err.style.cssText='color:var(--red);font-family:var(--mono);font-size:.64rem;letter-spacing:.08em;margin:.4rem 0 0';
          submitBtn.parentNode.insertBefore(err,submitBtn);}
        err.textContent='Versand fehlgeschlagen – bitte schreib direkt an contact@voiceoverfella.com.';});
  });

  document.getElementById('calcRack').appendChild(buildCalcRack());

  vuLoop();
})();
