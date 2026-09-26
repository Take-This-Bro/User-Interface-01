(function(){
  const ICONS={
    home:'<path d="M4 11.5 12 5l8 6.5"/><path d="M6 10.5V19a1 1 0 0 0 1 1h4v-5h2v5h4a1 1 0 0 0 1-1v-8.5"/>',
    profile:'<circle cx="12" cy="8.5" r="3.4"/><path d="M5 20c1.2-4 4-6 7-6s5.8 2 7 6"/>',
    messages:'<path d="M4 6h16v11H8l-4 4V6Z"/><path d="M8 10h8M8 13h5"/>',
    camera:'<path d="M4 8h3l1.6-2.2h6.8L17 8h3v11H4V8Z"/><circle cx="12" cy="13.5" r="3.4"/>',
    settings:'<circle cx="12" cy="12" r="2.6"/><path d="M12 3v3M12 18v3M4 12H1M23 12h-3M6 6 4 4M20 20l-2-2M6 18l-2 2M20 4l-2 2"/>'
  };
  const root=document.documentElement;
  const dock=document.getElementById('dock');
  const plateSvg=document.getElementById('plateSvg');
  const plate=document.getElementById('plate');
  const bead=document.getElementById('bead');
  const items=Array.from(document.querySelectorAll('.item'));
  const row=document.getElementById('row');
  const titleEl=document.getElementById('title');
  const subEl=document.getElementById('sub');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;

  items.forEach(it=>{ it.querySelector('svg').innerHTML=ICONS[it.dataset.icon]; });

  // skeleton placeholder content (demo only — no real data)
  const content=document.getElementById('content');
  let sk='<div class="sk sk-hero"></div>';
  for(let i=0;i<10;i++){
    sk+='<div class="sk-row"><div class="sk sk-dot"></div><div class="sk-lines"><div class="sk sk-line w1"></div><div class="sk sk-line w2"></div></div></div>';
  }
  content.innerHTML=sk;

  const RB=16.8, S=20, BY=5, CORNER=22;
  let W=0,H=88, rects=[], active=0, curX=0, dragging=false, dockRect=null;
  let rafId=null, lastX=0, lastT=0;

  function reachOf(s){ const a=s+RB,b=s-BY; return Math.sqrt(Math.max(0,a*a-b*b)); }
  function lerp(A,B,t){ return {x:A.x+(B.x-A.x)*t, y:A.y+(B.y-A.y)*t}; }

  function buildPath(bx, sL, sR){
    const rL=reachOf(sL), rR=reachOf(sR);
    const PL1={x:bx-rL,y:0}, PR1={x:bx+rR,y:0};
    const CL={x:bx-rL,y:sL}, CR={x:bx+rR,y:sR};
    const B={x:bx,y:BY};
    const PL2=lerp(CL,B, sL/(sL+RB));
    const PR2=lerp(CR,B, sR/(sR+RB));
    return `M${CORNER} 0 L${PL1.x} 0 A${sL} ${sL} 0 0 1 ${PL2.x} ${PL2.y} A${RB} ${RB} 0 0 1 ${PR2.x} ${PR2.y} A${sR} ${sR} 0 0 1 ${PR1.x} 0 L${W-CORNER} 0 A${CORNER} ${CORNER} 0 0 1 ${W} ${CORNER} L${W} ${H-CORNER} A${CORNER} ${CORNER} 0 0 1 ${W-CORNER} ${H} L${CORNER} ${H} A${CORNER} ${CORNER} 0 0 1 0 ${H-CORNER} L0 ${CORNER} A${CORNER} ${CORNER} 0 0 1 ${CORNER} 0 Z`;
  }

  function render(bx, vel){
    vel=vel||0;
    const VNORM=30;
    const mag=Math.min(1, Math.abs(vel)/VNORM);
    const q=Math.max(-1, Math.min(1, vel/VNORM));
    const sL=S*(1+.06*mag+.40*q);
    const sR=S*(1+.06*mag-.40*q);
    plate.setAttribute('d', buildPath(bx, sL, sR));
    bead.style.transform=`translateX(${bx-RB}px)`;
  }

  function measure(){
    const dr=dock.getBoundingClientRect();
    dockRect=dr; W=dr.width; H=dr.height;
    plateSvg.setAttribute('viewBox',`0 0 ${W} ${H}`);
    rects=items.map(it=>{ const r=it.getBoundingClientRect(); return r.left-dr.left+r.width/2; });
  }

  function setAccent(rgb){
    root.style.setProperty('--accent-rgb', rgb);
    const [r,g,b]=rgb.split(',').map(Number);
    root.style.setProperty('--accent', `rgb(${r},${g},${b})`);
  }

  function swapText(t,s){
    const d=reduced?40:220;
    titleEl.classList.add('fade-out'); subEl.classList.add('fade-out');
    setTimeout(()=>{ titleEl.textContent=t; subEl.textContent=s; titleEl.classList.remove('fade-out'); subEl.classList.remove('fade-out'); }, d);
  }

  function easeInOutCubic(t){ return t<0.5 ? 4*t*t*t : 1-Math.pow(-2*t+2,3)/2; }

  function animateTo(targetX){
    if(rafId) cancelAnimationFrame(rafId);
    const startX=curX, dist=targetX-startX, dur=reduced?120:600, t0=performance.now();
    let prevX=startX, prevT=t0;
    function step(now){
      const t=Math.min(1,(now-t0)/dur);
      const e=easeInOutCubic(t);
      curX=startX+dist*e;
      const dt=Math.max(1,now-prevT);
      const vel=(curX-prevX)/(dt/16.7);
      render(curX, vel);
      prevX=curX; prevT=now;
      if(t<1) rafId=requestAnimationFrame(step); else render(curX,0);
    }
    rafId=requestAnimationFrame(step);
  }

  let liftedIcon=null;
  function settleIconOnBead(itemEl){
    const clone=itemEl.querySelector('svg').cloneNode(true);
    clone.classList.add('fly-icon','bead-icon');
    clone.style.stroke='#000';
    bead.appendChild(clone);
    liftedIcon=clone;
  }

  function liftIcon(itemEl, instant){
    if(liftedIcon){ liftedIcon.remove(); liftedIcon=null; }
    if(instant || reduced){ settleIconOnBead(itemEl); return; }

    const dockR=dock.getBoundingClientRect();
    const beadR=bead.getBoundingClientRect();
    const srcSvg=itemEl.querySelector('svg');
    const r=srcSvg.getBoundingClientRect();
    const flying=srcSvg.cloneNode(true);
    flying.classList.add('fly-icon');
    flying.style.left=(r.left-dockR.left)+'px';
    flying.style.top=(r.top-dockR.top)+'px';
    flying.style.stroke=getComputedStyle(itemEl).color;
    flying.style.transform='translate(0,0) scale(1)';
    flying.style.transition='transform 600ms cubic-bezier(.45,0,.15,1), stroke 600ms cubic-bezier(.45,0,.15,1)';
    dock.appendChild(flying);

    // exact bead center, in the same coordinate space as the flying clone
    const dx=beadR.width/2-RB; // the clicked item's column sits under this constant offset from bead-left
    const beadCenterY=(beadR.top-dockR.top)+beadR.height/2;
    const iconCenterY=(r.top-dockR.top)+r.height/2;
    const dy=beadCenterY-iconCenterY;

    requestAnimationFrame(()=>{
      flying.style.transform=`translate(${dx}px, ${dy}px) scale(1.5)`;
      flying.style.stroke='#000';
    });

    liftedIcon=flying;
    setTimeout(()=>{
      if(liftedIcon===flying){ flying.remove(); settleIconOnBead(itemEl); }
    }, 600);
  }

  function activate(i, skipAnim){
    const el=items[i]; active=i;
    items.forEach(it=>it.classList.toggle('active', it===el));
    setAccent(el.dataset.accent);
    swapText(el.dataset.title, el.dataset.sub);
    liftIcon(el, skipAnim);
    if(skipAnim){ curX=rects[i]; render(curX,0); } else { animateTo(rects[i]); }
  }

  items.forEach(it=>{
    it.addEventListener('click', ()=>{ const i=Number(it.dataset.i); if(i!==active) activate(i); });
    it.addEventListener('keydown', e=>{
      const i=Number(it.dataset.i);
      if(e.key==='ArrowRight'){ e.preventDefault(); (items[i+1]||items[0]).focus(); }
      if(e.key==='ArrowLeft'){ e.preventDefault(); (items[i-1]||items[items.length-1]).focus(); }
    });
  });

  bead.addEventListener('pointerdown', e=>{
    if(collapsed) return;
    dragging=true; bead.classList.add('dragging'); bead.setPointerCapture(e.pointerId);
    if(rafId) cancelAnimationFrame(rafId);
    measure(); lastX=curX; lastT=performance.now();
  });
  bead.addEventListener('pointermove', e=>{
    if(!dragging) return;
    const x=Math.max(rects[0], Math.min(rects[rects.length-1], e.clientX-dockRect.left));
    const now=performance.now(); const dt=Math.max(1,now-lastT);
    const vel=(x-lastX)/(dt/16.7);
    curX=x; render(x, vel);
    lastX=x; lastT=now;
    let nearest=0,best=Infinity;
    rects.forEach((rx,idx)=>{ const d=Math.abs(rx-x); if(d<best){best=d;nearest=idx;} });
    if(nearest!==active){
      const el=items[nearest]; active=nearest;
      items.forEach(it=>it.classList.toggle('active', it===el));
      setAccent(el.dataset.accent);
      swapText(el.dataset.title, el.dataset.sub);
      liftIcon(el, true);
    }
  });
  function endDrag(){ if(!dragging) return; dragging=false; bead.classList.remove('dragging'); animateTo(rects[active]); }
  bead.addEventListener('pointerup', endDrag);
  bead.addEventListener('pointercancel', endDrag);

  window.addEventListener('resize', ()=>{ measure(); if(!collapsed){ curX=rects[active]; render(curX,0); } });

  let collapsed=false;
  function collapse(){
    if(collapsed) return; collapsed=true;
    row.classList.add('hide'); plateSvg.classList.add('hide');
    animateTo(W/2);
  }
  function expand(){
    if(!collapsed) return; collapsed=false;
    measure();
    row.classList.remove('hide'); plateSvg.classList.remove('hide');
    animateTo(rects[active]);
  }
  let lastScrollY=window.scrollY;
  window.addEventListener('scroll', ()=>{
    const y=window.scrollY;
    if(y>lastScrollY && y>15){ collapse(); }
    else if(y<lastScrollY){ expand(); }
    lastScrollY=y;
  }, {passive:true});
  bead.addEventListener('click', ()=>{ if(collapsed) expand(); });

  measure();
  curX=rects[0];
  liftIcon(items[0], true);
  render(curX,0);
})();
