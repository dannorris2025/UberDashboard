import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  TrendingUp, 
  MapPin, 
  DollarSign, 
  Car, 
  Calendar, 
  Clock, 
  User, 
  Activity,
  Award,
  Filter,
  RefreshCcw,
  BarChart3,
  ChevronRight,
  Target,
  PieChart as PieIcon,
  ShoppingBag,
  Upload,
  FileSpreadsheet,
  AlertCircle,
  Navigation,
  Timer,
  XCircle
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
  ComposedChart,
  Line
} from 'recharts';
import { 
  format, 
  parseISO, 
  getDay, 
  isValid
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import * as XLSX from 'xlsx';

const DAYS_OF_WEEK = [
  'Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'
];

const COLORS = ['#ffb400', '#ff8c00', '#f59e0b', '#d97706', '#b45309', '#78350f', '#fcd34d', '#fbbf24', '#f59e0b', '#d97706'];

// Formatter for Currency
const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

const MultiSelect = ({ label, options, selectedValues, onChange }) => {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => { if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggle = (val) => {
    if (selectedValues.includes(val)) onChange(selectedValues.filter(v => v !== val));
    else onChange([...selectedValues, val]);
  };

  const toggleAll = () => {
    if (selectedValues.length === 0 || selectedValues.length === options.length) onChange([]);
    else onChange(options.map(o => o.value));
  };

  return (
    <div className="filter-group" style={{ position: 'relative' }} ref={wrapperRef}>
      <label>{label}</label>
      <div 
        className="filter-select" 
        onClick={() => setOpen(!open)} 
        style={{ minHeight: '38px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', background: '#1a1e23', padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid rgba(255, 255, 255, 0.1)' }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '85%', fontSize: '0.85rem' }}>
          {selectedValues.length === 0 ? 'Todos' : selectedValues.length === 1 ? options.find(o => o.value === selectedValues[0])?.label : `${selectedValues.length} selecionado(s)`}
        </span>
        <ChevronRight size={14} style={{ transform: open ? 'rotate(90deg)' : 'rotate(0)' }} />
      </div>
      {open && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#1a1e23', border: '1px solid rgba(255,255,255,0.1)', zIndex: 10, maxHeight: '250px', overflowY: 'auto', borderRadius: '0.5rem', marginTop: '4px' }}>
          <div onClick={toggleAll} style={{ padding: '8px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center' }}>
            <input type="checkbox" checked={selectedValues.length === 0} readOnly style={{ marginRight: '8px' }} />
            <strong style={{ fontSize: '0.8rem' }}>Todos</strong>
          </div>
          {options.map(opt => (
            <div key={opt.value} onClick={() => toggle(opt.value)} style={{ padding: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              <input type="checkbox" checked={selectedValues.length > 0 && selectedValues.includes(opt.value)} readOnly style={{ marginRight: '8px' }} />
              <span style={{ fontSize: '0.8rem' }}>{opt.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const App = () => {
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dataSource, setDataSource] = useState('Monitor de Dados Uber');
  const fileInputRef = useRef(null);

  const [filters, setFilters] = useState({
    years: [],
    months: [],
    costCenters: [],
    daysOfWeek: []
  });

  const [selectedMonth, setSelectedMonth] = useState(null);
  const [selectedPeakHour, setSelectedPeakHour] = useState(null);

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
    fetchData();
  }, []);

  const normalizeData = (data) => {
    if (!Array.isArray(data)) return [];
    
    // Helper to fix Excel serial dates
    const excelDateToString = (val) => {
      if (typeof val === 'number') {
        const date = new Date(Math.round((val - 25569) * 86400 * 1000));
        return date.toISOString().split('T')[0];
      }
      if (typeof val === 'string' && val.includes('/')) {
        const parts = val.split('/');
        if (parts[0].length === 4) {
          return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
        } else {
          return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
      }
      return val || "";
    };

    return data.map(row => {
      let rawTime = row["HORA DA SOLICITAÇÃO2"] || row["HORA DA SOLICITAÇÃO"] || row["Hora"] || row["Time"] || row["hora"] || "";
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

      const dateRaw = row["REGISTRO DATA E HORA DA TRANSAÇÃO"] || row["DATA"] || row["DATA DA SOLICITAÇÃO"] || row.date || row.Date || row.data || row.Data || "";
      
      return {
        date: excelDateToString(dateRaw),
        driver: row["NOME COMPLETO"] || row.driver || row.Driver || row.motorista || row.Motorista || "Desconhecido",
        value: parseFloat(row["VALOR TOTAL"] || row.value || row.Value || row.valor || row.Valor || 0),
        km: parseFloat(row["DISTÂNCIA"] || row.km || row.KM || row.Km || row.distancia || row.Distancia || 0),
        service: row["SERVIÇO"] || row.service || row.Service || row.servico || row.Serviço || "Outros",
        costCenter: row["CENTRO DE CUSTO"] || row.costCenter || row.CostCenter || row.centro_custo || row.cost_center || row["Centro de Custo"] || row["Cost Center"] || "Geral",
        origin: row["ENDEREÇO DE PARTIDA"] || row.origin || row.Origin || row.origem || row.Origem || "N/A",
        destination: row["ENDEREÇO DE DESTINO"] || row.destination || row.Destination || row.destino || row.Destino || "N/A",
        hour: hourInt
      };
    });
  };

  const handleExcelUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws);
        setRawData(normalizeData(data));
        setDataSource(`Excel: ${file.name}`);
        setLoading(false);
        resetFilters();
      } catch (err) { setError("Erro no Excel"); setLoading(false); }
    };
    reader.readAsBinaryString(file);
  };

  const filterOptions = useMemo(() => {
    if (!rawData.length) return { years:[], costCenters:[], months: [] };
    const years = [...new Set(rawData.map(d => String(d.date).substring(0, 4)))]
      .filter(y => y.match(/^\d{4}$/))
      .sort();
    const costCenters = [...new Set(rawData.map(d => d.costCenter))].sort();
    const months = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];
    return { years, costCenters, months };
  }, [rawData]);

  const filteredData = useMemo(() => {
    return rawData.filter(item => {
      const dateStr = String(item.date);
      const parsedDate = parseISO(dateStr);
      let itemDayOfWeek = isValid(parsedDate) ? getDay(parsedDate) : -1;
      if (filters.years.length > 0 && !filters.years.includes(dateStr.substring(0, 4))) return false;
      if (filters.months.length > 0 && !filters.months.includes(dateStr.substring(5, 7))) return false;
      if (filters.costCenters.length > 0 && !filters.costCenters.includes(item.costCenter)) return false;
      if (filters.daysOfWeek.length > 0 && (itemDayOfWeek === -1 || !filters.daysOfWeek.includes(DAYS_OF_WEEK[itemDayOfWeek]))) return false;
      if (selectedMonth && dateStr.substring(0, 7) !== selectedMonth) return false;
      return true;
    });
  }, [rawData, filters, selectedMonth]);

  const stats = useMemo(() => {
    if (!filteredData.length) return null;
    let totalVal = 0, totalKm = 0;
    let drivers = {}, timeline = {}, costCentersMap = {};
    let originsSet = {}, destinationsSet = {};
    let peakHoursMap = Array(24).fill(0).map((_, i) => ({ hour: `${i}h`, count: 0, driversRaw: {} }));

    filteredData.forEach(item => {
      const val = parseFloat(item.value) || 0;
      const km = parseFloat(item.km) || 0;
      const dateStr = String(item.date);
      const monthKey = dateStr.substring(0, 7);
      const cc = item.costCenter || 'Geral';
      totalVal += val; totalKm += km;
      if (!timeline[monthKey]) timeline[monthKey] = { date: monthKey, value: 0 };
      timeline[monthKey].value += val;
      if (!drivers[item.driver]) drivers[item.driver] = { name: item.driver, value: 0 };
      drivers[item.driver].value += val;
      if (!costCentersMap[cc]) costCentersMap[cc] = { name: cc, value: 0 };
      costCentersMap[cc].value += val;
      if (item.origin) originsSet[item.origin] = (originsSet[item.origin] || 0) + 1;
      if (item.destination) destinationsSet[item.destination] = (destinationsSet[item.destination] || 0) + 1;
      if (item.hour !== null && item.hour >= 0 && item.hour < 24) {
        peakHoursMap[item.hour].count++;
        peakHoursMap[item.hour].driversRaw[item.driver] = (peakHoursMap[item.hour].driversRaw[item.driver] || 0) + 1;
      }
    });

    const peakHoursData = peakHoursMap.map(ph => ({
      hour: ph.hour,
      count: ph.count,
      drivers: Object.entries(ph.driversRaw).map(([name, qtd]) => ({name, qtd})).sort((a,b) => b.qtd - a.qtd)
    }));

    const ccSorted = Object.values(costCentersMap).sort((a,b) => b.value - a.value);
    
    const safeTimeline = Object.values(timeline)
      .sort((a,b) => a.date.localeCompare(b.date))
      .map(d => {
        try {
          const date = parseISO(d.date + '-01');
          if (!isValid(date)) return { ...d, label: 'Data Inválida' };
          return { ...d, label: format(date, 'MMM yy', { locale: ptBR }) };
        } catch (e) {
          return { ...d, label: 'Erro Data' };
        }
      })
      .filter(d => d.label && d.label !== 'Data Inválida' && d.label !== 'Erro Data');

    return {
      totalVal, totalKm,
      efficiency: totalVal / totalKm || 0,
      avgVal: totalVal / filteredData.length,
      timeline: safeTimeline,
      topColab: Object.values(drivers).sort((a,b) => b.value - a.value).slice(0, 10),
      topCC: ccSorted[0],
      costCenterRateio: ccSorted,
      topDestinations: Object.entries(destinationsSet).sort((a,b) => b[1] - a[1]).slice(0, 10),
      peakHoursData
    };
  }, [filteredData]);

  const comparisonData = useMemo(() => {
    let currY;
    if (filters.years.length === 1) {
      currY = filters.years[0];
    } else if (filters.years.length === 0 && filterOptions.years && filterOptions.years.length > 0) {
      currY = filterOptions.years[filterOptions.years.length - 1];
    } else {
      return null;
    }
    
    const prevY = (parseInt(currY) - 1).toString();
    const currM = {}, prevM = {};
    rawData.forEach(d => {
      const y = String(d.date).substring(0, 4);
      const m = String(d.date).substring(5, 7);

      if (filters.months.length > 0 && !filters.months.includes(m)) return;
      if (filters.costCenters.length > 0 && !filters.costCenters.includes(d.costCenter)) return;
      
      const parsedDate = parseISO(String(d.date));
      const itemDayOfWeek = isValid(parsedDate) ? getDay(parsedDate) : -1;
      if (filters.daysOfWeek.length > 0 && (itemDayOfWeek === -1 || !filters.daysOfWeek.includes(DAYS_OF_WEEK[itemDayOfWeek]))) return;
      
      if (selectedMonth && String(d.date).substring(0, 7) !== selectedMonth) return;

      if (y === currY) currM[m] = (currM[m] || 0) + parseFloat(d.value || 0);
      if (y === prevY) prevM[m] = (prevM[m] || 0) + parseFloat(d.value || 0);
    });
    return filterOptions.months.map(m => ({
      month: format(parseISO(`2020-${m}-01`), 'MMM', { locale: ptBR }),
      Atual: currM[m] || 0,
      Anterior: prevM[m] || 0
    }));
  }, [rawData, filters, filterOptions, selectedMonth]);

  const resetFilters = () => {
    setFilters({ years: [], months: [], costCenters: [], daysOfWeek: [] });
    setSelectedMonth(null);
  };

  if (loading) return <div className="loader-box">Sincronizando...</div>;
  if (error) return <div className="error-box">{error}</div>;

  return (
    <div className="dashboard-container">
      <header className="header">
        <div className="title-section" style={{zIndex:2}}>
          <img src="/logo.png" alt="LAMSA" className="lamsa-logo" />
          <h1>DASHBOARD VIAGENS UBER</h1>
          <p>Portal de Mobilidade Corporativa - LAMSA</p>
        </div>
        <div className="header-actions" style={{zIndex:2}}>
          <button className="glass-card btn-excel" onClick={() => fileInputRef.current.click()}>🛠️ Carregar Excel</button>
          <input type="file" ref={fileInputRef} onChange={handleExcelUpload} style={{display: 'none'}} />
          <button className="btn-clear" onClick={resetFilters}><RefreshCcw size={16}/> Limpar Filtros</button>
        </div>
      </header>

      <div className="filters-bar">
        <MultiSelect 
          label="ANO" 
          options={(filterOptions.years || []).map(y => ({label: y, value: y}))} 
          selectedValues={filters.years} 
          onChange={val => setFilters({...filters, years: val})} 
        />
        <MultiSelect 
          label="MÊS" 
          options={(filterOptions.months || []).map(m => ({label: format(parseISO(`2020-${m}-01`), 'MMMM', {locale: ptBR}), value: m}))} 
          selectedValues={filters.months} 
          onChange={val => setFilters({...filters, months: val})} 
        />
        <MultiSelect 
          label="CENTRO DE CUSTO" 
          options={(filterOptions.costCenters || []).map(c => ({label: c, value: c}))} 
          selectedValues={filters.costCenters} 
          onChange={val => setFilters({...filters, costCenters: val})} 
        />
        <MultiSelect 
          label="DIA DA SEMANA" 
          options={DAYS_OF_WEEK.map(d => ({label: d, value: d}))} 
          selectedValues={filters.daysOfWeek} 
          onChange={val => setFilters({...filters, daysOfWeek: val})} 
        />
      </div>

      <div className="stats-grid">
        <div className="glass-card stat-card">
          <div className="stat-label">FATURAMENTO</div>
          <div className="stat-value">{formatCurrency(stats?.totalVal || 0)}</div>
          <div className="stat-sub">$ Total do Filtro</div>
        </div>
        <div className="glass-card stat-card">
          <div className="stat-label">KM RODADOS</div>
          <div className="stat-value">{(stats?.totalKm || 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} KM</div>
          <div className="stat-sub">🎯 Distância Total</div>
        </div>
        <div className="glass-card stat-card">
          <div className="stat-label">MAIOR GASTO: CC</div>
          <div className="stat-value" style={{color: 'var(--primary)', fontSize: '1.4rem'}}>{stats?.topCC?.name || '-'}</div>
          <div className="stat-sub">💼 {formatCurrency(stats?.topCC?.value || 0)}</div>
        </div>
        <div className="glass-card stat-card">
          <div className="stat-label" style={{background: 'rgba(255,255,255,0.1)', display: 'inline-block', padding: '2px 6px', borderRadius: '4px'}}>EFICIÊNCIA (R$/KM)</div>
          <div className="stat-value">{formatCurrency(stats?.efficiency || 0)}</div>
          <div className="stat-sub" style={{color: '#10b981'}}>📈 Performance</div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="glass-card chart-span-8">
          <h2 className="chart-title"><TrendingUp size={18} color="var(--primary)"/> Evolução & Sincronização (Clique no mês p/ filtrar)</h2>
          <div style={{height: '350px'}}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats?.timeline} onClick={(e) => e && e.activeLabel && setSelectedMonth(stats.timeline.find(d => d.label === e.activeLabel)?.date)}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="label" stroke="#6b7280" fontSize={11} axisLine={false} tickLine={false} />
                <YAxis stroke="#6b7280" fontSize={11} axisLine={false} tickLine={false} tickFormatter={v => `R$${v/1000}k`} />
                <Tooltip 
                  formatter={(value) => [formatCurrency(value), "Faturamento"]}
                  contentStyle={{background: '#111', border: 'none', borderRadius: '8px'}} 
                />
                <Area type="monotone" dataKey="value" stroke="var(--primary)" strokeWidth={3} fillOpacity={0.3} fill="var(--primary)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card chart-span-4">
          <h2 className="chart-title"><PieIcon size={18} color="#8b5cf6"/> RATEIO CENTROS DE CUSTO</h2>
          <div style={{height: '350px'}}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={stats?.costCenterRateio || []} dataKey="value" innerRadius={60} outerRadius={90}>
                  {(stats?.costCenterRateio || []).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{fontSize: '9px'}} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card chart-span-6">
          <h2 className="chart-title"><User size={18} color="#4facfe" /> TOP 10 COLABORADORES LAMSA</h2>
          <div style={{height: '350px'}}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.topColab} layout="vertical">
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" stroke="#9ca3af" fontSize={9} width={130} axisLine={false} tickLine={false} />
                <Tooltip 
                  formatter={(value) => [formatCurrency(value), "Total Gasto"]}
                  cursor={{fill: 'rgba(255,255,255,0.05)'}} 
                />
                <Bar dataKey="value" fill="#4facfe" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card chart-span-6">
          <h2 className="chart-title"><Activity size={18} color="#fbbf24" /> Comparativo Anual</h2>
          <div style={{height: '350px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
            {comparisonData ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comparisonData}>
                  <XAxis dataKey="month" stroke="#6b7280" fontSize={10} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip 
                    formatter={(value) => formatCurrency(value)} 
                    contentStyle={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                    itemStyle={{ fontWeight: 'bold' }}
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  />
                  <Legend />
                  <Bar dataKey="Anterior" fill="rgba(255,255,255,0.1)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Atual" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p style={{color: '#6b7280', textAlign: 'center', fontSize: '0.9rem', padding: '0 20px'}}>
                Para exibir o comparativo anual, deixe os filtros vazios (padrão) ou selecione exatemente 1 ano.
              </p>
            )}
          </div>
        </div>

        <div className="glass-card chart-span-8">
          <h2 className="chart-title"><Timer size={18} color="#f59e0b" /> Horários de Pico (Distribuição)</h2>
          <div style={{height: '300px'}}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.peakHoursData} onClick={(data) => {
                if (data && data.activePayload && data.activePayload[0]) {
                  setSelectedPeakHour(data.activePayload[0].payload);
                }
              }} style={{cursor: 'pointer'}}>
                <XAxis dataKey="hour" stroke="#6b7280" fontSize={10} axisLine={false} />
                <Tooltip cursor={{fill: 'rgba(255,255,255,0.02)'}} />
                <Bar dataKey="count" name="Qtd Viagens" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card chart-span-4">
          <h2 className="chart-title"><Navigation size={18} color="#f43f5e" /> Destinos Populares</h2>
          <div className="custom-scroll" style={{maxHeight: '300px'}}>
            {(stats?.topDestinations || []).map(([addr, count], i) => (
              <div key={addr} style={{display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '0.6rem', borderBottom: '1px solid rgba(255,255,255,0.05)'}}>
                <span style={{fontSize: '0.7rem', color: '#6b7280'}}>#{i+1}</span>
                <span style={{flex: 1, fontSize: '0.65rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}} title={addr}>{addr}</span>
                <span style={{fontSize: '0.7rem', fontWeight: 'bold'}}>{count}x</span>
              </div>
            ))}
          </div>
        </div>
      </div>

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
                    <span style={{flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: '1rem'}}>{drv.name}</span>
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
