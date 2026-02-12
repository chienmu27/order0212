
import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom/client';

// ==========================================
// 1. 常數設定
// ==========================================
const GOOGLE_FORM_URL = "https://docs.google.com/forms/d/e/1FAIpQLScooZ_B9Jm7a2-IsEfJhwhLR7hsLyy8knIU3TKuzM7pw_Z5RQ/viewform?embedded=true";
const LOOKUP_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQISD3cRAvsldviyxyfFi7xQVE12l900EW1yu8_OXOS-uDIr12XAr8zISHsZpJzTBLe_j4kuHWwgdG6/pub?gid=1785595426&single=true&output=csv";
const MANAGEMENT_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQISD3cRAvsldviyxyfFi7xQVE12l900EW1yu8_OXOS-uDIr12XAr8zISHsZpJzTBLe_j4kuHWwgdG6/pub?gid=1605656850&single=true&output=csv";
const MANAGEMENT_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzh9zPFHf6vmhQQR7LrHlokXkPPKnQ2u9ZiqnL6x9kMe4YSaMkrLJJOsqU72OXOIwwo/exec";
const SETTINGS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxsG1au7MoB7WKs397tM0ZQciSZkdyM_U5Bgb7FBTzOn9OVLFi6_94waAz3HEddovIY/exec";

enum AppTab {
  FORM = 'form',
  LOOKUP = 'lookup',
  MANAGEMENT = 'management',
  SETTINGS = 'settings'
}

// ==========================================
// 2. 工具函式
// ==========================================
function parseCSV(text: string): string[][] {
  const result: string[][] = [];
  let cur: string[] = [];
  let curVal = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];
    if (inQuotes) {
      if (ch === '"' && next === '"') { curVal += '"'; i++; }
      else if (ch === '"') inQuotes = false;
      else curVal += ch;
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ',') { cur.push(curVal); curVal = ""; }
      else if (ch === '\n') { cur.push(curVal); result.push(cur); cur = []; curVal = ""; }
      else if (ch !== '\r') curVal += ch;
    }
  }
  if (curVal !== "" || cur.length > 0) { cur.push(curVal); result.push(cur); }
  return result;
}

// ==========================================
// 3. 功能組件
// ==========================================

const OrderForm = () => (
  <div className="flex flex-col h-full min-h-[2000px]">
    <div className="bg-blue-50 p-4 border-b border-blue-100 flex justify-center items-center">
      <h2 className="text-lg font-bold text-blue-800">📝 填寫訂單</h2>
    </div>
    <iframe 
      src={GOOGLE_FORM_URL} 
      className="w-full flex-grow border-none min-h-[2000px]" 
      title="Form"
    >
      載入中...
    </iframe>
  </div>
);

const OrderLookup = () => {
  const [data, setData] = useState({ title: '訂單查詢', header: [], dataRows: [] });
  const [loading, setLoading] = useState(true);
  const [selectedBuyer, setSelectedBuyer] = useState('');
  const [selectedStat, setSelectedStat] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${LOOKUP_CSV_URL}&t=${Date.now()}`);
      const text = await res.text();
      const parsed = parseCSV(text).filter(r => r.some(c => c.trim() !== ""));
      if (parsed.length > 1) {
        setData({
          title: `${parsed[0][2] || "訂單查詢"} (${parsed[0][0] || ""})`,
          header: parsed[1],
          dataRows: parsed.slice(2)
        });
      }
    } catch (e) { console.error("CSV Load Error:", e); }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const buyers = useMemo(() => {
    const idx = data.header.indexOf("購買人");
    if (idx === -1) return [];
    return [...new Set(data.dataRows.map(r => (r[idx] || "").trim()).filter(v => v && v !== "購買人"))].sort();
  }, [data]);

  return (
    <div className="p-4 md:p-6">
      <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">{data.title}</h2>
      <div className="bg-gray-50 rounded-xl border p-4 mb-6 shadow-sm flex flex-wrap gap-4 items-center justify-center sm:justify-start">
        <div className="flex items-center gap-2">
          <label className="text-sm font-bold text-gray-700 whitespace-nowrap">訂購人：</label>
          <select value={selectedBuyer} onChange={e => { setSelectedBuyer(e.target.value); setSelectedStat(''); }} className="border rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm">
            <option value="">--請選擇--</option>
            <option value="ALL">全部訂單清單</option>
            {buyers.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-bold text-gray-700 whitespace-nowrap">統計報表：</label>
          <select value={selectedStat} onChange={e => { setSelectedStat(e.target.value); setSelectedBuyer(''); }} className="border rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm">
            <option value="">--請選擇--</option>
            <option value="list1">購買人 / 金額總計</option>
            <option value="list2">項目 / 數量總計</option>
          </select>
        </div>
        {loading && <span className="text-blue-500 animate-pulse font-medium ml-auto">同步資料中...</span>}
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-md">
        <table className="w-full text-sm">
          <thead className="bg-blue-600 text-white">
            {selectedStat === 'list1' ? (
              <tr><th className="p-3 border-r border-blue-500">購買人</th><th className="p-3">金額總計</th></tr>
            ) : selectedStat === 'list2' ? (
              <tr><th className="p-3 border-r border-blue-500">項目</th><th className="p-3">數量總計</th></tr>
            ) : (
              <tr>
                <th className="p-3 border-r border-blue-500">購買人</th><th className="p-3 border-r border-blue-500">項目</th>
                <th className="p-3 border-r border-blue-500 text-nowrap">單價</th><th className="p-3 border-r border-blue-500">加飯</th>
                <th className="p-3 border-r border-blue-500">加料</th><th className="p-3 border-r border-blue-500">數量</th>
                <th className="p-3">小計</th>
              </tr>
            )}
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {(!selectedBuyer && !selectedStat) ? (
              <tr><td colSpan={10} className="p-16 text-center text-gray-400 font-medium">請從上方選單選擇查詢條件</td></tr>
            ) : selectedStat === 'list1' ? (
              (() => {
                const summary: any = {};
                let total = 0;
                const idxB = data.header.indexOf("購買人");
                const idxS = data.header.indexOf("小計");
                data.dataRows.forEach(r => {
                  const name = (r[idxB] || "").trim();
                  const amt = Number(r[idxS]) || 0;
                  if (name) { summary[name] = (summary[name] || 0) + amt; total += amt; }
                });
                return <>
                  {Object.keys(summary).sort().map(n => <tr key={n} className="hover:bg-blue-50"><td className="p-3 border-r text-center">{n}</td><td className="p-3 text-center font-bold text-blue-600">{summary[n]}</td></tr>)}
                  <tr className="bg-blue-50 font-bold"><td className="p-3 border-r text-center">全體總計</td><td className="p-3 text-center text-blue-700 text-lg">{total}</td></tr>
                </>;
              })()
            ) : selectedStat === 'list2' ? (
              (() => {
                const summary: any = {};
                let total = 0;
                const idxI = data.header.indexOf("項目");
                const idxQ = data.header.indexOf("數量");
                data.dataRows.forEach(r => {
                  const item = (r[idxI] || "").trim();
                  const qty = Number(r[idxQ]) || 0;
                  if (item) { summary[item] = (summary[item] || 0) + qty; total += qty; }
                });
                return <>
                  {Object.keys(summary).sort().map(i => <tr key={i} className="hover:bg-blue-50"><td className="p-3 border-r text-center">{i}</td><td className="p-3 text-center font-bold text-blue-600">{summary[i]}</td></tr>)}
                  <tr className="bg-blue-50 font-bold"><td className="p-3 border-r text-center">總數量</td><td className="p-3 text-center text-blue-700 text-lg">{total}</td></tr>
                </>;
              })()
            ) : (
              (() => {
                const header = data.header;
                const idx = {
                  item: header.indexOf("項目"), price: header.indexOf("單價"), rice: header.indexOf("加飯"),
                  add: header.indexOf("加料"), qty: header.indexOf("數量"), sub: header.indexOf("小計"), buyer: header.indexOf("購買人")
                };
                const filtered = selectedBuyer === "ALL" ? data.dataRows : data.dataRows.filter(r => (r[idx.buyer] || "").trim() === selectedBuyer);
                let total = 0;
                return <>
                  {filtered.map((r, i) => {
                    const sub = Number(r[idx.sub]) || 0; total += sub;
                    return <tr key={i} className="hover:bg-blue-50 transition-colors">
                      <td className="p-2.5 border-r text-center font-medium">{r[idx.buyer]}</td>
                      <td className="p-2.5 border-r text-center">{r[idx.item]}</td>
                      <td className="p-2.5 border-r text-center text-gray-500">{r[idx.price]}</td>
                      <td className="p-2.5 border-r text-center text-gray-500">{r[idx.rice]}</td>
                      <td className="p-2.5 border-r text-center text-gray-500">{r[idx.add]}</td>
                      <td className="p-2.5 border-r text-center font-bold">{r[idx.qty]}</td>
                      <td className="p-2.5 text-center font-bold text-blue-600">{sub}</td>
                    </tr>
                  })}
                  {selectedBuyer !== "ALL" && <tr className="bg-blue-50 font-bold"><td colSpan={6} className="p-3 border-r text-right text-gray-700">個人合計</td><td className="p-3 text-center text-blue-700 text-lg">{total}</td></tr>}
                </>;
              })()
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const OrderManagement = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [targetRow, setTargetRow] = useState<any>(null);
  const [password, setPassword] = useState('');

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${MANAGEMENT_CSV_URL}&t=${Date.now()}`);
      const text = await res.text();
      const rows = parseCSV(text);
      if (rows.length < 2) { setOrders([]); }
      else {
        const header = rows[0];
        const idx = { time: header.indexOf("時間戳記"), user: header.indexOf("訂餐人員"), item: header.indexOf("便當品項"), qty: header.indexOf("數量"), note: header.indexOf("備註") };
        setOrders(rows.slice(1).map((r, i) => ({
          time: r[idx.time] || "", user: r[idx.user] || "", item: r[idx.item] || "", qty: r[idx.qty] || "", note: r[idx.note] || "", row: i + 2
        })).filter(o => o.user));
      }
    } catch (e) { alert("無法連結 CSV 資料庫"); }
    setLoading(false);
  };

  useEffect(() => { fetchOrders(); }, []);

  const handleDelete = async () => {
    if (!password) { alert("請輸入管理密碼"); return; }
    setShowModal(false);
    setLoading(true);
    try {
      const res = await fetch(MANAGEMENT_SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({ row: targetRow, password: password })
      });
      const result = await res.json();
      alert(result.message);
      if (result.status === 'success') fetchOrders();
    } catch (e) { alert("伺服器通訊錯誤"); }
    setLoading(false);
  };

  return (
    <div className="p-4 md:p-6 relative">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
        <h3 className="font-bold text-xl text-gray-800 flex items-center gap-2">📋 訂單後台管理</h3>
        <div className="flex gap-2">
          <button onClick={fetchOrders} className="text-sm px-4 py-2 border border-gray-300 rounded-lg hover:bg-white bg-gray-50 shadow-sm transition-all flex items-center gap-1">🔄 刷新資料</button>
          <button onClick={() => { setTargetRow('all'); setShowModal(true); setPassword(''); }} className="text-sm px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition-all bg-red-50 shadow-sm flex items-center gap-1">🗑️ 全部清空</button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-md">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 border-b border-gray-200">
            <tr>
              <th className="p-3 text-gray-600">時間</th><th className="p-3 text-gray-600">人員</th>
              <th className="p-3 text-gray-600">品項</th><th className="p-3 text-gray-600">數量</th>
              <th className="p-3 text-gray-600">備註</th><th className="p-3 text-gray-600">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {orders.length === 0 ? <tr><td colSpan={6} className="p-20 text-center text-gray-400 font-medium">資料庫目前無任何訂單</td></tr> : orders.map(o => (
              <tr key={o.row} className="hover:bg-gray-50 transition-colors">
                <td className="p-3 text-center text-gray-500">{o.time.split(' ')[0]}</td>
                <td className="p-3 text-center font-bold text-gray-700">{o.user}</td>
                <td className="p-3 text-center">{o.item}</td>
                <td className="p-3 text-center font-bold text-blue-600">{o.qty}</td>
                <td className="p-3 text-xs text-gray-400 max-w-[120px] truncate">{o.note}</td>
                <td className="p-3 text-center">
                  <button onClick={() => { setTargetRow(o.row); setShowModal(true); setPassword(''); }} className="text-xs font-bold px-3 py-1.5 bg-red-50 text-red-500 border border-red-200 rounded-md hover:bg-red-500 hover:text-white transition-all">刪除</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm transform scale-100 animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold text-gray-800 mb-2">安全驗證</h3>
            <p className="text-sm text-gray-500 mb-6">{targetRow === 'all' ? "此操作將清空所有訂單，請確認密碼：" : "請輸入管理密碼執行刪除操作："}</p>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full border-2 border-gray-200 p-3 rounded-xl mb-6 outline-none focus:border-blue-500 transition-colors text-lg text-center" placeholder="管理密碼" autoFocus onKeyDown={(e) => e.key === 'Enter' && handleDelete()} />
            <div className="flex gap-3">
              <button onClick={() => setShowModal(false)} className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl font-bold transition-colors">取消</button>
              <button onClick={handleDelete} className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-100 transition-colors">確認執行</button>
            </div>
          </div>
        </div>
      )}

      {loading && <div className="absolute inset-0 bg-white/70 backdrop-blur-[2px] flex items-center justify-center z-[90] rounded-xl"><div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div></div>}
    </div>
  );
};

const Settings = () => {
  const [form, setForm] = useState({ date: new Date().toISOString().split('T')[0], store: '', acc: '', pwd: '' });
  const [stores, setStores] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ msg: '', type: '' });

  useEffect(() => {
    fetch(`${SETTINGS_SCRIPT_URL}?action=getOptions`)
      .then(r => r.json()).then(data => {
        const filtered = data.filter((v: any) => v);
        setStores(filtered);
        if (filtered.length > 0) setForm(prev => ({ ...prev, store: filtered[0] }));
      }).catch(() => setStatus({ msg: "無法取得店家清單", type: "error" }));
  }, []);

  const submit = async () => {
    if (!form.acc || !form.pwd || !form.date || !form.store) { alert("請填寫完整的帳密與設定資訊"); return; }
    setLoading(true); setStatus({ msg: "正在更新伺服器設定...", type: "" });
    try {
      const url = `${SETTINGS_SCRIPT_URL}?action=submit&date=${encodeURIComponent(form.date)}&store=${encodeURIComponent(form.store)}&acc=${encodeURIComponent(form.acc)}&pwd=${encodeURIComponent(form.pwd)}`;
      const res = await fetch(url);
      const text = await res.text();
      setStatus({ msg: text, type: text.includes("成功") ? "success" : "error" });
      if (text.includes("成功")) setForm(prev => ({ ...prev, acc: '', pwd: '' }));
    } catch (e) { setStatus({ msg: "伺服器連線超時", type: "error" }); }
    setLoading(false);
  };

  return (
    <div className="max-w-md mx-auto p-4 md:p-8">
      <div className="bg-white rounded-3xl border border-gray-100 shadow-2xl overflow-hidden">
        <div className="bg-blue-600 p-8 text-center text-white">
          <h3 className="text-2xl font-bold">⚙️ 系統初始化</h3>
          <p className="text-xs text-blue-100 mt-2 opacity-80 uppercase tracking-widest">Update daily lunch settings</p>
        </div>
        <div className="p-8 space-y-5">
          <div>
            <label className="text-xs font-black text-gray-400 uppercase mb-2 block tracking-wider">今日訂餐日期</label>
            <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="w-full p-3 bg-gray-50 border-2 border-gray-50 rounded-xl focus:border-blue-500 focus:bg-white outline-none transition-all font-medium" />
          </div>
          <div>
            <label className="text-xs font-black text-gray-400 uppercase mb-2 block tracking-wider">配合店家選單</label>
            <select value={form.store} onChange={e => setForm({ ...form, store: e.target.value })} className="w-full p-3 bg-gray-50 border-2 border-gray-50 rounded-xl focus:border-blue-500 focus:bg-white outline-none transition-all font-medium">
              {stores.length === 0 ? <option>載入店家選單中...</option> : stores.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="py-2"><div className="border-t-2 border-dashed border-gray-100"></div></div>
          <div>
            <label className="text-xs font-black text-gray-400 uppercase mb-2 block tracking-wider">管理員帳號</label>
            <input type="text" value={form.acc} onChange={e => setForm({ ...form, acc: e.target.value })} className="w-full p-3 bg-gray-50 border-2 border-gray-50 rounded-xl focus:border-blue-500 focus:bg-white outline-none transition-all" placeholder="Admin Account" />
          </div>
          <div>
            <label className="text-xs font-black text-gray-400 uppercase mb-2 block tracking-wider">管理員密碼</label>
            <input type="password" value={form.pwd} onChange={e => setForm({ ...form, pwd: e.target.value })} className="w-full p-3 bg-gray-50 border-2 border-gray-50 rounded-xl focus:border-blue-500 focus:bg-white outline-none transition-all" placeholder="Password" />
          </div>
          <button onClick={submit} disabled={loading} className={`w-full py-4 rounded-2xl font-bold text-white shadow-xl transform active:scale-95 transition-all ${loading ? 'bg-gray-300' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-100'}`}>
            {loading ? '通訊中...' : '確認更新系統設定'}
          </button>
          {status.msg && (
            <div className={`text-center p-3 rounded-xl text-sm font-bold animate-pulse ${status.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {status.msg}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 4. 主程式進入點 (Navigation)
// ==========================================
const App = () => {
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.FORM);
  const tabs = [
    { id: AppTab.FORM, name: '📝 填單', comp: <OrderForm /> },
    { id: AppTab.LOOKUP, name: '🔍 查詢', comp: <OrderLookup /> },
    { id: AppTab.MANAGEMENT, name: '🗑️ 刪除', comp: <OrderManagement /> },
    { id: AppTab.SETTINGS, name: '⚙️ 設定', comp: <Settings /> },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <header className="bg-white shadow-md sticky top-0 z-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 flex justify-between items-center h-16">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black text-lg shadow-blue-200 shadow-lg">L</div>
            <span className="text-lg font-black text-gray-800 hidden sm:block">午餐系統</span>
          </div>
          <nav className="flex space-x-1 sm:space-x-3 overflow-x-auto no-scrollbar py-1">
            {tabs.map(t => (
              <button 
                key={t.id} 
                onClick={() => setActiveTab(t.id)} 
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
                  activeTab === t.id 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-100 scale-105' 
                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'
                }`}
              >
                {t.name}
              </button>
            ))}
          </nav>
        </div>
      </header>
      <main className="flex-grow container mx-auto px-4 py-8 max-w-5xl">
        <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 overflow-hidden min-h-[70vh] border border-gray-100">
          {tabs.find(t => t.id === activeTab)?.comp}
        </div>
      </main>
      <footer className="bg-gray-800 text-gray-400 py-6 text-center text-[10px] tracking-[0.2em] uppercase font-bold">
        &copy; {new Date().getFullYear()} Lunch Order Portal • Version 2.0
      </footer>
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<React.StrictMode><App /></React.StrictMode>);
