(() => {
 const key = 'fitkocum_watch_sets_v1';
 const names = new Map([
  ['0025', 'Bench Press'],
  ['drv-cable-bar-lateral-pulldown-wide-shoulder-grip', 'Lat Pulldown'],
  ['1435', 'Squat'],
  ['0314', 'Incline Press'],
  ['0294', 'Biceps Curl']
 ]);
 const status = document.getElementById('watchSyncStatus');
 const history = document.getElementById('watchSetHistory');
 const read = () => JSON.parse(localStorage.getItem(key) || '{}');

 function render(records) {
  history.replaceChildren();
  Object.values(records).sort((a, b) => b.occurredAt - a.occurredAt).slice(0, 100).forEach(set => {
   const row = document.createElement('div');
   row.className = 'history-item';
   const name = document.createElement('strong');
   name.textContent = names.get(set.exerciseId);
   const details = document.createElement('small');
   details.textContent = set.setNumber + '. set · ' + new Date(set.occurredAt).toLocaleString('tr-TR');
   row.append(name, details);
   history.append(row);
  });
  if (!history.childElementCount) history.textContent = 'Henüz saatten set gelmedi.';
 }

 window.fitWatchStatus = message => { status.textContent = message; };
 window.fitReceiveWatchSet = raw => {
  try {
   const event = JSON.parse(raw);
   const set = event.payload;
   if (event.v !== 1 || event.type !== 'set.completed' ||
       typeof event.messageId !== 'string' || !/^watch-[a-z0-9-]{4,60}$/.test(event.messageId) ||
       !set || !names.has(set.exerciseId) ||
       !Number.isInteger(set.setNumber) || set.setNumber < 1 || set.setNumber > 10 ||
       !Number.isSafeInteger(set.occurredAt) || set.occurredAt < 1 || set.occurredAt > 8640000000000000) {
    return false;
   }
   const records = read();
   if (!Object.hasOwn(records, event.messageId)) {
    records[event.messageId] = {
     exerciseId: set.exerciseId, setNumber: set.setNumber, occurredAt: set.occurredAt
    };
    localStorage.setItem(key, JSON.stringify(records));
    render(records);
   }
   status.textContent = 'Saat seti kaydedildi.';
   return true;
  } catch {
   status.textContent = 'Saat seti kaydedilemedi.';
   return false;
  }
 };
 document.getElementById('watchSyncConnect').onclick = () => window.FitAndroid?.connectWatch();
 try { render(read()); } catch { status.textContent = 'Saat kayıtları okunamadı.'; }
})();
