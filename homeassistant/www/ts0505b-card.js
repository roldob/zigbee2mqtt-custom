/* TS0505B Lovelace card. No frontend card dependencies. */
(() => {
  const TAGS = ['ts0505b-status-card', 'ts0505b-full-card'];
  const HU = {
    Light: 'Fény', Brightness: 'Fényerő', 'Color temperature': 'Színhőmérséklet', Warm: 'Meleg', Cool: 'Hideg',
    'Color / XY': 'Szín / XY', 'Hue and saturation color picker': 'Színárnyalat- és telítettségválasztó',
    'Hue runs horizontally; saturation runs vertically': 'Vízszintesen az árnyalat, függőlegesen a telítettség állítható',
    'Advanced XY': 'Speciális XY', 'Apply XY': 'XY alkalmazása',
    'Warm white': 'Meleg fehér', Neutral: 'Semleges', 'Cool white': 'Hideg fehér', Red: 'Piros', Orange: 'Narancs', Green: 'Zöld', Blue: 'Kék', Purple: 'Lila',
    'Turn off': 'Kikapcsolás', 'Turn on': 'Bekapcsolás', 'Color settings': 'Színbeállítások', 'Color presets': 'Előre beállított színek',
    Startup: 'Indítás', Behavior: 'Működés', 'Color mode': 'Színmód', 'Do Not Disturb': 'Ne zavarjanak',
    Scene: 'Jelenet', 'Dynamic effect': 'Dinamikus effektus', Speed: 'Sebesség', 'Scene point': 'Jelenetpont', Enabled: 'Engedélyezve', Mode: 'Mód',
    Rhythm: 'Ritmus', Days: 'Napok', Monday: 'Hétfő', Tuesday: 'Kedd', Wednesday: 'Szerda', Thursday: 'Csütörtök', Friday: 'Péntek', Saturday: 'Szombat', Sunday: 'Vasárnap',
    Name: 'Név', Time: 'Időpont', 'Save': 'Mentés', Discard: 'Elvetés', Reset: 'Visszaállítás',
    'Decrease': 'Csökkentés', 'Increase': 'Növelés', 'time': 'időpont',
    customized: 'Egyéni', previous: 'Előző', initial: 'Kezdeti', white: 'Fehér', color: 'Színes',
    'This Rhythm point is inactive': 'Ez a Rhythm pont inaktív',
    'Entity not found.': 'Az entitás nem található.',
    'Invalid XY coordinates (x ≥ 0, y > 0, x + y ≤ 1).': 'Érvénytelen XY koordináta (x ≥ 0, y > 0, x + y ≤ 1).',
  };
  const DAYS = [['monday','Monday'],['tuesday','Tuesday'],['wednesday','Wednesday'],['thursday','Thursday'],['friday','Friday'],['saturday','Saturday'],['sunday','Sunday']];
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, Number(v)));
  const linear = v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4;
  const gamma = v => v <= .0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - .055;
  function rgbToXy(r, g, b) {
    const R=linear(r/255), G=linear(g/255), B=linear(b/255);
    const X=.664511*R+.154324*G+.162028*B, Y=.283881*R+.668433*G+.047685*B, Z=.000088*R+.072310*G+.986039*B;
    const sum=X+Y+Z;
    return sum ? [+(X/sum).toFixed(4), +(Y/sum).toFixed(4)] : [.3127,.329];
  }
  function xyToRgb(x,y) {
    if (!(y>0) || x<0 || x+y>1) return [255,255,255];
    const X=x/y,Z=(1-x-y)/y;
    let R=1.656492*X-.354851-.255038*Z, G=-.707196*X+1.655397+.036152*Z, B=.051713*X-.121364+1.011530*Z;
    const top=Math.max(R,G,B,1); R=gamma(Math.max(0,R/top)); G=gamma(Math.max(0,G/top)); B=gamma(Math.max(0,B/top));
    return [R,G,B].map(v=>Math.round(clamp(v,0,1)*255));
  }
  function hsvRgb(h,s,v) {
    const c=v*s, n=h/60, x=c*(1-Math.abs(n%2-1)), m=v-c;
    const p=n<1?[c,x,0]:n<2?[x,c,0]:n<3?[0,c,x]:n<4?[0,x,c]:n<5?[x,0,c]:[c,0,x];
    return p.map(q=>Math.round((q+m)*255));
  }
  function rgbHsv([r,g,b]) {
    r/=255;g/=255;b/=255;const mx=Math.max(r,g,b),mn=Math.min(r,g,b),d=mx-mn;
    let h=0;if(d) h=mx===r?((g-b)/d)%6:mx===g?(b-r)/d+2:(r-g)/d+4;
    return [((h*60)+360)%360,mx?d/mx:0,mx];
  }
  function kelvinRgb(kelvin) {
    const t=clamp(kelvin,1000,40000)/100, log=x=>Math.log(x), pow=(x,y)=>Math.pow(x,y);
    const r=t<=66?255:clamp(329.698727446*pow(t-60,-.1332047592),0,255);
    const g=t<=66?clamp(99.4708025861*log(t)-161.1195681661,0,255):clamp(288.1221695283*pow(t-60,-.0755148492),0,255);
    const b=t>=66?255:t<=19?0:clamp(138.5177312231*log(t-10)-305.0447927307,0,255);
    return [Math.round(r),Math.round(g),Math.round(b)];
  }
  const cssRgb = rgb => `rgb(${rgb.map(Math.round).join(',')})`;
  function circleIcon(name) { return `<ha-icon icon="mdi:${name}"></ha-icon>`; }
  class TS0505BCard extends HTMLElement {
    constructor() { super(); this.attachShadow({mode:'open'}); this._open=new Set(); this._openDetails=new Set(); this._pendingNumberValues=new Map(); this._picking=null; }
    setConfig(config) {
      if (!/^light\.[a-z0-9_]+$/.test(config.entity ?? '')) throw Error('TS0505B: entity must be a light entity ID');
      this.config=config; this._render();
    }
    set hass(hass) {
      this._hass=hass;
      for(const [id,value] of this._pendingNumberValues) if(Number(hass.states?.[id]?.state)===Number(value)) this._pendingNumberValues.delete(id);
      const active=this.shadowRoot.activeElement;
      const editing=active?.tagName==='INPUT'&&['text','number','range','time'].includes(active.type);
      if(this.config&&!editing&&!this._picking)this._render();
    }
    t(text) {
      const language = String(this._hass?.language ?? this._hass?.locale?.language ?? '').toLowerCase().replace('_', '-').split('-')[0];
      return language === 'hu' ? (HU[text] ?? text) : text;
    }
    getCardSize() { return this.localName==='ts0505b-full-card'?9:4; }
    get _base() { return this.config.entity.slice(6); }
    id(domain,suffix='') { return `${domain}.${this._base}${suffix?'_'+suffix:''}`; }
    state(id) { return this._hass?.states[id]; }
    has(id) { return !!this.state(id); }
    value(id, fallback='') { const s=this.state(id)?.state; return s && !['unknown','unavailable'].includes(s)?s:fallback; }
    startupValue(id, value) { return /_(startup_behavior|startup_color_mode)$/.test(id) ? this.t(value) : value; }
    light(id) { return this.state(id)?.attributes ?? {}; }
    async call(domain,service,data) {
      try { await this._hass.callService(domain,service,data); }
      catch(e) { console.error('[TS0505B card]',e); this._error=e.message||String(e); this._render(); }
    }
    action(id,value) {
      const [domain]=id.split('.');
      if(domain==='switch') return this.call(domain,value?'turn_on':'turn_off',{entity_id:id});
      if(domain==='select') return this.call(domain,'select_option',{entity_id:id,option:value});
      if(domain==='number') return this.call(domain,'set_value',{entity_id:id,value:Number(value)});
      if(domain==='text') return this.call(domain,'set_value',{entity_id:id,value});
      if(domain==='button') return this.call(domain,'press',{entity_id:id});
    }
    section(key,icon,title,body,disabled=false) {
      if (!body) return '';
      return `<details data-section="${key}" ${disabled?'data-disabled="true"':''} ${this._open.has(key)?'open':''}><summary>${circleIcon(icon)}<span>${esc(title)}</span>${circleIcon('chevron-down')}</summary><div class="section-body">${body}</div></details>`;
    }
    row(id,label) { return this.has(id)?`<div class="row"><label for="${id}">${esc(label)}</label>${this.control(id,label)}</div>`:''; }
    control(id,label='value') {
      const s=this.state(id),domain=id.split('.')[0],v=this._pendingNumberValues.has(id)?this._pendingNumberValues.get(id):this.value(id);
      if(domain==='switch') return `<input id="${id}" data-entity="${id}" type="checkbox" ${v==='on'?'checked':''} ${v==='unavailable'?'disabled':''}>`;
      if(domain==='select') return `<select id="${id}" data-entity="${id}">${(s.attributes.options??[]).map(o=>`<option value="${esc(o)}" ${o===v?'selected':''}>${esc(this.startupValue(id,o))}</option>`).join('')}</select>`;
      if(domain==='number') {
        const min=Number(s.attributes.min??0),max=Number(s.attributes.max??100),step=Number(s.attributes.step??1);
        return `<div class="number-stepper"><button type="button" class="step-button" data-step="${id}" data-delta="-${step}" aria-label="${esc(label)} — ${this.t('Decrease')}">−</button><output>${esc(v)}</output><button type="button" class="step-button" data-step="${id}" data-delta="${step}" aria-label="${esc(label)} — ${this.t('Increase')}">+</button><span class="step-range">${min}–${max}</span></div>`;
      }
      if(domain==='text'&&/_rhythm_[1-8]_time$/.test(id)) {
        const time=/^\d{2}:\d{2}$/.test(v)?v:'';
        return `<div class="time-control">${circleIcon('clock-outline')}<input id="${id}" data-entity="${id}" type="time" value="${esc(time)}" aria-label="${esc(label)} ${this.t('time')}"></div>`;
      }
      if(domain==='text') return `<input id="${id}" data-entity="${id}" type="text" value="${esc(v)}">`;
      if(domain==='sensor'&&/_startup_color_mode$/.test(id)) return `<span>${esc(this.startupValue(id,v))}</span>`;
      return `<span>${esc(v)}</span>`;
    }
    buttons(prefix) {
      return `<div class="buttons">${[['save','content-save','Save'],['discard','undo','Discard'],['reset','restore','Reset']].map(([act,icon,label])=>{const id=this.id('button',`${prefix}_${act}`);return this.has(id)?`<button data-press="${id}">${circleIcon(icon)}${this.t(label)}</button>`:'';}).join('')}</div>`;
    }
    switchRow(suffix,label) { return this.row(this.id('switch',suffix),label); }
    lightEditor(entity,key,opts={}) {
      if(!this.has(entity)) return '';
      const st=this.state(entity),a=st.attributes??{},modes=a.supported_color_modes??[];
      const main=key==='main';
      const canTemp=main?modes.includes('color_temp'):true;
      const canColor=main?modes.some(x=>['xy','hs','rgb','rgbw','rgbww'].includes(x)):true;
      const minK=Number(a.min_color_temp_kelvin)||2000,maxK=Number(a.max_color_temp_kelvin)||6536;
      const bright=Math.round((Number(a.brightness)||0)*100/255);
      const kelvin=Number(a.color_temp_kelvin)||(a.color_temp?Math.round(1e6/a.color_temp):Math.round((minK+maxK)/2));
      const xy=a.xy_color??[.3127,.329];
      const showPower=main && !opts.noPower;
      if(opts.compact) return this.compactLightEditor(entity,key,{st,a,modes,canTemp,canColor,minK,maxK,bright,kelvin,xy,showPower});
      return `<div class="light-editor" data-editor="${key}">
        ${showPower?`<div class="row"><span>${this.t('Light')}</span><button class="power ${st.state==='on'?'on':''}" data-power="${entity}">${circleIcon(st.state==='on'?'lightbulb-on':'lightbulb-off')} ${st.state==='on'?'ON':'OFF'}</button></div>`:''}
        <div class="slider-row"><div><label>${this.t('Brightness')}</label><output data-output="${key}-brightness">${bright}%</output></div><input type="range" min="1" max="100" value="${bright||1}" data-light="${entity}" data-kind="brightness" data-output-target="${key}-brightness"></div>
        ${canTemp?`<div class="slider-row"><div><label>${this.t('Color temperature')}</label><output data-output="${key}-temp">${kelvin} K</output></div><input class="temperature" type="range" min="${minK}" max="${maxK}" step="10" value="${clamp(kelvin,minK,maxK)}" data-light="${entity}" data-kind="temp" data-output-target="${key}-temp"><small>${this.t('Warm')} · ${minK} K <span style="float:right">${this.t('Cool')} · ${maxK} K</span></small></div>`:''}
        ${canColor?`<div class="color-block"><div class="color-head"><label>${this.t('Color / XY')}</label><span class="swatch" data-swatch="${key}" style="background:rgb(${xyToRgb(Number(xy[0]),Number(xy[1])).join(',')})"></span></div><canvas class="palette" data-palette="${key}" data-light="${entity}" width="300" height="160" aria-label="${this.t('Hue and saturation color picker')}"></canvas><small>${this.t('Hue runs horizontally; saturation runs vertically')}</small><div class="xy-label">x: ${Number(xy[0]).toFixed(4)} · y: ${Number(xy[1]).toFixed(4)}</div><details class="advanced"><summary>${this.t('Advanced XY')}</summary><div class="xy-inputs"><label>x <input type="number" min="0" max="1" step="0.0001" value="${Number(xy[0]).toFixed(4)}" data-xy="x" data-light="${entity}"></label><label>y <input type="number" min="0" max="1" step="0.0001" value="${Number(xy[1]).toFixed(4)}" data-xy="y" data-light="${entity}"></label><button data-apply-xy="${entity}">${this.t('Apply XY')}</button></div></details></div>`:''}
      </div>`;
    }
    compactLightEditor(entity,key,{st,a,modes,canTemp,canColor,minK,maxK,bright,kelvin,xy,showPower}) {
      const currentRgb=a.color_mode==='color_temp'?kelvinRgb(kelvin):(a.rgb_color??xyToRgb(Number(xy[0]),Number(xy[1])));
      const activeColor=cssRgb(currentRgb);
      const ctFill=clamp((kelvin-minK)*100/(maxK-minK),0,100);
      const presets=[
        {name:this.t('Warm white'),icon:'white-balance-incandescent',temp:2700},
        {name:this.t('Neutral'),icon:'white-balance-sunny',temp:4000},
        {name:this.t('Cool white'),icon:'weather-snowy',temp:5500},
        {name:this.t('Red'),icon:'circle',rgb:[255,0,0]},
        {name:this.t('Orange'),icon:'circle',rgb:[255,105,0]},
        {name:this.t('Green'),icon:'circle',rgb:[0,255,0]},
        {name:this.t('Blue'),icon:'circle',rgb:[0,64,255]},
        {name:this.t('Purple'),icon:'circle',rgb:[180,0,255]},
      ].filter(p=>p.temp?canTemp:canColor);
      const presetButtons=presets.map(p=>{
        const payload=p.temp?`data-preset-temp="${p.temp}"`:`data-preset-xy="${rgbToXy(...p.rgb).join(',')}"`;
        const tint=p.temp?cssRgb(kelvinRgb(p.temp)):cssRgb(p.rgb);
        return `<button class="preset" ${payload} data-preset-entity="${entity}" title="${p.name}"><span style="--preset-color:${tint}"></span>${p.name}</button>`;
      }).join('');
      return `<div class="compact-light" data-editor="${key}">
        <div class="compact-main ${showPower?'':'no-power'}">
          ${showPower?`<button class="power-icon ${st.state==='on'?'on':''}" data-power="${entity}" title="${this.t(st.state==='on'?'Turn off':'Turn on')}" aria-label="${this.t(st.state==='on'?'Turn off':'Turn on')}">${circleIcon(st.state==='on'?'lightbulb-on':'lightbulb-off')}</button>`:''}
          <div class="brightness-control"><input class="brightness-wide" type="range" min="1" max="100" value="${bright||1}" data-light="${entity}" data-kind="brightness" data-output-target="${key}-brightness" style="--active-color:${activeColor};--fill:${bright}%"><output data-output="${key}-brightness">${bright}%</output></div>
          <details class="quick-controls" data-section="${key}-adjustments" ${this._open.has(`${key}-adjustments`)?'open':''}><summary title="${this.t('Color settings')}">${circleIcon('tune-variant')}</summary><div class="adjustment-panel">
            ${canTemp?`<div class="slider-row"><div><label>${this.t('Color temperature')}</label><output data-output="${key}-temp">${kelvin} K</output></div><input class="temperature-wide" type="range" min="${minK}" max="${maxK}" step="10" value="${clamp(kelvin,minK,maxK)}" data-light="${entity}" data-kind="temp" data-output-target="${key}-temp" style="--active-color:${activeColor};--fill:${ctFill}%"><small>${this.t('Warm')} · ${minK} K <span style="float:right">${this.t('Cool')} · ${maxK} K</span></small></div>`:''}
          ${canColor?`<div class="color-block"><div class="color-head"><label>${this.t('Color / XY')}</label><span class="swatch" data-swatch="${key}" style="background:${activeColor}"></span></div><canvas class="palette" data-palette="${key}" data-light="${entity}" width="300" height="160" aria-label="${this.t('Hue and saturation color picker')}"></canvas><small>${this.t('Hue runs horizontally; saturation runs vertically')}</small><div class="xy-label">x: ${Number(xy[0]).toFixed(4)} · y: ${Number(xy[1]).toFixed(4)}</div><details class="advanced" data-persist="advanced-${key}" ${this._openDetails.has(`advanced-${key}`)?'open':''}><summary>${this.t('Advanced XY')}</summary><div class="xy-inputs"><div class="xy-stepper"><span>x</span><button type="button" data-xy-change="x" data-delta="-0.0001" aria-label="x — ${this.t('Decrease')}">−</button><output data-xy="x">${Number(xy[0]).toFixed(4)}</output><button type="button" data-xy-change="x" data-delta="0.0001" aria-label="x — ${this.t('Increase')}">+</button></div><div class="xy-stepper"><span>y</span><button type="button" data-xy-change="y" data-delta="-0.0001" aria-label="y — ${this.t('Decrease')}">−</button><output data-xy="y">${Number(xy[1]).toFixed(4)}</output><button type="button" data-xy-change="y" data-delta="0.0001" aria-label="y — ${this.t('Increase')}">+</button></div><button class="apply-xy" data-apply-xy="${entity}">${this.t('Apply XY')}</button></div></details></div>`:''}
            ${presetButtons?`<div class="presets"><label>${this.t('Color presets')}</label><div>${presetButtons}</div></div>`:''}
          </div></details>
        </div>
      </div>`;
    }
    startup() {
      const behavior=this.id('select','startup_behavior'), startup=this.id('light','startup'), dnd=this.id('switch','do_not_disturb');
      if(!this.has(behavior)&&!this.has(startup)&&!this.has(dnd)) return '';
      const b=this.value(behavior);
      return this.section('startup','power-settings',`${this.t('Startup')}${b?' — '+this.startupValue(behavior,b):''}`,`${this.row(behavior,this.t('Behavior'))}${this.row(this.id('sensor','startup_color_mode'),this.t('Color mode'))}${b==='customized'?this.lightEditor(startup,'startup',{noPower:true,compact:true}):''}${this.switchRow('do_not_disturb',this.t('Do Not Disturb'))}`);
    }
    scene() {
      const selected=this.id('select','scene_selected');
      if(!this.has(selected)) return '';
      const point=this.id('light','scene_point'), enabled=this.value(this.id('switch','scene_point_enabled'))==='on';
      let body=this.row(selected,this.t('Scene'))+this.row(this.id('select','scene_effect'),this.t('Dynamic effect'))+this.row(this.id('number','scene_speed'),this.t('Speed'))+this.row(this.id('select','scene_point_selected'),this.t('Scene point'))+this.switchRow('scene_point_enabled',this.t('Enabled'));
      if(enabled) { body+=this.row(this.id('select','scene_point_mode'),this.t('Mode'))+this.lightEditor(point,'scene',{noPower:true,compact:true}); }
      body+=this.buttons('scene');return this.section('scene','palette-outline',this.t('Scene'),body);
    }
    rhythm() {
      const main=this.id('switch','rhythm_enabled');if(!this.has(main))return '';
      const on=this.value(main)==='on';
      let body=this.switchRow('rhythm_enabled',this.t('Rhythm'));
      if(on) {
        body+=this.row(this.id('select','rhythm_mode'),this.t('Mode'));
        body+=this.section('days','calendar-week',this.t('Days'),DAYS.map(([d,l])=>this.switchRow(`rhythm_${d}`,this.t(l))).join(''));
        for(let i=1;i<=8;i++) {
          const p=`rhythm_${i}`, toggle=this.id('switch',`${p}_enabled`);
          if(!this.has(toggle))continue;
          const title=`${i}. ${this.value(this.id('text',`${p}_name`),`${this.t('Rhythm')} ${i}`)} — ${this.value(this.id('text',`${p}_time`))}`;
          const slotOn=this.value(toggle)==='on';
          let content=this.row(toggle,this.t('Enabled'));
          if(slotOn) {
            content+=this.row(this.id('text',`${p}_name`),this.t('Name'))+this.row(this.id('text',`${p}_time`),this.t('Time'));
            content+=this.percentNumber(this.id('number',`${p}_brightness`),this.t('Brightness'));
            content+=this.percentNumber(this.id('number',`${p}_color_temp`),this.t('Color temperature'));
          } else {
            content+=`<div class="disabled-note">${this.t('This Rhythm point is inactive')}</div>`;
          }
          body+=this.section(p,'clock-outline',title,content,!slotOn);
        }
        body+=this.buttons('rhythm');
      }
      return this.section('rhythm','clock-outline',`${this.t('Rhythm')} — ${on?'ON':'OFF'}`,body);
    }
    percentNumber(id,label) {
      if(!this.has(id))return '';
      const s=this.state(id),v=Number(s.state)||0,min=Number(s.attributes.min??0),max=Number(s.attributes.max??100);
      return `<div class="slider-row"><div><label>${this.t(label)}</label><output data-output="${id}">${v}%</output></div><input type="range" min="${min}" max="${max}" step="${s.attributes.step??1}" value="${v}" data-entity="${id}" data-output-target="${id}"></div>`;
    }
    _render() {
      if(!this.config||!this._hass)return;
      this.shadowRoot.querySelectorAll('details[data-section]').forEach(d=>d.open?this._open.add(d.dataset.section):this._open.delete(d.dataset.section));
      this.shadowRoot.querySelectorAll('details[data-persist]').forEach(d=>d.open?this._openDetails.add(d.dataset.persist):this._openDetails.delete(d.dataset.persist));
      const entity=this.config.entity,st=this.state(entity);
      const title=this.config.name||st?.attributes.friendly_name||entity;
      const full=this.localName==='ts0505b-full-card';
      this.shadowRoot.innerHTML=`<style>
        :host{display:block;color:var(--primary-text-color);font-family:var(--paper-font-body1_-_font-family,Roboto,sans-serif)}
        ha-card{display:block;padding:18px;border-radius:var(--ha-card-border-radius,12px);background:var(--ha-card-background,var(--card-background-color,#fff));box-shadow:var(--ha-card-box-shadow,0 2px 5px #0002)}
        h2{font-size:19px;margin:0 0 16px;display:flex;align-items:center;gap:10px}h2 ha-icon{color:var(--primary-color)}
        details[data-section]{margin-top:12px;border:1px solid var(--divider-color,#ddd);border-radius:12px;overflow:hidden}
        details[data-section]>summary{list-style:none;display:flex;gap:12px;align-items:center;padding:13px 14px;cursor:pointer;font-weight:500}
        details[data-section]>summary::-webkit-details-marker{display:none}details[data-section]>summary>span{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}details[data-section]>summary ha-icon:first-child{color:var(--primary-color)}details[data-section][open]>summary ha-icon:last-child{transform:rotate(180deg)}details[data-disabled="true"]>summary{opacity:.4}.disabled-note{padding:12px 4px;color:var(--disabled-text-color);opacity:.65;font-size:13px}
        .section-body{padding:0 14px 14px}.row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 0;border-bottom:1px solid var(--divider-color,#eee)}.row label{min-width:0}
        input,select,button{font:inherit;color:inherit}select,input[type=text],input[type=number],input[type=time]{border:1px solid var(--divider-color,#bbb);background:var(--card-background-color,#fff);border-radius:7px;padding:7px;max-width:54%;box-sizing:border-box}input[type=checkbox]{appearance:none;-webkit-appearance:none;position:relative;width:50px;height:30px;flex:0 0 50px;border:0;border-radius:18px;background:var(--disabled-text-color,#888);cursor:pointer;transition:background .16s}input[type=checkbox]::after{content:"";position:absolute;width:22px;height:22px;top:4px;left:4px;border-radius:50%;background:#fff;box-shadow:0 1px 3px #0005;transition:transform .16s}input[type=checkbox]:checked{background:var(--primary-color)}input[type=checkbox]:checked::after{transform:translateX(20px)}input[type=checkbox]:disabled{opacity:.45}input[type=range]{width:100%;accent-color:var(--primary-color);cursor:pointer}
        .number-stepper{display:flex;align-items:center;gap:8px}.number-stepper output{min-width:34px;text-align:center;font-variant-numeric:tabular-nums}.step-button,.xy-stepper button{min-width:44px;min-height:44px;padding:0;font-size:23px;line-height:1}.step-range{display:none}
        .light-editor{display:grid;gap:15px}.slider-row>div,.color-head{display:flex;justify-content:space-between;gap:12px;align-items:center}.slider-row output,.xy-label{font-size:13px;color:var(--secondary-text-color)}.slider-row input{margin-top:10px}.slider-row small{display:block;color:var(--secondary-text-color);font-size:11px}.temperature{accent-color:#ffbd54;background:linear-gradient(90deg,#ffad52,#fff2c2,#c7e8ff);border-radius:9px}
        .compact-main{display:grid;grid-template-columns:42px minmax(0,1fr) 38px;gap:12px;align-items:center}.compact-main.no-power{grid-template-columns:minmax(0,1fr) 38px}.power-icon{display:grid;place-items:center;width:40px;height:40px;padding:0;border:0;border-radius:50%;background:var(--secondary-background-color,#eee);color:var(--secondary-text-color)}.power-icon ha-icon{width:23px;height:23px;margin:0}.power-icon.on{color:var(--active-color,var(--primary-color));background:color-mix(in srgb,var(--active-color,var(--primary-color)) 16%,transparent)}.brightness-control{min-width:0;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center}.brightness-control output{font-size:13px;min-width:36px;text-align:right}.brightness-wide,.temperature-wide{appearance:none;-webkit-appearance:none;width:100%;height:8px;border-radius:10px;outline:none;cursor:pointer}.brightness-wide{background:linear-gradient(90deg,var(--active-color) 0%,var(--active-color) var(--fill),var(--divider-color,#bbb) var(--fill),var(--divider-color,#bbb) 100%)}.brightness-wide::-webkit-slider-thumb,.temperature-wide::-webkit-slider-thumb{appearance:none;-webkit-appearance:none;width:20px;height:20px;border-radius:50%;border:2px solid var(--card-background-color,#fff);background:var(--active-color);box-shadow:0 1px 4px #0005}.brightness-wide::-moz-range-thumb,.temperature-wide::-moz-range-thumb{width:16px;height:16px;border-radius:50%;border:2px solid var(--card-background-color,#fff);background:var(--active-color);box-shadow:0 1px 4px #0005}.quick-controls{border:0!important;border-radius:8px;overflow:visible!important;position:relative}.quick-controls>summary{padding:7px!important;justify-content:center!important;border:1px solid var(--divider-color,#ddd);border-radius:8px}.quick-controls>summary ha-icon{color:var(--primary-color)}.quick-controls>.adjustment-panel{grid-column:1/-1;padding:15px 2px 2px;display:grid;gap:16px}.quick-controls[open]{grid-column:1/-1}.compact-main:has(.quick-controls[open]){row-gap:4px}.quick-controls[open]>summary{width:38px;margin-left:auto}.temperature-wide{background:linear-gradient(90deg,var(--active-color) 0%,var(--active-color) var(--fill),transparent var(--fill)),linear-gradient(90deg,#ff9d4d 0%,#fff0d1 50%,#b6dcff 100%)}.presets>label{display:block;font-size:13px;margin-bottom:8px}.presets>div{display:flex;flex-wrap:wrap;gap:7px}.preset{display:flex;align-items:center;gap:6px;padding:6px 9px;font-size:12px;border-radius:18px}.preset span{width:13px;height:13px;border-radius:50%;background:var(--preset-color);border:1px solid #7775}.preset:active{transform:scale(.97)}
        .color-block{display:grid;gap:9px}.swatch{width:25px;height:25px;border:1px solid var(--divider-color);border-radius:50%}.palette{display:block;width:100%;height:160px;border-radius:10px;touch-action:none;cursor:crosshair}.hue{background:linear-gradient(90deg,red,#ff0,lime,cyan,blue,magenta,red);border-radius:9px}.advanced{font-size:13px}.advanced summary{cursor:pointer;min-height:44px;display:flex;align-items:center}.xy-inputs{display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:9px 0}.xy-stepper{display:flex;gap:5px;align-items:center}.xy-stepper>span{min-width:14px;font-weight:600}.xy-stepper output{min-width:58px;text-align:center;font-variant-numeric:tabular-nums}.xy-stepper button{border:1px solid var(--divider-color,#bbb);border-radius:8px;background:var(--secondary-background-color,#f7f7f7);cursor:pointer}.apply-xy{min-height:44px}.time-control{display:flex;align-items:center;gap:8px}.time-control ha-icon{width:19px;height:19px;color:var(--primary-color)}.time-control input[type=time]{min-height:44px;min-width:128px;font-size:16px}.buttons{display:flex;gap:8px;margin-top:14px}.buttons button{flex:1}.power,button{border:1px solid var(--divider-color,#bbb);border-radius:8px;background:var(--secondary-background-color,#f7f7f7);padding:8px;cursor:pointer}.power.on{color:var(--primary-color)}button ha-icon{width:17px;height:17px;vertical-align:middle;margin-right:4px}.error{color:var(--error-color,#b00);margin:9px 0}
      </style><ha-card><h2>${circleIcon('lightbulb')}<span>${esc(title)}</span></h2>${st?this.lightEditor(entity,'main',{compact:true}):`<div>${this.t('Entity not found.')}</div>`}${full?this.startup()+this.scene()+this.rhythm():''}${this._error?`<div class="error">${esc(this._error)}</div>`:''}</ha-card>`;
      this._wire();
    }
    _wire() {
      const root=this.shadowRoot;
      root.querySelectorAll('details[data-section]').forEach(d=>d.addEventListener('toggle',()=>d.open?this._open.add(d.dataset.section):this._open.delete(d.dataset.section)));
      root.querySelectorAll('details[data-persist]').forEach(d=>d.addEventListener('toggle',()=>d.open?this._openDetails.add(d.dataset.persist):this._openDetails.delete(d.dataset.persist)));
      root.querySelectorAll('[data-entity]').forEach(el=>{
        if(el.type==='range')el.addEventListener('input',()=>{root.querySelector(`[data-output="${el.dataset.outputTarget}"]`).textContent=`${el.value}%`;});
        el.addEventListener('change',()=>{this.action(el.dataset.entity,el.type==='checkbox'?el.checked:el.value);if(el.type!=='time')el.blur();});
        el.addEventListener('blur',()=>{if(this._hass)this._render();});
      });
      root.querySelectorAll('[data-press]').forEach(el=>el.addEventListener('click',()=>this.action(el.dataset.press)));
      root.querySelectorAll('[data-step]').forEach(el=>el.addEventListener('click',()=>{
        const state=this.state(el.dataset.step),base=this._pendingNumberValues.has(el.dataset.step)?this._pendingNumberValues.get(el.dataset.step):state?.state,min=Number(state?.attributes?.min??0),max=Number(state?.attributes?.max??100),step=Number(state?.attributes?.step??1),delta=Number(el.dataset.delta),digits=Math.max((String(step).split('.')[1]??'').length,(String(delta).split('.')[1]??'').length),next=clamp(Number((Number(base??0)+delta).toFixed(digits)),min,max);
        this._pendingNumberValues.set(el.dataset.step,next);
        const output=el.closest('.number-stepper')?.querySelector('output');if(output)output.textContent=String(next);
        this.action(el.dataset.step,next);
      }));
      root.querySelectorAll('[data-power]').forEach(el=>el.addEventListener('click',()=>this.call('light',this.value(el.dataset.power)==='on'?'turn_off':'turn_on',{entity_id:el.dataset.power})));
      root.querySelectorAll('[data-light]').forEach(el=>{
        if(el.type!=='range'||!el.dataset.kind)return;
        el.addEventListener('input',()=>{
          const out=root.querySelector(`[data-output="${el.dataset.outputTarget}"]`);
          if(out)out.textContent=el.value+(el.dataset.kind==='temp'?' K':'%');
          if(el.dataset.kind==='brightness')el.style.setProperty('--fill',`${el.value}%`);
          else el.style.setProperty('--active-color',cssRgb(kelvinRgb(Number(el.value))));
        });
        el.addEventListener('change',()=>{this.call('light','turn_on',{entity_id:el.dataset.light,...(el.dataset.kind==='temp'?{color_temp_kelvin:Number(el.value)}:{brightness_pct:Number(el.value)})});el.blur();});
      });
      root.querySelectorAll('[data-preset-temp]').forEach(btn=>btn.addEventListener('click',()=>this.call('light','turn_on',{entity_id:btn.dataset.presetEntity,color_temp_kelvin:Number(btn.dataset.presetTemp)})));
      root.querySelectorAll('[data-preset-xy]').forEach(btn=>btn.addEventListener('click',()=>this.call('light','turn_on',{entity_id:btn.dataset.presetEntity,xy_color:btn.dataset.presetXy.split(',').map(Number)})));
      root.querySelectorAll('[data-apply-xy]').forEach(btn=>btn.addEventListener('click',()=>{
        const inputs=btn.closest('.xy-inputs'),x=Number(inputs.querySelector('[data-xy=x]').textContent),y=Number(inputs.querySelector('[data-xy=y]').textContent);
        if(!(x>=0&&y>0&&x+y<=1)) {this._error=this.t('Invalid XY coordinates (x ≥ 0, y > 0, x + y ≤ 1).');this._render();return;}
        this.call('light','turn_on',{entity_id:btn.dataset.applyXy,xy_color:[x,y]});
      }));
      root.querySelectorAll('[data-xy-change]').forEach(btn=>btn.addEventListener('click',()=>{
        const output=btn.closest('.xy-stepper').querySelector(`[data-xy="${btn.dataset.xyChange}"]`),value=clamp(Number(output.textContent)+Number(btn.dataset.delta),0,1);
        output.textContent=value.toFixed(4);
      }));
      root.querySelectorAll('canvas[data-palette]').forEach(canvas=>this._palette(canvas));
    }
    _palette(canvas) {
      const key=canvas.dataset.palette,ctx=canvas.getContext('2d');
      const state=this.light(canvas.dataset.light),xy=state.xy_color??[.3127,.329],rgb=xyToRgb(Number(xy[0]),Number(xy[1]));
      let [h,s]=rgbHsv(rgb),px=h/360,py=1-s;
      const draw=()=>{
        const w=canvas.width,z=canvas.height,img=ctx.createImageData(w,z);
        for(let y=0;y<z;y++)for(let x=0;x<w;x++){const c=hsvRgb(x/(w-1)*360,(z-1-y)/(z-1),1),i=(y*w+x)*4;img.data.set([...c,255],i);}
        ctx.putImageData(img,0,0);ctx.beginPath();ctx.arc(px*w,py*z,7,0,2*Math.PI);ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.stroke();ctx.beginPath();ctx.arc(px*w,py*z,9,0,2*Math.PI);ctx.strokeStyle='#222';ctx.lineWidth=1;ctx.stroke();
        const c=hsvRgb(px*359,1-py,1);this.shadowRoot.querySelector(`[data-swatch="${key}"]`).style.background=`rgb(${c.join(',')})`;
      };
      const send=()=>{const c=hsvRgb(px*359,1-py,1),xy=rgbToXy(...c);this._picking=null;this.call('light','turn_on',{entity_id:canvas.dataset.light,xy_color:xy});};
      const move=e=>{const r=canvas.getBoundingClientRect();px=clamp((e.clientX-r.left)/r.width,0,1);py=clamp((e.clientY-r.top)/r.height,0,1);draw();};
      canvas.addEventListener('pointerdown',e=>{this._picking=canvas;canvas.setPointerCapture(e.pointerId);move(e);});
      canvas.addEventListener('pointermove',e=>{if(this._picking===canvas)move(e);});
      canvas.addEventListener('pointerup',e=>{if(this._picking===canvas){move(e);send();}});
      canvas.addEventListener('pointercancel',()=>{this._picking=null;});
      draw();
    }
  }
  for(const tag of TAGS) if(!customElements.get(tag))customElements.define(tag,class extends TS0505BCard {});
  window.customCards=window.customCards||[];
  window.customCards.push({type:'ts0505b-status-card',name:'TS0505B Status Card',description:'Light and color controls'}, {type:'ts0505b-full-card',name:'TS0505B Full Card',description:'Light, Startup, Scene and Rhythm controls'});
})();
