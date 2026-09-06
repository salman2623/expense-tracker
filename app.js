const KEY="expense_tracker_v1";
let expenses=JSON.parse(localStorage.getItem(KEY)||"[]");
let viewDate=new Date(); viewDate.setDate(1);
let currentFilter="all";

const $=id=>document.getElementById(id);
const money=n=>new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:2}).format(Number(n)||0);
const icons={Home:"🏠",Food:"🍴",Transport:"🚗",Shopping:"🛍️",Bills:"💡",Health:"❤️",Education:"📚",Entertainment:"🎬",Other:"💳"};

function save(){localStorage.setItem(KEY,JSON.stringify(expenses))}
function monthKey(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`}
function monthExpenses(){const k=monthKey(viewDate);return expenses.filter(e=>e.date.startsWith(k))}
function render(){
  $("monthTitle").textContent=viewDate.toLocaleDateString("en-IN",{month:"long",year:"numeric"});
  const list=monthExpenses();
  const total=list.reduce((s,e)=>s+e.amount,0), paid=list.filter(e=>e.status==="paid"), unpaid=list.filter(e=>e.status==="unpaid");
  $("totalAmount").textContent=money(total); $("paidAmount").textContent=money(paid.reduce((s,e)=>s+e.amount,0));
  $("unpaidAmount").textContent=money(unpaid.reduce((s,e)=>s+e.amount,0));
  $("balanceAmount").textContent=money(unpaid.reduce((s,e)=>s+e.amount,0));
  $("paidCount").textContent=`${paid.length} ${paid.length===1?"expense":"expenses"}`;
  $("unpaidCount").textContent=`${unpaid.length} ${unpaid.length===1?"expense":"expenses"}`;
  $("balanceBadge").textContent=unpaid.length?"Needs attention":"All clear";
  $("balanceBadge").style.background=unpaid.length?"var(--orange-bg)":"var(--green-bg)";
  $("balanceBadge").style.color=unpaid.length?"var(--orange)":"var(--green)";
  let filtered=list.filter(e=>currentFilter==="all"||e.status===currentFilter).sort((a,b)=>b.date.localeCompare(a.date)||b.createdAt-a.createdAt);
  $("expenseSubtitle").textContent=`${filtered.length} ${filtered.length===1?"expense":"expenses"}`;
  $("filterBtn").textContent=(currentFilter==="all"?"All":currentFilter[0].toUpperCase()+currentFilter.slice(1))+" ▾";
  $("expenseList").innerHTML=filtered.map(e=>`
    <article class="expense" data-id="${e.id}">
      <div class="category-icon">${icons[e.category]||"💳"}</div>
      <div><div class="expense-name">${esc(e.description)}</div><div class="expense-meta">${esc(e.category)} · ${fmtDate(e.date)}</div></div>
      <div class="expense-right"><div class="expense-amount">${money(e.amount)}</div><div class="status ${e.status}">${e.status==="paid"?"PAID":"UNPAID"}</div></div>
    </article>`).join("");
  $("emptyState").hidden=filtered.length!==0;
  document.querySelectorAll(".expense").forEach(x=>x.onclick=()=>openEdit(x.dataset.id));
}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
function fmtDate(s){return new Date(s+"T00:00:00").toLocaleDateString("en-IN",{day:"numeric",month:"short"})}
function openModal(edit=null){
  $("modalBackdrop").hidden=false;
  $("modalTitle").textContent=edit?"Edit Expense":"Add Expense";
  $("expenseId").value=edit?.id||"";$("description").value=edit?.description||"";
  $("amount").value=edit?.amount??"";$("date").value=edit?.date||new Date().toISOString().slice(0,10);
  $("category").value=edit?.category||"Home";$("status").value=edit?.status||"unpaid";$("notes").value=edit?.notes||"";
  $("deleteBtn").hidden=!edit; setTimeout(()=>$("description").focus(),50);
}
function closeModal(){$("modalBackdrop").hidden=true}
function openEdit(id){openModal(expenses.find(e=>e.id===id))}
$("addBtn").onclick=()=>openModal();
$("closeModal").onclick=closeModal;
$("modalBackdrop").onclick=e=>{if(e.target===$("modalBackdrop"))closeModal()}
$("expenseForm").onsubmit=e=>{
 e.preventDefault(); const id=$("expenseId").value;
 const item={id:id||crypto.randomUUID(),description:$("description").value.trim(),amount:Number($("amount").value),date:$("date").value,category:$("category").value,status:$("status").value,notes:$("notes").value.trim(),createdAt:id?(expenses.find(x=>x.id===id)?.createdAt||Date.now()):Date.now()};
 if(!item.description||!item.amount||!item.date)return;
 if(id)expenses=expenses.map(x=>x.id===id?item:x);else expenses.push(item);
 save();closeModal();render();toast(id?"Expense updated":"Expense added");
};
$("deleteBtn").onclick=()=>{const id=$("expenseId").value;if(confirm("Delete this expense?")){expenses=expenses.filter(e=>e.id!==id);save();closeModal();render();toast("Expense deleted")}}
$("prevMonth").onclick=()=>{viewDate.setMonth(viewDate.getMonth()-1);render()}
$("nextMonth").onclick=()=>{viewDate.setMonth(viewDate.getMonth()+1);render()}
$("filterBtn").onclick=()=>{currentFilter=currentFilter==="all"?"unpaid":currentFilter==="unpaid"?"paid":"all";render()}
document.querySelectorAll(".summary-card").forEach(b=>b.onclick=()=>{currentFilter=b.dataset.filter;render()});

$("settingsBtn").onclick=()=>$("settingsModal").hidden=false;
$("closeSettings").onclick=()=>$("settingsModal").hidden=true;
$("settingsModal").onclick=e=>{if(e.target===$("settingsModal"))$("settingsModal").hidden=true}

window.addEventListener("keydown",e=>{
  if(e.key==="Escape"){
    closeModal();
    $("settingsModal").hidden=true;
  }
});

$("exportBtn").onclick=()=>{
 const blob=new Blob([JSON.stringify({version:1,exportedAt:new Date().toISOString(),expenses},null,2)],{type:"application/json"});
 const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`expense-backup-${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(a.href);toast("Backup exported");
}
$("importFile").onchange=e=>{
 const f=e.target.files[0];if(!f)return;const r=new FileReader();
 r.onload=()=>{try{const data=JSON.parse(r.result);if(!Array.isArray(data.expenses))throw 0;expenses=data.expenses;save();render();$("settingsModal").hidden=true;toast("Backup restored")}catch{alert("Invalid backup file.")}e.target.value=""};r.readAsText(f);
}
$("clearBtn").onclick=()=>{if(confirm("Delete ALL expenses? This cannot be undone.")){expenses=[];save();render();$("settingsModal").hidden=true;toast("All data cleared")}}
function toast(t){$("toast").textContent=t;$("toast").classList.add("show");setTimeout(()=>$("toast").classList.remove("show"),1800)}
if("serviceWorker" in navigator)navigator.serviceWorker.register("sw.js").catch(()=>{});
render();
