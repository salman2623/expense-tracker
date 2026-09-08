const KEY="leave_tracker_v1";
const defaults={requiredDays:220};
let data=JSON.parse(localStorage.getItem(KEY)||"null")||{version:1,year:new Date().getFullYear(),leaves:[],settings:defaults};
data.settings={...defaults,...(data.settings||{})};
let year=new Date().getFullYear(), filter="all";

const $=id=>document.getElementById(id);
const iso=d=>{const x=new Date(d);return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,"0")}-${String(x.getDate()).padStart(2,"0")}`};
const today=iso(new Date());
function save(){localStorage.setItem(KEY,JSON.stringify(data))}
function isWeekend(s){const d=new Date(s+"T00:00:00").getDay();return d===0||d===6}
function daysInYear(y){return new Date(y,1,29).getMonth()===1?366:365}
function weekdays(y){let n=0;for(let m=0;m<12;m++)for(let d=1;d<=new Date(y,m+1,0).getDate();d++)if(new Date(y,m,d).getDay()>0&&new Date(y,m,d).getDay()<6)n++;return n}
function elapsedWeekdays(y){let end=y===new Date().getFullYear()?new Date():new Date(y,11,31);let n=0;for(let d=new Date(y,0,1);d<=end;d.setDate(d.getDate()+1))if(d.getDay()>0&&d.getDay()<6)n++;return n}
function fmt(s){return new Date(s+"T00:00:00").toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})}
function monthName(m){return new Date(year,m,1).toLocaleDateString("en-IN",{month:"long"})}
function render(){
 $("yearTitle").textContent=year; $("calendarHeading").textContent=year+" calendar";
 const leaves=data.leaves.filter(x=>x.date.startsWith(year+"-"));
 const off=leaves.filter(x=>x.type==="offshore").length,on=leaves.filter(x=>x.type==="onshore").length,total=leaves.length;
 const wd=weekdays(year), elapsed=elapsedWeekdays(year), worked=Math.max(0,elapsed-total);
 const target=Number(data.settings.requiredDays)||220;
 const fullYearLeaveCapacity=Math.max(0,wd-target);
 const expectedLeave=year===new Date().getFullYear()?Math.round(fullYearLeaveCapacity*(elapsed/wd)):fullYearLeaveCapacity;
 const diff=total-expectedLeave;
 $("workingDays").textContent=wd;$("workedDays").textContent=`${worked} worked · ${Math.max(0,wd-elapsed)} upcoming`;
 $("leaveDays").textContent=total;$("leaveBreakdown").textContent=`${off} offshore · ${on} onshore`;
 $("workTarget").textContent=target;$("workProgress").textContent=`${worked} / ${target} worked`;
 if(year!==new Date().getFullYear()){
   $("statusText").textContent=`Full year: ${target} working days required`;
 } else {
   $("statusText").textContent=`By today: ${expectedLeave} leave ${expectedLeave===1?"day":"days"} expected`;
 }
 $("statusValue").textContent=diff>0?`${diff} excess`:diff<0?`${-diff} to apply`:"On track";
 $("statusLabel").textContent=diff>0?"Excess leave taken":diff<0?"Leave still to apply":"Leave on track";
 $("balanceBadge").textContent=diff>0?"Above pace":diff<0?"Below pace":"On track";
 $("balanceBadge").className="balance-badge "+(diff>0?"bad":diff<0?"warn":"good");
 renderCalendar();renderList(leaves);
}
function renderCalendar(){
 let html='<div class="weekdays">'+["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(x=>`<span>${x}</span>`).join("")+'</div><div class="months">';
 for(let m=0;m<12;m++){
  const first=new Date(year,m,1), offset=(first.getDay()+6)%7, count=new Date(year,m+1,0).getDate();
  html+=`<section class="month"><h3>${monthName(m)}</h3><div class="days">`;
  for(let i=0;i<offset;i++)html+='<button class="day blank" disabled></button>';
  for(let d=1;d<=count;d++){
   const s=`${year}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`, l=data.leaves.find(x=>x.date===s), wk=isWeekend(s);
   html+=`<button class="day ${wk?"weekend":""} ${l?"leave "+l.type:""} ${s===today?"today":""}" data-date="${s}" ${wk?"disabled":""} title="${wk?"Weekend":l?l.type+" leave": "Log leave"}">${d}${l?`<i>${l.type==="offshore"?"O":"N"}</i>`:""}</button>`;
  }
  html+='</div></section>';
 }
 html+='</div>'; $("calendar").innerHTML=html;
 document.querySelectorAll(".day:not(.blank):not(.weekend)").forEach(b=>b.onclick=()=>{const l=data.leaves.find(x=>x.date===b.dataset.date);l?openModal(l):openModal(null,b.dataset.date)});
}
function renderList(leaves){
 const arr=leaves.filter(x=>filter==="all"||x.type===filter).sort((a,b)=>b.date.localeCompare(a.date));
 $("logSubtitle").textContent=`${arr.length} ${arr.length===1?"day":"days"}`;
 $("leaveList").innerHTML=arr.map(l=>`<article class="leave-item" data-id="${l.id}"><div class="type-icon ${l.type}">${l.type==="offshore"?"O":"N"}</div><div><b>${l.type==="offshore"?"Offshore":"Onshore"}</b><small>${fmt(l.date)}${l.note?" · "+esc(l.note):""}</small></div><span>›</span></article>`).join("");
 $("emptyState").hidden=arr.length!==0;document.querySelectorAll(".leave-item").forEach(x=>x.onclick=()=>openModal(data.leaves.find(l=>l.id===x.dataset.id)));
}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
function openModal(l=null,date=today){$("modalBackdrop").hidden=false;$("modalTitle").textContent=l?"Edit Leave":"Add Leave";$("leaveId").value=l?.id||"";$("date").value=l?.date||date;$("type").value=l?.type||"offshore";$("note").value=l?.note||"";$("deleteBtn").hidden=!l}
function closeModal(){$("modalBackdrop").hidden=true}
$("addBtn").onclick=()=>openModal();$("closeModal").onclick=closeModal;$("modalBackdrop").onclick=e=>{if(e.target===$("modalBackdrop"))closeModal()};
$("leaveForm").onsubmit=e=>{e.preventDefault();const id=$("leaveId").value,d=$("date").value;if(isWeekend(d)){alert("Weekends are holidays and cannot be logged as leave.");return}const item={id:id||crypto.randomUUID(),date:d,type:$("type").value,note:$("note").value.trim(),createdAt:id?(data.leaves.find(x=>x.id===id)?.createdAt||Date.now()):Date.now()};if(id)data.leaves=data.leaves.map(x=>x.id===id?item:x);else data.leaves.push(item);save();closeModal();render();toast("Leave saved")};
$("deleteBtn").onclick=()=>{const id=$("leaveId").value;if(confirm("Delete this leave entry?")){data.leaves=data.leaves.filter(x=>x.id!==id);save();closeModal();render();toast("Leave deleted")}};
$("prevYear").onclick=()=>{year--;render()};$("nextYear").onclick=()=>{year++;render()};$("todayBtn").onclick=()=>{year=new Date().getFullYear();render()};
$("filterBtn").onclick=()=>{filter=filter==="all"?"offshore":filter==="offshore"?"onshore":"all";$("filterBtn").textContent=(filter==="all"?"All":filter[0].toUpperCase()+filter.slice(1))+" ▾";renderList(data.leaves.filter(x=>x.date.startsWith(year+"-")))};
$("settingsBtn").onclick=()=>{$("settingsModal").hidden=false;$("requiredDays").value=data.settings.requiredDays};
$("closeSettings").onclick=()=>{$("settingsModal").hidden=true};$("settingsModal").onclick=e=>{if(e.target===$("settingsModal"))$("settingsModal").hidden=true};
$("requiredDays").onchange=e=>{data.settings.requiredDays=Number(e.target.value)||0;save();render()};
$("exportBtn").onclick=()=>{const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:"application/json"}));a.download=`leave-backup-${today}.json`;a.click();toast("Backup exported")};
$("importFile").onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const x=JSON.parse(r.result);if(!Array.isArray(x.leaves))throw 0;data={...data,...x,settings:{...defaults,...x.settings}};save();year=new Date().getFullYear();render();$("settingsModal").hidden=true;toast("Backup restored")}catch{alert("Invalid backup file.")}e.target.value=""};r.readAsText(f)};
$("clearBtn").onclick=()=>{if(confirm("Delete all leave records?")){data.leaves=[];save();render();$("settingsModal").hidden=true;toast("Leave records cleared")}};
window.onkeydown=e=>{if(e.key==="Escape"){closeModal();$("settingsModal").hidden=true}};if("serviceWorker"in navigator)navigator.serviceWorker.register("sw.js").catch(()=>{});render();
