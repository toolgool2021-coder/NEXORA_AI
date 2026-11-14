"use strict";
(() => {
  const $ = id => document.getElementById(id);
  const dict = typeof DIALOGS !== "undefined" ? DIALOGS : {};
  const storageKey = "nexora-ai-chat-v2";
  const aliases = {
    about:["кто ты","что ты такое","как тебя зовут","о тебе","who are you","нексора аи","нексора ии"],
    creator:["кто создал","кто разработал","твой автор","разработчик","кто твой создатель","кто тебя сделал","toolgool","тулгул"],
    skills:["что умеешь","твои возможности","чем можешь помочь","функции","что можешь","способности"],
    how_work:["как работаешь","как устроен","как ты отвечаешь","как отвечаешь","как работает ии"],
    models:["какая модель","какую модель","нейросеть","gpt","chatgpt","llm","искусственный интеллект"],
    internet:["доступ в интернет","интернет","выход в сеть","онлайн поиск"],
    search:["найди в интернете","поищи","найти сайт","поиск"],
    fresh_info:["сегодняшние новости","последние новости","актуальная информация","свежие данные","сегодня произошло"],
    coding:["программирование","написать код","javascript","html","css","python","программист","кодинг"],
    coding_help:["проверь код","исправить код","ошибка в коде"],
    technical:["не работает","ошибка","не открывается","сломалось","помоги исправить","проблема","баг","выдает ошибку"],
    download:["скачать","скачивание","загрузить файл","файл не скачивается"],
    download_missing:["не появился файл","файл пропал","не вижу файл"],
    download_stuck:["зависла загрузка","застряло скачивание","не докачивается"],
    website_error:["ошибка сайта","сайт не работает","страница не загружается","белый экран","404","500"],
    support:["поддержка","помощь человека","обратиться в поддержку","связаться с поддержкой"],
    privacy:["приватность","конфиденциальность","мои данные","данные пользователей","персональные данные"],
    security:["безопасность","апи ключ","api key","секретный ключ","токен"],
    status:["статус","состояние системы","работает ли","сервис работает"],
    version:["версия","какая версия","обновление"],
    greeting:["привет","здравствуй","здравствуйте","хай","ку","hello","добрый день","добрый вечер","доброе утро","салам"],
    thanks:["спасибо","благодарю","спс","thanks"],
    goodbye:["пока","до свидания","до связи","бай","прощай"],
    joke:["анекдот","шутка","рассмеши","пошути"],
    feedback:["отзыв","предложение","хочу предложить","улучшение"],
    contact:["как связаться","контакт","telegram","телеграм","твой разработчик"],
    database:["база данных","откуда знания","база знаний"],
    memory:["помнишь","запоминаешь","память","сохраняешь сообщения"],
    tl_project:["tl project","тл проект","что за проект","nexora","социальная сеть"]
  };
  const normalize = value => String(value || "").toLowerCase().replace(/ё/g, "е").replace(/[!?.,:;()[\]{}"'«»]/g, " ").replace(/\s+/g," ").trim();
  const tokenize = value => normalize(value).split(" ").filter(word => word.length >= 3);
  function identify(input, recentKey) {
    const text = normalize(input);
    if (!text) return null;
    if (/^(привет|здравствуй|здравствуйте|хай|ку|hello|салам|добрый (день|вечер|утро))$/.test(text)) return "greeting";
    if (/^(спасибо|благодарю|спс|thanks)( большое)?$/.test(text)) return "thanks";
    if (/^(пока|бай|до свидания|до связи)$/.test(text)) return "goodbye";
    const priority = ["website_error","download_stuck","download_missing","api_security","fresh_info","coding_help","technical","creator","about","skills","security"];
    let matches = [];
    for(const [key,phrases] of Object.entries(aliases)) {
      if(!dict[key]) continue;
      let score = 0;
      for(const phrase of phrases) {
        const p=normalize(phrase);
        if(text===p) score=Math.max(score,120+p.length);
        else if(p.length>3 && (" "+text+" ").includes(" "+p+" ")) score=Math.max(score,40+p.length);
        else if(p.includes(" ") && text.includes(p)) score=Math.max(score,35+p.length);
      }
      if(score) matches.push({key,score:score+(priority.includes(key)?1:0)});
    }
    if(matches.length) return matches.sort((a,b)=>b.score-a.score)[0].key;
    const words=tokenize(text);
    if(!words.length) return null;
    let ranked=[];
    for(const [key,data] of Object.entries(dict)){
      if(!data || !Array.isArray(data.options)) continue;
      for(const raw of data.options){
        const [label,target]=raw.split(" | ");
        if(!target || !dict[target] || target==="main") continue;
        const labelWords=tokenize(label);
        if(!labelWords.length) continue;
        const common=labelWords.filter(w=>words.includes(w)).length;
        const ratio=common/labelWords.length;
        if(common>=2 || (common>=1 && ratio>=1 && words.length<=3)) ranked.push({key:target,score:ratio*10+common+(key===recentKey?3:0)});
      }
    }
    ranked.sort((a,b)=>b.score-a.score);
    if(ranked.length) return ranked[0].key;
    return null;
  }
  let history=[];
  let currentKey="main";
  const conversation=$("conversation"),scroll=$("chat-scroll"),welcome=$("welcome"),suggestions=$("suggestions"),topics=$("topics-dialog");
  function load(){
    try{
      const saved=JSON.parse(localStorage.getItem(storageKey)||"[]");
      if(Array.isArray(saved)) history=saved.filter(x=>x&&["user","ai"].includes(x.role)&&typeof x.text==="string").slice(-70).map(x=>({role:x.role,text:x.text.slice(0,6000),key:typeof x.key==="string"?x.key:""}));
      const recent=[...history].reverse().find(x=>x.key);
      if(recent) currentKey=recent.key;
    }catch{history=[];}
  }
  function save(){try{localStorage.setItem(storageKey,JSON.stringify(history.slice(-70)));}catch{}}
  function scrollBottom(){requestAnimationFrame(()=>{scroll.scrollTop=scroll.scrollHeight;});}
  function hideWelcome(){if(welcome) welcome.hidden=true;const fresh=$("welcome-new");if(fresh)fresh.remove();}
  function addMessage(role,text,key="",persist=true){
    hideWelcome();
    const outer=document.createElement("article");outer.className="message "+(role==="user"?"user":"ai");
    if(role==="ai"){const avatar=document.createElement("div");avatar.className="avatar";avatar.textContent="N";outer.append(avatar);}
    const body=document.createElement("div");body.className="message-body";
    const meta=document.createElement("div");meta.className="message-meta";meta.textContent=role==="ai"?"NEXORA AI":"Вы";
    const bubble=document.createElement("div");bubble.className="message-bubble";
    if(role==="ai") setContent(bubble,text);else bubble.textContent=text;
    body.append(meta,bubble);
    if(role==="ai"){const actions=document.createElement("div");actions.className="message-actions";const copy=document.createElement("button");copy.className="tiny-button";copy.type="button";copy.textContent="Копировать";copy.addEventListener("click",async()=>{try{await navigator.clipboard.writeText(text);copy.textContent="Скопировано ✓";setTimeout(()=>copy.textContent="Копировать",1500);}catch{copy.textContent="Не удалось скопировать";}});actions.append(copy);body.append(actions);}
    outer.append(body);conversation.append(outer);
    if(persist){history.push({role,text,key});save();}
    scrollBottom();
  }
  function setContent(node,text){
    const link=/\[([^\]]{1,100})\]\((https?:\/\/[^\s)]+)\)/g;
    let last=0,match;
    while((match=link.exec(text))){node.append(document.createTextNode(text.slice(last,match.index)));const a=document.createElement("a");a.className="message-link";a.textContent=match[1];a.href=match[2];a.target="_blank";a.rel="noopener noreferrer";node.append(a);last=link.lastIndex;}
    node.append(document.createTextNode(text.slice(last)));
  }
  let answerTimer=null, typeTimer=null, activeTyping=null;
  function cancelTyping(){
    if(answerTimer!==null)clearTimeout(answerTimer);
    if(typeTimer!==null)clearTimeout(typeTimer);
    answerTimer=null;typeTimer=null;
    if(activeTyping){activeTyping.remove();activeTyping=null;}
  }
  function animateAnswer(answer,key){
    cancelTyping();
    const typing=document.createElement("article");typing.className="message ai typing-message";activeTyping=typing;
    const avatar=document.createElement("div");avatar.className="avatar";avatar.textContent="N";
    const body=document.createElement("div");body.className="message-body";
    const meta=document.createElement("div");meta.className="message-meta";meta.textContent="NEXORA AI · печатает";
    const bubble=document.createElement("div");bubble.className="message-bubble";
    const indicator=document.createElement("div");indicator.className="typing";indicator.innerHTML="<i></i><i></i><i></i>";
    bubble.append(indicator);body.append(meta,bubble);typing.append(avatar,body);conversation.append(typing);scrollBottom();
    answerTimer=setTimeout(()=>{
      answerTimer=null;indicator.remove();meta.textContent="NEXORA AI";typing.classList.remove("typing-message");typing.classList.add("writing-message");
      const output=document.createElement("span");output.className="typewriter-text";bubble.append(output);
      const caret=document.createElement("span");caret.className="typing-caret";caret.setAttribute("aria-hidden","true");bubble.append(caret);
      const skip=document.createElement("button");skip.type="button";skip.className="skip-typing";skip.textContent="Показать полностью ↗";body.append(skip);
      const chars=Array.from(answer);let pos=0;
      const step=Math.max(6,Math.min(22,Math.round(1600/Math.max(1,chars.length))));
      let finished=false;
      function finish(){
        if(finished)return;finished=true;
        if(typeTimer!==null){clearTimeout(typeTimer);typeTimer=null;}
        skip.remove();caret.remove();output.remove();setContent(bubble,answer);
        typing.classList.remove("writing-message");activeTyping=null;
        history.push({role:"ai",text:answer,key});save();renderSuggestions(key);scrollBottom();
      }
      skip.addEventListener("click",finish,{once:true});
      function tick(){
        if(pos>=chars.length){finish();return;}
        const count=Math.min(chars.length-pos,Math.max(1,Math.ceil(chars.length/190)));
        output.textContent+=chars.slice(pos,pos+count).join("");pos+=count;
        if(pos%12===0)scrollBottom();
        typeTimer=setTimeout(tick,step);
      }
      tick();
    },420);
  }
  function renderSuggestions(key){
    suggestions.replaceChildren();
    const data=dict[key]||dict.main;
    (data?.options||[]).filter(x=>!x.toLowerCase().startsWith("назад |")&&!x.toLowerCase().startsWith("на главную |")).slice(0,4).forEach(option=>{
      const [label,target]=option.split(" | ");
      if(!label||!dict[target])return;
      const button=document.createElement("button");button.type="button";button.textContent=label;button.addEventListener("click",()=>ask(label,target));suggestions.append(button);
    });
  }
  function ask(question,forceKey=""){
    const text=String(question||"").trim().slice(0,2000);if(!text)return;
    cancelTyping();addMessage("user",text);
    const key=forceKey&&dict[forceKey]?forceKey:identify(text,currentKey);
    const answer=key&&dict[key]?dict[key].text:"Выберите вопрос из доступных вариантов.";
    currentKey=key||"unknown";
    suggestions.replaceChildren();
    animateAnswer(answer,currentKey);

    closeSidebar();
  }
    function resetChat(){
    if(!history.length)return;
    if(!confirm("Очистить историю этого чата?"))return;
    cancelTyping();history=[];currentKey="main";save();conversation.replaceChildren();const intro=document.createElement("section");intro.className="welcome";intro.id="welcome-new";intro.innerHTML='<div class="hero-mark" aria-hidden="true"><span>N</span><i></i><i></i></div><div class="eyebrow">НОВЫЙ ДИАЛОГ</div><h1>О чём поговорим?</h1><p>Выберите тему из предложенных вопросов ниже.</p>';
    conversation.append(intro);renderSuggestions("main");closeSidebar();
  }
  const sidebar=$("sidebar"),overlay=$("mobile-overlay");
  function closeSidebar(){sidebar.classList.remove("open");overlay.hidden=true;$("menu-button").setAttribute("aria-expanded","false");}
  function toggleSidebar(){const open=!sidebar.classList.contains("open");sidebar.classList.toggle("open",open);overlay.hidden=!open;$("menu-button").setAttribute("aria-expanded",String(open));}
  function showTopics(){
    closeSidebar();$("topics-search").value="";renderTopics("");topics.showModal();$("topics-search").focus();
  }
  function renderTopics(query){
    const list=$("topics-list");list.replaceChildren();
    const q=normalize(query);
    const existing=new Set();let n=0;
    Object.values(dict).forEach(data=>(data?.options||[]).forEach(line=>{
      const [label,target]=line.split(" | ");
      if(!dict[target]||target==="main"||/^(назад|на главную)/i.test(label)||existing.has(label))return;
      if(q&&!normalize(label).includes(q))return;
      existing.add(label);
      const b=document.createElement("button");b.type="button";b.textContent=label;b.addEventListener("click",()=>{topics.close();ask(label,target);});list.append(b);n++;
    }));
    if(!n){const p=document.createElement("p");p.textContent="Не найдено вопросов.";p.style.padding="14px";list.append(p);}
  }
  $("new-chat").addEventListener("click",resetChat);
  $("clear-button").addEventListener("click",resetChat);
  $("topics-button").addEventListener("click",showTopics);
  $("help-button").addEventListener("click",showTopics);
  $("all-questions").addEventListener("click",showTopics);
  $("about-button").addEventListener("click",()=>{closeSidebar();ask("Кто ты?","about");});
  $("close-topics").addEventListener("click",()=>topics.close());
  $("topics-search").addEventListener("input",e=>renderTopics(e.target.value));
  $("menu-button").addEventListener("click",toggleSidebar);
  overlay.addEventListener("click",closeSidebar);
  $("starter-grid").addEventListener("click",e=>{const button=e.target.closest("[data-question]");if(button)ask(button.dataset.question);});
  // Lightweight starfield and interactive glass highlights
  const stars=$("stars");
  if(stars){
    const frag=document.createDocumentFragment();
    for(let i=0;i<44;i++){
      const star=document.createElement("i");star.className="star";
      const hash=n=>((i*73+n*131+17)%997)/997;
      star.style.setProperty("--x",(hash(1)*100).toFixed(2)+"%");
      star.style.setProperty("--y",(hash(2)*100).toFixed(2)+"%");
      star.style.setProperty("--size",(1+hash(3)*2).toFixed(2)+"px");
      star.style.setProperty("--opacity",(0.18+hash(4)*0.52).toFixed(2));
      star.style.setProperty("--duration",(2+hash(5)*5).toFixed(2)+"s");
      star.style.setProperty("--delay",(-hash(6)*6).toFixed(2)+"s");
      frag.append(star);
    }
    stars.append(frag);
  }
  const motionToggle=$("motion-toggle");
  const motionPreference=window.matchMedia("(prefers-reduced-motion: reduce)");
  let motionEnabled=!motionPreference.matches;
  try{const stored=localStorage.getItem("nexora-motion");if(stored!==null)motionEnabled=stored==="on";}catch{}
  function setMotion(enabled){
    motionEnabled=enabled;
    document.body.classList.toggle("motion-off",!enabled);
    motionToggle.setAttribute("aria-pressed",String(enabled));
    motionToggle.title=enabled?"Отключить эффекты":"Включить эффекты";
    motionToggle.textContent=enabled?"✧":"◌";
  }
  setMotion(motionEnabled);
  motionToggle.addEventListener("click",()=>{setMotion(!motionEnabled);try{localStorage.setItem("nexora-motion",motionEnabled?"on":"off");}catch{}});
  const grid=$("starter-grid");
  if(grid)grid.addEventListener("pointermove",e=>{
    if(!motionEnabled||e.pointerType==="touch")return;
    const card=e.target.closest("button");
    if(!card)return;
    const rect=card.getBoundingClientRect();
    card.style.setProperty("--mx",(e.clientX-rect.left)+"px");
    card.style.setProperty("--my",(e.clientY-rect.top)+"px");
  });
  load();
  if(history.length){for(const msg of history)addMessage(msg.role,msg.text,msg.key,false);}
  renderSuggestions(currentKey);

})();