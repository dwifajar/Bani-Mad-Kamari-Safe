/* BANI MAD KAMARI — Easy Date Fields V1 */
(function(){
  const months=['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  function pad(n){return String(n).padStart(2,'0')}
  function daysInMonth(y,m){return new Date(Number(y),Number(m),0).getDate()}
  function init(el){
    if(el.dataset.ready==='1') return;
    const name=el.dataset.dateName; if(!name) return;
    const form=el.closest('form');
    const d=document.createElement('select'), m=document.createElement('select'), y=document.createElement('select');
    d.setAttribute('aria-label','Tanggal'); m.setAttribute('aria-label','Bulan'); y.setAttribute('aria-label','Tahun');
    d.className='bmk-date-day';m.className='bmk-date-month';y.className='bmk-date-year';
    d.innerHTML='<option value="">Tanggal</option>';
    for(let i=1;i<=31;i++)d.insertAdjacentHTML('beforeend',`<option value="${pad(i)}">${i}</option>`);
    m.innerHTML='<option value="">Bulan</option>';
    months.forEach((v,i)=>m.insertAdjacentHTML('beforeend',`<option value="${pad(i+1)}">${v}</option>`));
    const now=new Date().getFullYear(); y.innerHTML='<option value="">Tahun</option>';
    for(let yr=now+10;yr>=1900;yr--)y.insertAdjacentHTML('beforeend',`<option value="${yr}">${yr}</option>`);
    const wrap=document.createElement('div'); wrap.className='bmk-date-grid'; wrap.append(d,m,y); el.appendChild(wrap);
    const hidden=document.createElement('input'); hidden.type='hidden'; hidden.name=name; hidden.id=`bmk-date-${name}`; el.appendChild(hidden);
    const updateDays=()=>{
      const old=d.value, max=(y.value&&m.value)?daysInMonth(y.value,m.value):31;
      [...d.options].forEach((o,i)=>{if(i===0)return;o.hidden=Number(o.value)>max;o.disabled=Number(o.value)>max});
      if(old && Number(old)<=max)d.value=old; else if(Number(old)>max)d.value='';
    };
    const sync=()=>{updateDays();hidden.value=(y.value&&m.value&&d.value)?`${y.value}-${m.value}-${d.value}`:'';el.dispatchEvent(new CustomEvent('bmk-date-change',{detail:{name,value:hidden.value}}));};
    [d,m,y].forEach(x=>x.addEventListener('change',sync));
    el._bmk={hidden,d,m,y,sync,set(value){
      const v=String(value||'').slice(0,10); const p=v.split('-');
      if(p.length===3&&/^\d{4}-\d{2}-\d{2}$/.test(v)){y.value=p[0];m.value=p[1];updateDays();d.value=p[2];}
      else {y.value='';m.value='';d.value='';}
      sync();
    }};
    el.dataset.ready='1';
    if(form) form.addEventListener('reset',()=>setTimeout(()=>el._bmk.set(''),0));
  }
  function initAll(scope=document){scope.querySelectorAll('.bmk-date-field').forEach(init)}
  function set(form,name,value){const el=form?.querySelector(`.bmk-date-field[data-date-name="${CSS.escape(name)}"]`); if(el?._bmk)el._bmk.set(value); else {const h=form?.elements?.[name]; if(h)h.value=value||''}}
  window.BMKDateFields={initAll,set};
  document.addEventListener('DOMContentLoaded',()=>initAll());
})();
