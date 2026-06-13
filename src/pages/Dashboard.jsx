// src/pages/Dashboard.jsx
import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { fetchMarts, selectAllMarts, selectMartsLoading } from '../store/slices/martSlice'
import StatCard from '../components/StatCard'
import PageHeader from '../components/PageHeader'
import Badge from '../components/Badge'
import MartSelector from '../components/MartSelector'
import useAuth from '../hooks/useAuth'
import useMart from '../hooks/useMart'
import api from '../api/index'

export default function Dashboard() {
  const dispatch = useDispatch()
  const marts = useSelector(selectAllMarts)
  const martsLoading = useSelector(selectMartsLoading)
  const { isSuperAdmin } = useAuth()
  const { activeMartId, selectorProps } = useMart()

  // Date Range state
  const [dateRange, setDateRange] = useState({
    from: getPastDateString(30),
    to: new Date().toISOString().split('T')[0]
  })
  const [activeTab, setActiveTab] = useState('sales') // 'sales' | 'logistics'
  
  // Analytics states
  const [salesSummary, setSalesSummary] = useState(null)
  const [martsLeaderboard, setMartsLeaderboard] = useState([])
  const [categoriesShare, setCategoriesShare] = useState([])
  const [paymentSplits, setPaymentSplits] = useState([])
  const [salesTrends, setSalesTrends] = useState([])
  const [warehouseSummary, setWarehouseSummary] = useState(null)
  const [warehousesLeaderboard, setWarehousesLeaderboard] = useState([])
  const [loading, setLoading] = useState(false)

  // Helper: get past date string (YYYY-MM-DD)
  function getPastDateString(daysAgo) {
    const d = new Date()
    d.setDate(d.getDate() - daysAgo)
    return d.toISOString().split('T')[0]
  }

  // Load marts list
  useEffect(() => { dispatch(fetchMarts()) }, [dispatch])

  // Fetch Global or Mart-Specific Analytics
  useEffect(() => {
    const fetchAnalyticsData = async () => {
      setLoading(true)
      try {
        const queryStr = `fromDate=${dateRange.from}&toDate=${dateRange.to}${activeMartId ? `&martId=${activeMartId}` : ''}`
        
        // Parallelized fetches for charts and aggregates
        const [summaryRes, categoriesRes, splitsRes, trendsRes] = await Promise.all([
          api.get(`/reports/global/summary?${queryStr}`),
          api.get(`/reports/global/categories-share?${queryStr}`),
          api.get(`/reports/global/payment-splits?${queryStr}`),
          api.get(`/reports/global/trends?${queryStr}&groupBy=day`)
        ])

        if (summaryRes.success) setSalesSummary(summaryRes.data.summary)
        if (categoriesRes.success) setCategoriesShare(categoriesRes.data.categories_share)
        if (splitsRes.success) setPaymentSplits(splitsRes.data.payment_splits)
        if (trendsRes.success) setSalesTrends(trendsRes.data.trends)

        // Only load global multi-mart comparisons and warehouse logs when viewing all marts (no specific mart selected)
        if (!activeMartId) {
          const [leaderboardRes, whSummaryRes, whLeaderboardRes] = await Promise.all([
            api.get(`/reports/global/marts-leaderboard?fromDate=${dateRange.from}&toDate=${dateRange.to}`),
            api.get(`/reports/global/warehouse-summary?fromDate=${dateRange.from}&toDate=${dateRange.to}`),
            api.get(`/reports/global/warehouses-leaderboard?fromDate=${dateRange.from}&toDate=${dateRange.to}`)
          ])

          if (leaderboardRes.success) setMartsLeaderboard(leaderboardRes.data.leaderboard)
          if (whSummaryRes.success) setWarehouseSummary(whSummaryRes.data.summary)
          if (whLeaderboardRes.success) setWarehousesLeaderboard(whLeaderboardRes.data.leaderboard)
        }
      } catch (err) {
        console.error('Failed to load global/mart dashboard data:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchAnalyticsData()
  }, [activeMartId, dateRange])

  const handlePresetChange = (days) => {
    setDateRange({
      from: getPastDateString(days),
      to: new Date().toISOString().split('T')[0]
    })
  }

  // --- RENDER DUAL-MODE SUPER ADMIN SCREEN ---
  const topCategoryValue = categoriesShare.length > 0 ? categoriesShare[0].total_revenue : 1
  const maxTrendRevenue = salesTrends.length > 0 ? Math.max(...salesTrends.map(t => t.total_revenue)) : 1

  // Payment method circular values
  const cashPayment = paymentSplits.find(p => p.payment_method === 'cash')?.total_revenue || 0
  const onlinePayment = paymentSplits.find(p => p.payment_method === 'online')?.total_revenue || 0
  const totalPayment = cashPayment + onlinePayment || 1

  const radius = 45
  const stroke = 8
  const normalizedRadius = radius - stroke * 2
  const circumference = normalizedRadius * 2 * Math.PI
  const onlinePercent = Math.round((onlinePayment / totalPayment) * 100)
  const strokeDashoffset = circumference - (onlinePercent / 100) * circumference

  return (
    <div className="space-y-6">
      {/* Header and Mart Selector Context */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm transition-all duration-300">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900">
            {activeMartId ? 'Mart Performance Overview' : 'Global Commands Dashboard'}
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            {activeMartId ? 'Analytics and dispatches filtered to your selected store.' : 'Consolidated stats for all retail marts, warehouse operations, and total revenue.'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <MartSelector {...selectorProps} />
        </div>
      </div>

      {/* Date Pickers and Presets Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-gray-50 border border-gray-150 p-4 rounded-xl">
        <div className="flex bg-gray-200/60 p-0.5 rounded-lg">
          <button onClick={() => handlePresetChange(7)} className="px-3 py-1.5 text-[10px] font-bold text-gray-600 hover:text-gray-900 rounded-md focus:outline-none focus:bg-white focus:shadow-sm transition-all">7 Days</button>
          <button onClick={() => handlePresetChange(30)} className="px-3 py-1.5 text-[10px] font-bold text-gray-600 hover:text-gray-900 rounded-md focus:outline-none focus:bg-white focus:shadow-sm transition-all">30 Days</button>
          <button onClick={() => handlePresetChange(90)} className="px-3 py-1.5 text-[10px] font-bold text-gray-600 hover:text-gray-900 rounded-md focus:outline-none focus:bg-white focus:shadow-sm transition-all">90 Days</button>
        </div>
        <div className="flex items-center gap-2">
          <input 
            type="date" 
            className="input py-1 text-xs focus:ring-primary-500" 
            value={dateRange.from} 
            onChange={e => setDateRange(prev => ({ ...prev, from: e.target.value }))}
          />
          <span className="text-gray-400 text-xs font-bold">to</span>
          <input 
            type="date" 
            className="input py-1 text-xs focus:ring-primary-500" 
            value={dateRange.to} 
            onChange={e => setDateRange(prev => ({ ...prev, to: e.target.value }))}
          />
        </div>
      </div>

      {/* Only show warehouse logistics tab if we are in global overview mode */}
      {!activeMartId && (
        <div className="flex gap-2 border-b border-gray-100 pb-px">
          <button 
            onClick={() => setActiveTab('sales')}
            className={`px-5 py-3 font-bold text-sm border-b-2 transition-all ${
              activeTab === 'sales' 
                ? 'border-primary-500 text-primary-600' 
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            🏬 Retail Mart Sales
          </button>
          <button 
            onClick={() => setActiveTab('logistics')}
            className={`px-5 py-3 font-bold text-sm border-b-2 transition-all ${
              activeTab === 'logistics' 
                ? 'border-primary-500 text-primary-600' 
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            🏢 Warehouse Logistics
          </button>
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm animate-pulse">
          <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-gray-400 font-bold mt-4 font-mono">Aggregating transactional registers...</p>
        </div>
      )}

      {!loading && (activeTab === 'sales' || activeMartId) && (
        <div className="space-y-6">
          {/* Sales KPI widgets */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label={activeMartId ? "Store Revenue" : "Total Sales Revenue"} value={`₹${(salesSummary?.total_revenue || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`} icon="💰" color="green" />
            <StatCard label="Total Orders" value={salesSummary?.total_orders || 0} icon="📦" color="blue" />
            <StatCard label="Avg Order Value" value={`₹${(salesSummary?.avg_order_value || 0).toFixed(2)}`} icon="📊" color="yellow" />
            <StatCard label="Unique Customers" value={salesSummary?.unique_customers || 0} icon="👤" color="indigo" />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Sales Trend Line Chart */}
            <div className="lg:col-span-2 card p-6 flex flex-col justify-between min-h-[340px]">
              <div className="flex justify-between items-center mb-4">
                <h3 className="card-title">Daily Sales Trend</h3>
                <span className="text-[10px] bg-primary-50 text-primary-600 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">RevenueTimeline</span>
              </div>

              {salesTrends.length > 0 ? (
                <div className="relative flex-1 flex flex-col justify-between">
                  <svg className="w-full h-44 overflow-visible" viewBox="0 0 500 200" preserveAspectRatio="none">
                    <line x1="0" y1="20" x2="500" y2="20" stroke="#f3f4f6" strokeWidth="1" />
                    <line x1="0" y1="90" x2="500" y2="90" stroke="#f3f4f6" strokeWidth="1" />
                    <line x1="0" y1="160" x2="500" y2="160" stroke="#f3f4f6" strokeWidth="1" />
                    
                    <defs>
                      <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2"/>
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0"/>
                      </linearGradient>
                    </defs>
                    
                    <path
                      d={`
                        M 0,180
                        ${salesTrends.map((t, idx) => {
                          const x = (idx / (salesTrends.length - 1)) * 500
                          const y = 180 - (t.total_revenue / maxTrendRevenue) * 140
                          return `L ${x},${y}`
                        }).join(' ')}
                        L 500,180 Z
                      `}
                      fill="url(#chartGrad)"
                    />

                    <path
                      d={salesTrends.map((t, idx) => {
                        const x = (idx / (salesTrends.length - 1)) * 500
                        const y = 180 - (t.total_revenue / maxTrendRevenue) * 140
                        return `${idx === 0 ? 'M' : 'L'} ${x},${y}`
                      }).join(' ')}
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    {salesTrends.map((t, idx) => {
                      const x = (idx / (salesTrends.length - 1)) * 500
                      const y = 180 - (t.total_revenue / maxTrendRevenue) * 140
                      return (
                        <circle
                          key={idx}
                          cx={x}
                          cy={y}
                          r="4"
                          fill="#ffffff"
                          stroke="#3b82f6"
                          strokeWidth="2.5"
                          className="cursor-pointer hover:r-6 hover:fill-blue-500 transition-all"
                          title={`Date: ${t.trend_date.split('T')[0]}\nRevenue: ₹${t.total_revenue}`}
                        />
                      )
                    })}
                  </svg>
                  
                  <div className="flex justify-between text-[10px] text-gray-400 font-bold px-1 mt-2">
                    <span>{salesTrends[0]?.trend_date.split('T')[0]}</span>
                    <span>{salesTrends[Math.floor(salesTrends.length / 2)]?.trend_date.split('T')[0]}</span>
                    <span>{salesTrends[salesTrends.length - 1]?.trend_date.split('T')[0]}</span>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-xs text-gray-400 italic">No sales trend data logs.</div>
              )}
            </div>

            {/* Payment Splits */}
            <div className="card p-6 flex flex-col justify-between min-h-[340px]">
              <h3 className="card-title mb-4">Payment Method Split</h3>
              
              {totalPayment > 1 ? (
                <div className="flex-1 flex flex-col items-center justify-center space-y-4">
                  <div className="relative w-28 h-28 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r={normalizedRadius} stroke="#f3f4f6" strokeWidth={stroke} fill="transparent" />
                      <circle
                        cx="50"
                        cy="50"
                        r={normalizedRadius}
                        stroke="#6366f1"
                        strokeWidth={stroke}
                        fill="transparent"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute text-center">
                      <p className="text-xl font-extrabold text-gray-900 leading-none">{onlinePercent}%</p>
                      <p className="text-[9px] text-gray-400 font-bold mt-1 uppercase tracking-widest">Online</p>
                    </div>
                  </div>

                  <div className="w-full grid grid-cols-2 gap-4 text-xs">
                    <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-2.5 text-center">
                      <span className="inline-block w-2.5 h-2.5 bg-indigo-500 rounded-full mr-1"></span>
                      <span className="font-bold text-indigo-800">Online</span>
                      <p className="font-semibold text-gray-900 mt-1">₹{onlinePayment.toLocaleString('en-IN')}</p>
                    </div>
                    <div className="bg-gray-50 border border-gray-100 rounded-xl p-2.5 text-center">
                      <span className="inline-block w-2.5 h-2.5 bg-gray-400 rounded-full mr-1"></span>
                      <span className="font-bold text-gray-600">Cash/COD</span>
                      <p className="font-semibold text-gray-900 mt-1">₹{cashPayment.toLocaleString('en-IN')}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-xs text-gray-400 italic">No payments logged.</div>
              )}
            </div>
          </div>

          {/* Details Row: Leaderboards & Category Share */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Category Sales contribution */}
            <div className="card p-6 flex flex-col justify-between">
              <h3 className="card-title mb-4">Category contribution</h3>
              
              {categoriesShare.length > 0 ? (
                <div className="space-y-4 flex-1">
                  {categoriesShare.slice(0, 5).map(c => {
                    const pct = (c.total_revenue / topCategoryValue) * 100
                    return (
                      <div key={c.category_id} className="space-y-1">
                        <div className="flex justify-between text-xs font-semibold text-gray-700">
                          <span>{c.category_name}</span>
                          <span className="font-bold text-gray-900">₹{c.total_revenue.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                          <div 
                            className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full rounded-full transition-all duration-500" 
                            style={{ width: `${pct}%` }}
                          ></div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-xs text-gray-400 italic">No category share log.</div>
              )}
            </div>

            {/* Marts Leaderboard (only shown when viewing all marts) */}
            {!activeMartId && (
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">Marts Performance Leaderboard</h3>
                  <Badge variant="blue">{martsLeaderboard.length} Marts</Badge>
                </div>
                <div className="table-wrapper max-h-[300px] overflow-y-auto">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Mart</th>
                        <th>Orders</th>
                        <th>Cancelled</th>
                        <th>Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {martsLeaderboard.map((m, idx) => (
                        <tr key={m.mart_id}>
                          <td className="font-bold text-gray-800">
                            <span className="text-[10px] text-gray-400 mr-2">#{idx + 1}</span>
                            {m.mart_name}
                          </td>
                          <td>{m.total_orders}</td>
                          <td className="text-red-500 font-semibold">{m.cancelled_orders}</td>
                          <td className="font-semibold text-gray-900">₹{m.total_revenue.toLocaleString('en-IN')}</td>
                        </tr>
                      ))}
                      {martsLeaderboard.length === 0 && (
                        <tr>
                          <td colSpan="4" className="text-center py-6 text-gray-400 italic">No retail marts orders logged.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Logistics Tab (only shown globally) */}
      {!loading && activeTab === 'logistics' && !activeMartId && (
        <div className="space-y-6">
          {/* Warehouse KPI widgets */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="WH Inventory Asset Value" value={`₹${(warehouseSummary?.inventory?.total_inventory_value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`} icon="🏢" color="indigo" />
            <StatCard label="Total Outbound Transfers" value={warehouseSummary?.transfers?.total_transfers || 0} icon="🚚" color="blue" />
            <StatCard label="Dispatched Asset Value" value={`₹${(warehouseSummary?.transfers?.total_dispatched_value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`} icon="📦" color="green" />
            <StatCard label="Supplier Goods Receipts (GRN)" value={`₹${(warehouseSummary?.receipts?.total_receipts_value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`} icon="📥" color="yellow" />
          </div>

          {/* Warehouses performance grid */}
          <div className="grid grid-cols-1 gap-6">
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Warehouse Performance & Valuation</h3>
                <Badge variant="green">{warehousesLeaderboard.length} Warehouses</Badge>
              </div>
              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Warehouse</th>
                      <th>Transfers Dispatched</th>
                      <th>Dispatched Value</th>
                      <th>Active Stock Value</th>
                      <th>Damaged (Shrinkage)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {warehousesLeaderboard.map((w, idx) => (
                      <tr key={w.warehouse_id}>
                        <td className="font-bold text-gray-800">
                          <span className="text-[10px] text-gray-400 mr-2">#{idx + 1}</span>
                          {w.warehouse_name}
                        </td>
                        <td>{w.total_transfers}</td>
                        <td className="font-semibold text-gray-900">₹{w.total_dispatched_value.toLocaleString('en-IN')}</td>
                        <td className="font-semibold text-primary-600">₹{w.total_inventory_value.toLocaleString('en-IN')}</td>
                        <td className={`${w.total_damaged_qty > 0 ? 'text-red-500 font-bold' : 'text-gray-400 font-semibold'}`}>
                          {w.total_damaged_qty} pcs
                        </td>
                      </tr>
                    ))}
                    {warehousesLeaderboard.length === 0 && (
                      <tr>
                        <td colSpan="5" className="text-center py-6 text-gray-400 italic">No warehouse metrics logged.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}