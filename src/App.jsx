import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  TrendingUp,
  User,
  Activity,
  RefreshCcw,
  ChevronRight,
  PieChart as PieIcon,
  Navigation,
  Timer,
  XCircle,
  Target,
  Upload,
  BarChart3,
  Layers
} from 'lucide-react';
import {
  AreaChart, Area,
  BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { format, parseISO, getDay, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import * as XLSX from 'xlsx';

// ─── Constants ────────────────────────────────────────────────────────────────
const DAYS_OF_WEEK = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const COLORS = ['#ffb400', '#ff8c00', '#f59e0b', '#d97706', '#b45309', '#78350f', '#fcd34d', '#fbbf24', '#4facfe', '#a78bfa', '#34d399', '#f87171'];
const SERVICE_COLORS = {
  'Travel | UberX':       '#00b5f5',
  'Travel | Black':       '#1a1a1a',
  'Travel | Comfort':     '#6c5ce7',
  'Travel | Comfort Planet': '#a29bfe',
  'Travel | VIP':         '#fdcb6e',
  'Travel | Flash':       '#fd79a8',
  'Travel | Flash Moto':  '#e17055',
  'Travel | Flash+':      '#fab1a0',
  'Travel | Moto':        '#55efc4',
  'Travel | Prioridade':  '#74b9ff',
  'Travel | Priority':    '#74b9ff',
  'Travel | Wait & Save': '#dfe6e9',
  'Travel | Uber Espere e Economize': '#b2bec3',
  'Travel | Envios Moto': '#00cec9',
  'Travel | Envios Carro':'#81ecec',
};

const formatCurrency = (val) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

const CAAD_CC = 'IR002CAAD0';

// ─── MultiSelect Component ─────────────────────────────────────────────────────
const MultiSelect = ({ label, options, selectedValues, onChange }) => {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const h = (e) => { if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const toggle = (val) => {
    if (selectedValues.includes(val)) onChange(selectedValues.filter(v => v !== val));
    else onChange([...selectedValues, val]);
  };

  const displayLabel = selectedValues.length === 0
    ? 'Todos'
    : selectedValues.length === 1
      ? (options.find(o => o.value === selectedValues[0])?.label ?? selectedValues[0])
      : `${selectedValues.length} selecionado(s)`;

  return (
    <div className="filter-group" style={{ position: 'relative' }} ref={wrapperRef}>
      <label>{label}</label>
      <div
        className="filter-select"
        onClick={() => setOpen(!open)}
        style={{ minHeight: '38px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', background: '#1a1e23', padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid rgba(255, 255, 255, 0.1)' }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '85%', fontSize: '0.85rem' }}>
          {displayLabel}
        </span>
        <ChevronRight size={14} style={{ transform: open ? 'rotate(90deg)' : 'rotate(0)', transition: 'transform 0.2s' }} />
      </div>
      {open && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#1a1e23', border: '1px solid rgba(255,255,255,0.1)', zIndex: 100, maxHeight: '250px', overflowY: 'auto', borderRadius: '0.5rem', marginTop: '4px' }}>
          <div onClick={() => onChange([])} style={{ padding: '8px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center' }}>
            <input type="checkbox" checked={selectedValues.length === 0} readOnly style={{ marginRight: '8px' }} />
            <strong style={{ fontSize: '0.8rem' }}>Todos</strong>
          </div>
          {options.map(opt => (
            <div key={opt.value} onClick={() => toggle(opt.value)} style={{ padding: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', background: selectedValues.includes(opt.value) ? 'rgba(255,180,0,0.08)' : 'transparent' }}>
              <input type="checkbox" checked={selectedValues.includes(opt.value)} readOnly style={{ marginRight: '8px' }} />
              <span style={{ fontSize: '0.8rem' }}>{opt.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Budget vs Realized Chart ──────────────────────────────────────────────────
const BudgetChart = ({ filteredData, budgetData, filterOptions }) => {
  if (!budgetData || Object.keys(budgetData).length === 0) {
    return (
      <p style={{ color: '#6b7280', textAlign: 'center', padding: '3rem 1rem', fontSize: '0.9rem' }}>
        📎 Carregue a planilha de orçamento (Excel) usando o botão acima para ver o confronto Orçado × Realizado.
      </p>
    );
  }

  // Build month-by-month comparison
  const realizedByMonth = {};
  filteredData.forEach(item => {
    const m = String(item.date).substring(5, 7);
    realizedByMonth[m] = (realizedByMonth[m] || 0) + (parseFloat(item.value) || 0);
  });

  const data = filterOptions.months.map(m => {
    const monthLabel = format(parseISO(`2020-${m}-01`), 'MMM', { locale: ptBR });
    const realizado = realizedByMonth[m] || 0;
    const orcado = budgetData[m] || 0;
    const pct = orcado > 0 ? (((realizado - orcado) / orcado) * 100).toFixed(1) : null;
    return { month: monthLabel, Realizado: realizado, Orçado: orçado, pct };
  }).filter(d => d.Orçado > 0 || d.Realizado > 0);

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    const orc = payload.find(p => p.dataKey === 'Orçado')?.value || 0;
    const real = payload.find(p => p.dataKey === 'Realizado')?.value || 0;
    const pct = orc > 0 ? (((real - orc) / orc) * 100).toFixed(1) : '-';
    const isOver = real > orc;
    const color = isOver ? '#ef4444' : '#10b981';
    return (
      <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '12px', fontSize: '0.82rem' }}>
        <p style={{ fontWeight: 'bold', marginBottom: '8px', color: '#fff' }}>{label}</p>
        <p style={{ color: 'rgba(255,255,255,0.5)' }}>Orçado: {formatCurrency(orc)}</p>
        <p style={{ color: '#ffb400' }}>Realizado: {formatCurrency(real)}</p>
        <p style={{ color, fontWeight: 'bold', marginTop: '6px' }}>
          {isOver ? '🔴' : '✅'} {pct}%
        </p>
      </div>
    );
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
        <XAxis dataKey="month" stroke="#6b7280" fontSize={11} axisLine={false} tickLine={false} />
        <YAxis stroke="#6b7280" fontSize={11} axisLine={false} tickLine={false} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
        <Legend />
        <Bar dataKey="Orçado" fill="rgba(255,255,255,0.12)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="Realizado" radius={[4, 4, 0, 0]}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.Realizado <= entry.Orçado ? '#10b981' : '#ef4444'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

// ─── Main App ──────────────────────────────────────────────────────────────────
const App = () => {
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [budgetData, setBudgetData] = useState({}); // { "01": total, "02": total, ... }
  const fileInputRef = useRef(null);
  const budgetInputRef = useRef(null);

  const [filters, setFilters] = useState({
    years: [], months: [], costCenters: [], daysOfWeek: [], collaborators: []
  });
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [selectedPeakHour, setSelectedPeakHour] = useState(null);

  // ── Data loading
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/dados_uber.json');
        if (!response.ok) throw new Error('Falha ao carregar dados_uber.json');
        const json = await response.json();
        setRawData(normalizeData(json));
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };
    const fetchBudget = async () => {
      try {
        const response = await fetch('/orcamento.json');
        if (!response.ok) return;
        const json = await response.json();
        const budget = {};
        Object.entries(json).forEach(([cc, months]) => {
          Object.entries(months).forEach(([month, value]) => {
            budget[month] = (budget[month] || 0) + value;
          });
        });
        if (Object.keys(budget).length > 0) {
          setBudgetData(budget);
        }
      } catch (err) { console.error('Erro ao carregar orçamento:', err); }
    };
    fetchData();
    fetchBudget();
  }, []);

  // ── Normalize
  const normalizeData = (data) => {
    if (!Array.isArray(data)) return [];
    const excelDateToString = (val) => {
      if (typeof val === 'number') {
        const date = new Date(Math.round((val - 25569) * 86400 * 1000));
        return date.toISOString().split('T')[0];
      }
      if (typeof val === 'string' && val.includes('/')) {
        const parts = val.split('/');
        if (parts[0].length === 4) return `${parts[0]}-${parts[1].padStart(2,'0')}-${parts[2].padStart(2,'0')}`;
        return `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`;
      }
      return val || '';
    };

    return data.map(row => {
      let rawTime = row['HORA DA SOLICITAÇÃO2'] || row['HORA DA SOLICITAÇÃO'] || row['Hora'] || row['Time'] || row['hora'] || '';
      let hourInt = null;
      if (rawTime) {
        if (typeof rawTime === 'string') {
          const matchPM = rawTime.match(/(\d+):(\d+)\s*(PM|AM)/i);
          if (matchPM) {
            hourInt = parseInt(matchPM[1]);
            if (matchPM[3].toUpperCase() === 'PM' && hourInt < 12) hourInt += 12;
            if (matchPM[3].toUpperCase() === 'AM' && hourInt === 12) hourInt = 0;
          } else {
            const simpleMatch = rawTime.match(/(\d+):(\d+)/);
            if (simpleMatch) hourInt = parseInt(simpleMatch[1]);
          }
        } else if (typeof rawTime === 'number') {
          hourInt = Math.floor(rawTime * 24);
        }
      }
      const dateRaw = row['REGISTRO DATA E HORA DA TRANSAÇÃO'] || row['DATA'] || row['DATA DA SOLICITAÇÃO'] || row.date || row.Date || row.data || row.Data || '';
      return {
        date: excelDateToString(dateRaw),
        driver: row['NOME COMPLETO'] || row.driver || row.Driver || row.motorista || 'Desconhecido',
        value: parseFloat(row['VALOR TOTAL'] || row.value || row.Value || row.valor || row.Valor || 0),
        service: row['SERVIÇO'] || row.service || row.Service || row.servico || row['Serviço'] || 'Outros',
        costCenter: (row['CENTRO DE CUSTO'] || row.costCenter || row.CostCenter || row.centro_custo || row['Centro de Custo'] || 'Geral').trim(),
        origin: row['ENDEREÇO DE PARTIDA'] || row.origin || row.Origin || 'N/A',
        destination: row['ENDEREÇO DE DESTINO'] || row.destination || row.Destination || 'N/A',
        area: row['ÁREA'] || row['AREA'] || '',
        subArea: row['SUB ÁREA'] || row['SUB AREA'] || row['Sub Área'] || row['Sub Area'] || '',
        detalhamento: row['DETALHAMENTO DA DESPESA'] || '',
        hour: hourInt
      };
    });
  };

  // ── Excel upload (trip data)
  const handleExcelUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws);
        setRawData(normalizeData(data));
        setLoading(false);
        resetFilters();
      } catch { setError('Erro ao ler Excel'); setLoading(false); }
    };
    reader.readAsBinaryString(file);
  };

  // ── Budget Excel upload
  const handleBudgetUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: 'binary' });
        const budget = {};
        // Expects sheets named as month numbers "01","02"... or month names
        // OR a single sheet with columns: MÊS | ORÇADO
        const MONTH_MAP = {
          'janeiro':'01','fevereiro':'02','março':'03','abril':'04',
          'maio':'05','junho':'06','julho':'07','agosto':'08',
          'setembro':'09','outubro':'10','novembro':'11','dezembro':'12',
          '01':'01','02':'02','03':'03','04':'04','05':'05','06':'06',
          '07':'07','08':'08','09':'09','10':'10','11':'11','12':'12',
        };
        wb.SheetNames.forEach(sheetName => {
          const key = MONTH_MAP[sheetName.toLowerCase().trim()];
          if (key) {
            const ws = wb.Sheets[sheetName];
            const rows = XLSX.utils.sheet_to_json(ws);
            // Sum all numeric values in second column (orçado total)
            const total = rows.reduce((acc, row) => {
              const vals = Object.values(row).filter(v => typeof v === 'number');
              return acc + (vals[vals.length - 1] || 0);
            }, 0);
            budget[key] = (budget[key] || 0) + total;
          }
        });
        // Fallback: single sheet with MÊS + ORÇADO columns
        if (Object.keys(budget).length === 0) {
          const ws = wb.Sheets[wb.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json(ws);
          rows.forEach(row => {
            const mesRaw = String(Object.values(row)[0] || '').toLowerCase().trim();
            const key = MONTH_MAP[mesRaw];
            const orc = parseFloat(Object.values(row)[1] || 0);
            if (key && orc) budget[key] = (budget[key] || 0) + orc;
          });
        }
        setBudgetData(budget);
      } catch (err) { alert('Erro ao ler planilha de orçamento: ' + err.message); }
    };
    reader.readAsBinaryString(file);
  };

  // ── Filter options
  const filterOptions = useMemo(() => {
    if (!rawData.length) return { years: [], costCenters: [], months: [], collaborators: [] };
    const years = [...new Set(rawData.map(d => String(d.date).substring(0,4)))].filter(y => y.match(/^\d{4}$/)).sort();
    const costCenters = [...new Set(rawData.map(d => d.costCenter))].sort();
    const collaborators = [...new Set(rawData.map(d => d.driver))].filter(Boolean).sort();
    const months = ['01','02','03','04','05','06','07','08','09','10','11','12'];
    return { years, costCenters, months, collaborators };
  }, [rawData]);

  // ── Filtered data
  const filteredData = useMemo(() => {
    return rawData.filter(item => {
      const dateStr = String(item.date);
      const parsedDate = parseISO(dateStr);
      const dayOfWeek = isValid(parsedDate) ? getDay(parsedDate) : -1;
      if (filters.years.length > 0 && !filters.years.includes(dateStr.substring(0,4))) return false;
      if (filters.months.length > 0 && !filters.months.includes(dateStr.substring(5,7))) return false;
      if (filters.costCenters.length > 0 && !filters.costCenters.includes(item.costCenter)) return false;
      if (filters.daysOfWeek.length > 0 && (dayOfWeek === -1 || !filters.daysOfWeek.includes(DAYS_OF_WEEK[dayOfWeek]))) return false;
      if (filters.collaborators.length > 0 && !filters.collaborators.includes(item.driver)) return false;
      if (selectedMonth && dateStr.substring(0,7) !== selectedMonth) return false;
      return true;
    });
  }, [rawData, filters, selectedMonth]);

  // ── Computed stats
  const stats = useMemo(() => {
    if (!filteredData.length) return null;
    let totalVal = 0;
    let drivers = {}, timeline = {}, costCentersMap = {}, servicesMap = {}, subAreasMap = {};
    let destinationsSet = {};
    let peakHoursMap = Array(24).fill(0).map((_, i) => ({ hour: `${i}h`, count: 0, driversRaw: {} }));

    filteredData.forEach(item => {
      const val = parseFloat(item.value) || 0;
      const dateStr = String(item.date);
      const monthKey = dateStr.substring(0,7);
      const cc = item.costCenter || 'Geral';
      totalVal += val;

      if (!timeline[monthKey]) timeline[monthKey] = { date: monthKey, value: 0 };
      timeline[monthKey].value += val;

      if (!drivers[item.driver]) drivers[item.driver] = { name: item.driver, value: 0 };
      drivers[item.driver].value += val;

      if (!costCentersMap[cc]) costCentersMap[cc] = { name: cc, value: 0 };
      costCentersMap[cc].value += val;

      // Services map
      const svc = item.service || 'Outros';
      if (!servicesMap[svc]) servicesMap[svc] = { name: svc, value: 0, count: 0 };
      servicesMap[svc].value += val;
      servicesMap[svc].count++;

      // Sub-areas for CAAD
      if (cc === CAAD_CC) {
        const sub = item.subArea || item.area || item.detalhamento || 'Não informado';
        if (!subAreasMap[sub]) subAreasMap[sub] = { name: sub, value: 0 };
        subAreasMap[sub].value += val;
      }

      if (item.destination) destinationsSet[item.destination] = (destinationsSet[item.destination] || 0) + 1;

      if (item.hour !== null && item.hour >= 0 && item.hour < 24) {
        peakHoursMap[item.hour].count++;
        peakHoursMap[item.hour].driversRaw[item.driver] = (peakHoursMap[item.hour].driversRaw[item.driver] || 0) + 1;
      }
    });

    const peakHoursData = peakHoursMap.map(ph => ({
      hour: ph.hour, count: ph.count,
      drivers: Object.entries(ph.driversRaw).map(([name, qtd]) => ({ name, qtd })).sort((a,b) => b.qtd - a.qtd)
    }));

    const ccSorted = Object.values(costCentersMap).sort((a,b) => b.value - a.value);
    const servicesSorted = Object.values(servicesMap).sort((a,b) => b.count - a.count);

    const safeTimeline = Object.values(timeline)
      .sort((a,b) => a.date.localeCompare(b.date))
      .map(d => {
        try {
          const date = parseISO(d.date + '-01');
          if (!isValid(date)) return { ...d, label: 'Inválido' };
          return { ...d, label: format(date, 'MMM yy', { locale: ptBR }) };
        } catch { return { ...d, label: 'Erro' }; }
      })
      .filter(d => d.label && d.label !== 'Inválido' && d.label !== 'Erro');

    return {
      totalVal,
      trips: filteredData.length,
      avgVal: totalVal / filteredData.length,
      timeline: safeTimeline,
      topColab: Object.values(drivers).sort((a,b) => b.value - a.value).slice(0, 10),
      topCC: ccSorted[0],
      costCenterRateio: ccSorted,
      topDestinations: Object.entries(destinationsSet).sort((a,b) => b[1] - a[1]).slice(0, 10),
      peakHoursData,
      servicesSorted,
      subAreasData: Object.values(subAreasMap).sort((a,b) => b.value - a.value),
    };
  }, [filteredData]);

  // ── Comparison data (year over year)
  const comparisonData = useMemo(() => {
    let currY;
    if (filters.years.length === 1) currY = filters.years[0];
    else if (filters.years.length === 0 && filterOptions.years?.length > 0)
      currY = filterOptions.years[filterOptions.years.length - 1];
    else return null;

    const prevY = (parseInt(currY) - 1).toString();
    const currM = {}, prevM = {};
    rawData.forEach(d => {
      const y = String(d.date).substring(0,4);
      const m = String(d.date).substring(5,7);
      if (filters.months.length > 0 && !filters.months.includes(m)) return;
      if (filters.costCenters.length > 0 && !filters.costCenters.includes(d.costCenter)) return;
      if (filters.collaborators.length > 0 && !filters.collaborators.includes(d.driver)) return;
      const parsedDate = parseISO(String(d.date));
      const dayOfWeek = isValid(parsedDate) ? getDay(parsedDate) : -1;
      if (filters.daysOfWeek.length > 0 && (dayOfWeek === -1 || !filters.daysOfWeek.includes(DAYS_OF_WEEK[dayOfWeek]))) return;
      if (y === currY) currM[m] = (currM[m] || 0) + parseFloat(d.value || 0);
      if (y === prevY) prevM[m] = (prevM[m] || 0) + parseFloat(d.value || 0);
    });
    return filterOptions.months.map(m => ({
      month: format(parseISO(`2020-${m}-01`), 'MMM', { locale: ptBR }),
      Atual: currM[m] || 0,
      Anterior: prevM[m] || 0,
    }));
  }, [rawData, filters, filterOptions, selectedMonth]);

  const resetFilters = () => {
    setFilters({ years: [], months: [], costCenters: [], daysOfWeek: [], collaborators: [] });
    setSelectedMonth(null);
  };

  // ── Check if CAAD is the active filter or in filtered data
  const isCAADFiltered = filters.costCenters.length === 1 && filters.costCenters[0] === CAAD_CC;

  // ── Service name cleanup for chart labels
  const cleanServiceName = (name) => name.replace('Travel | ', '');

  if (loading) return <div className="loader-box">Sincronizando...</div>;
  if (error) return <div className="error-box">{error}</div>;

  return (
    <div className="dashboard-container">
      {/* ─── Header ─────────────────────────────────────────────────── */}
      <header className="header">
        <div className="title-section" style={{ zIndex: 2 }}>
          <img src="/logo.png" alt="LAMSA" className="lamsa-logo" />
          <h1>DASHBOARD VIAGENS UBER</h1>
          <p>Portal de Mobilidade Corporativa - LAMSA</p>
        </div>
        <div className="header-actions" style={{ zIndex: 2, display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button className="glass-card btn-excel" onClick={() => fileInputRef.current.click()}
            style={{ background: 'rgba(255,180,0,0.1)', border: '1px solid rgba(255,180,0,0.3)', color: '#ffb400', padding: '0.5rem 1rem', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
            📊 Carregar Dados Excel
          </button>
          <button
            onClick={() => budgetInputRef.current.click()}
            style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', color: '#10b981', padding: '0.5rem 1rem', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
            🎯 Carregar Orçamento
          </button>
          <button className="btn-clear" onClick={resetFilters}><RefreshCcw size={16} /> Limpar Filtros</button>
          <input type="file" ref={fileInputRef} onChange={handleExcelUpload} style={{ display: 'none' }} accept=".xlsx,.xls" />
          <input type="file" ref={budgetInputRef} onChange={handleBudgetUpload} style={{ display: 'none' }} accept=".xlsx,.xls" />
        </div>
      </header>

      {/* ─── Filters ─────────────────────────────────────────────────── */}
      <div className="filters-bar">
        <MultiSelect label="ANO" options={filterOptions.years.map(y => ({ label: y, value: y }))} selectedValues={filters.years} onChange={val => setFilters({ ...filters, years: val })} />
        <MultiSelect label="MÊS" options={filterOptions.months.map(m => ({ label: format(parseISO(`2020-${m}-01`), 'MMMM', { locale: ptBR }), value: m }))} selectedValues={filters.months} onChange={val => setFilters({ ...filters, months: val })} />
        <MultiSelect label="CENTRO DE CUSTO" options={filterOptions.costCenters.map(c => ({ label: c, value: c }))} selectedValues={filters.costCenters} onChange={val => setFilters({ ...filters, costCenters: val })} />
        <MultiSelect label="DIA DA SEMANA" options={DAYS_OF_WEEK.map(d => ({ label: d, value: d }))} selectedValues={filters.daysOfWeek} onChange={val => setFilters({ ...filters, daysOfWeek: val })} />
        <MultiSelect label="COLABORADORES" options={filterOptions.collaborators.map(c => ({ label: c, value: c }))} selectedValues={filters.collaborators} onChange={val => setFilters({ ...filters, collaborators: val })} />
      </div>

      {/* ─── KPI Cards ─────────────────────────────────────────────────── */}
      <div className="stats-grid">
        {/* FATURAMENTO */}
        <div className="glass-card stat-card">
          <div className="stat-label">FATURAMENTO TOTAL</div>
          <div className="stat-value">{formatCurrency(stats?.totalVal || 0)}</div>
          <div className="stat-sub" style={{ color: '#10b981' }}>💰 Valor Total do Filtro</div>
        </div>
        {/* TOTAL DE VIAGENS */}
        <div className="glass-card stat-card">
          <div className="stat-label">TOTAL DE VIAGENS</div>
          <div className="stat-value">{(stats?.trips || 0).toLocaleString('pt-BR')}</div>
          <div className="stat-sub">🚗 Corridas Realizadas</div>
        </div>
        {/* MAIOR GASTO CC */}
        <div className="glass-card stat-card">
          <div className="stat-label">MAIOR GASTO: CC</div>
          <div className="stat-value" style={{ color: 'var(--primary)', fontSize: '1.4rem' }}>{stats?.topCC?.name || '-'}</div>
          <div className="stat-sub">💼 {formatCurrency(stats?.topCC?.value || 0)}</div>
        </div>
        {/* TICKET MÉDIO */}
        <div className="glass-card stat-card">
          <div className="stat-label">TICKET MÉDIO</div>
          <div className="stat-value">{formatCurrency(stats?.avgVal || 0)}</div>
          <div className="stat-sub" style={{ color: '#a78bfa' }}>📈 Por Corrida</div>
        </div>
      </div>

      {/* ─── Charts Grid ─────────────────────────────────────────────────── */}
      <div className="charts-grid">

        {/* Evolução Mensal */}
        <div className="glass-card chart-span-8">
          <h2 className="chart-title"><TrendingUp size={18} color="var(--primary)" /> Evolução Mensal (Clique no mês para filtrar)</h2>
          <div style={{ height: '350px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats?.timeline} onClick={(e) => e?.activeLabel && setSelectedMonth(stats.timeline.find(d => d.label === e.activeLabel)?.date)}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="label" stroke="#6b7280" fontSize={11} axisLine={false} tickLine={false} />
                <YAxis stroke="#6b7280" fontSize={11} axisLine={false} tickLine={false} tickFormatter={v => `R$${v/1000}k`} />
                <Tooltip formatter={(value) => [formatCurrency(value), 'Faturamento']} contentStyle={{ background: '#111', border: 'none', borderRadius: '8px' }} />
                <Area type="monotone" dataKey="value" stroke="var(--primary)" strokeWidth={3} fillOpacity={0.3} fill="var(--primary)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Rateio CC */}
        <div className="glass-card chart-span-4">
          <h2 className="chart-title"><PieIcon size={18} color="#8b5cf6" /> RATEIO CENTROS DE CUSTO</h2>
          <div style={{ height: '350px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={stats?.costCenterRateio || []} dataKey="value" innerRadius={60} outerRadius={90} nameKey="name">
                  {(stats?.costCenterRateio || []).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '9px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Orçado X Realizado */}
        <div className="glass-card chart-span-8">
          <h2 className="chart-title">
            <Target size={18} color="#10b981" /> Orçado × Realizado
            {Object.keys(budgetData).length === 0 && (
              <span style={{ marginLeft: '1rem', fontSize: '0.75rem', background: 'rgba(16,185,129,0.1)', color: '#10b981', padding: '2px 8px', borderRadius: '4px', cursor: 'pointer' }}
                onClick={() => budgetInputRef.current.click()}>
                + Carregar Orçamento
              </span>
            )}
          </h2>
          <div style={{ height: '350px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BudgetChart filteredData={filteredData} budgetData={budgetData} filterOptions={filterOptions} />
          </div>
        </div>

        {/* Pizza de Serviços */}
        <div className="glass-card chart-span-4">
          <h2 className="chart-title"><PieIcon size={18} color="#4facfe" /> SERVIÇOS MAIS UTILIZADOS</h2>
          <div style={{ height: '350px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={(stats?.servicesSorted || []).map(s => ({ ...s, name: cleanServiceName(s.name) }))}
                  dataKey="count"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={85}
                  label={({ name, percent }) => percent > 0.04 ? `${(percent * 100).toFixed(0)}%` : ''}
                  labelLine={false}
                >
                  {(stats?.servicesSorted || []).map((entry, i) => (
                    <Cell key={i} fill={SERVICE_COLORS[entry.name] || COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name) => [`${value} corridas`, name]} />
                <Legend
                  layout="vertical"
                  verticalAlign="middle"
                  align="right"
                  wrapperStyle={{ fontSize: '9px', maxWidth: '120px' }}
                  formatter={(value) => value.length > 18 ? value.substring(0, 18) + '…' : value}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Colaboradores */}
        <div className="glass-card chart-span-6">
          <h2 className="chart-title"><User size={18} color="#4facfe" /> TOP 10 COLABORADORES LAMSA</h2>
          <div style={{ height: '350px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.topColab} layout="vertical">
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" stroke="#9ca3af" fontSize={9} width={130} axisLine={false} tickLine={false} />
                <Tooltip formatter={(value) => [formatCurrency(value), 'Total Gasto']} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                <Bar dataKey="value" fill="#4facfe" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Comparativo Anual */}
        <div className="glass-card chart-span-6">
          <h2 className="chart-title"><Activity size={18} color="#fbbf24" /> Comparativo Anual</h2>
          <div style={{ height: '350px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {comparisonData ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comparisonData}>
                  <XAxis dataKey="month" stroke="#6b7280" fontSize={10} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip formatter={(value) => formatCurrency(value)} contentStyle={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} itemStyle={{ fontWeight: 'bold' }} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                  <Legend />
                  <Bar dataKey="Anterior" fill="rgba(255,255,255,0.1)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Atual" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p style={{ color: '#6b7280', textAlign: 'center', fontSize: '0.9rem', padding: '0 20px' }}>
                Para exibir o comparativo anual, deixe os filtros vazios ou selecione exatamente 1 ano.
              </p>
            )}
          </div>
        </div>

        {/* Horários de Pico */}
        <div className="glass-card chart-span-8">
          <h2 className="chart-title"><Timer size={18} color="#f59e0b" /> Horários de Pico (clique para detalhes)</h2>
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.peakHoursData} onClick={(data) => { if (data?.activePayload?.[0]) setSelectedPeakHour(data.activePayload[0].payload); }} style={{ cursor: 'pointer' }}>
                <XAxis dataKey="hour" stroke="#6b7280" fontSize={10} axisLine={false} />
                <Tooltip cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                <Bar dataKey="count" name="Qtd Viagens" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Destinos Populares */}
        <div className="glass-card chart-span-4">
          <h2 className="chart-title"><Navigation size={18} color="#f43f5e" /> Destinos Populares</h2>
          <div className="custom-scroll" style={{ maxHeight: '300px' }}>
            {(stats?.topDestinations || []).map(([addr, count], i) => (
              <div key={addr} style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '0.6rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ fontSize: '0.7rem', color: '#6b7280' }}>#{i+1}</span>
                <span style={{ flex: 1, fontSize: '0.65rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={addr}>{addr}</span>
                <span style={{ fontSize: '0.7rem', fontWeight: 'bold' }}>{count}x</span>
              </div>
            ))}
          </div>
        </div>

        {/* Sub-Áreas CAAD (condicional) */}
        {isCAADFiltered && stats?.subAreasData?.length > 0 && (
          <div className="glass-card chart-span-12">
            <h2 className="chart-title"><Layers size={18} color="#a78bfa" /> Rateio de Sub-Áreas — Coordenação Administrativa (IR002CAAD0)</h2>
            <div style={{ height: '280px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.subAreasData} layout="vertical">
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" stroke="#9ca3af" fontSize={9} width={260} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(value) => [formatCurrency(value), 'Gasto']} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                  <Bar dataKey="value" fill="#a78bfa" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

      </div>

      {/* ─── Peak Hour Modal ────────────────────────────────────────────── */}
      {selectedPeakHour && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div className="glass-card" style={{ width: '90%', maxWidth: '500px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, color: 'var(--primary)' }}>Corridas às {selectedPeakHour.hour}</h3>
              <button onClick={() => setSelectedPeakHour(null)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}><XCircle size={24} /></button>
            </div>
            <div className="custom-scroll" style={{ overflowY: 'auto', flex: 1 }}>
              {(!selectedPeakHour.drivers || selectedPeakHour.drivers.length === 0) ? (
                <p style={{ color: '#6b7280', textAlign: 'center', padding: '2rem 0' }}>Nenhuma corrida registrada neste horário.</p>
              ) : (
                selectedPeakHour.drivers.map((drv, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.8rem', borderBottom: '1px solid rgba(255,255,255,0.05)', background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: '1rem' }}>{drv.name}</span>
                    <span style={{ fontWeight: 'bold', color: 'var(--primary)' }}>{drv.qtd}x</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(App);
