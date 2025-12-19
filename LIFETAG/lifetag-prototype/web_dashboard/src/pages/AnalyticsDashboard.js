import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  TrendingUp, 
  Package, 
  AlertTriangle, 
  DollarSign, 
  Users, 
  Activity,
  PieChart,
  BarChart3,
  ArrowLeft
} from 'lucide-react';

export default function AnalyticsDashboard() {
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState({
    total_medicines: 0,
    expiring_soon: 0,
    expired: 0,
    low_stock_items: 0,
    total_sales: 0,
    total_patients: 0,
    prescriptions_dispensed: 0,
    revenue: 0,
    top_medicines: [],
    monthly_sales: [],
    stock_value: 0
  });
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('month');

useEffect(() => {
  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:5000/api/analytics?range=${timeRange}`);
      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }

      const data = await response.json();

      // Optional debug log
      console.log("Fetched analytics:", data);

      setAnalytics(data);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  fetchAnalytics();
}, [timeRange]);


  const StatCard = ({ icon: Icon, title, value, subtitle, trend, color }) => (
    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-14 h-14 bg-gradient-to-br ${color} rounded-xl flex items-center justify-center shadow-md`}>
          <Icon className="w-7 h-7 text-white" strokeWidth={2.5} />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${
            trend > 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            <TrendingUp className={`w-4 h-4 ${trend < 0 ? 'rotate-180' : ''}`} strokeWidth={2.5} />
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <h3 className="text-gray-500 text-sm font-bold uppercase tracking-wide mb-2">{title}</h3>
      <p className="text-3xl font-bold text-gray-800 mb-1">{value}</p>
      {subtitle && <p className="text-sm text-gray-600 font-medium">{subtitle}</p>}
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-semibold">Loading Analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b-2 border-blue-500 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg">
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-1 11h-4v4h-4v-4H6v-4h4V6h4v4h4v4z"/>
                </svg>
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800 tracking-tight">LifeTag</h1>
              <p className="text-xs text-blue-600 font-semibold uppercase tracking-wide">Analytics Dashboard</p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        {/* Back Button */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors mb-8 group bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-200 hover:border-blue-300"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" strokeWidth={2} />
          <span className="font-medium">Back to Home</span>
        </button>

        {/* Page Header */}
        <div className="bg-white rounded-2xl shadow-lg border-l-4 border-blue-500 p-8 mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <BarChart3 className="w-8 h-8 text-white" strokeWidth={2.5} />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-gray-800">Analytics Dashboard</h2>
                <p className="text-gray-600 mt-1 font-medium">Real-time insights and performance metrics</p>
              </div>
            </div>
            
            {/* Time Range Selector */}
            <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
              {['week', 'month', 'year'].map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-4 py-2 rounded-lg font-bold text-sm uppercase transition-all ${
                    timeRange === range
                      ? 'bg-white text-blue-600 shadow-md'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            icon={Package}
            title="Total Medicines"
            value={analytics.total_medicines}
            subtitle="Active inventory items"
            trend={5.2}
            color="from-blue-500 to-indigo-600"
          />
          <StatCard
            icon={AlertTriangle}
            title="Expiring Soon"
            value={analytics.expiring_soon}
            subtitle={`${analytics.expired} already expired`}
            trend={-12.3}
            color="from-orange-500 to-red-600"
          />
          <StatCard
            icon={Users}
            title="Total Patients"
            value={analytics.total_patients}
            subtitle="Registered patients"
            trend={8.7}
            color="from-emerald-500 to-teal-600"
          />
          <StatCard
            icon={Activity}
            title="Prescriptions"
            value={analytics.prescriptions_dispensed}
            subtitle="Dispensed this month"
            trend={15.4}
            color="from-purple-500 to-pink-600"
          />
        </div>

        {/* Revenue & Sales Section */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          {/* Revenue Card */}
          <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-xl p-8 text-white">
            <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                  <DollarSign className="w-8 h-8" strokeWidth={2.5} />
                </div>
                <div>
                  <p className="text-green-100 text-sm font-bold uppercase tracking-wide">Total Revenue</p>
                  <h3 className="text-4xl font-bold">₹{(analytics.revenue / 1000).toFixed(1)}K</h3>
                </div>
              </div>
              <div className="text-right">
                <p className="text-green-100 text-xs font-semibold mb-1">This Month</p>
                <div className="flex items-center gap-1 text-white font-bold">
                  <TrendingUp className="w-5 h-5" strokeWidth={2.5} />
                  <span className="text-2xl">18.2%</span>
                </div>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-lg p-4">
              <div className="flex justify-between items-center">
                <span className="text-green-100 font-semibold">Stock Value</span>
                <span className="text-xl font-bold">₹{(analytics.stock_value / 1000).toFixed(0)}K</span>
              </div>
            </div>
          </div>

          {/* Sales Card */}
          <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b-2 border-gray-200">
              <PieChart className="w-6 h-6 text-blue-600" strokeWidth={2.5} />
              <h3 className="text-xl font-bold text-gray-800">Sales Overview</h3>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                <span className="text-gray-700 font-bold">Total Sales</span>
                <span className="text-2xl font-bold text-blue-600">{analytics.total_sales}</span>
              </div>
              
              <div className="flex justify-between items-center p-4 bg-purple-50 rounded-lg border-2 border-purple-200">
                <span className="text-gray-700 font-bold">Low Stock Items</span>
                <span className="text-2xl font-bold text-purple-600">{analytics.low_stock_items}</span>
              </div>
              
              <div className="flex justify-between items-center p-4 bg-amber-50 rounded-lg border-2 border-amber-200">
                <span className="text-gray-700 font-bold">Avg. Sale/Day</span>
                <span className="text-2xl font-bold text-amber-600">{Math.round(analytics.total_sales / 30)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Top Medicines & Monthly Trend */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Top Medicines */}
          <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b-2 border-gray-200">
              <TrendingUp className="w-6 h-6 text-emerald-600" strokeWidth={2.5} />
              <h3 className="text-xl font-bold text-gray-800">Top Selling Medicines</h3>
            </div>
            
            <div className="space-y-4">
              {analytics.top_medicines.map((med, idx) => (
                <div key={idx} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center text-white font-bold shadow-md">
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-gray-800">{med.name}</p>
                    <p className="text-sm text-gray-600 font-medium">{med.sales} units sold</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-emerald-600">₹{med.revenue.toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Monthly Sales Trend */}
          <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b-2 border-gray-200">
              <BarChart3 className="w-6 h-6 text-blue-600" strokeWidth={2.5} />
              <h3 className="text-xl font-bold text-gray-800">Monthly Sales Trend</h3>
            </div>
            
            <div className="space-y-3">
              {analytics.monthly_sales.map((data, idx) => {
                const maxSales = Math.max(...analytics.monthly_sales.map(m => m.sales));
                const percentage = (data.sales / maxSales) * 100;
                
                return (
                  <div key={idx} className="flex items-center gap-4">
                    <span className="text-sm font-bold text-gray-600 w-12">{data.month}</span>
                    <div className="flex-1 bg-gray-200 rounded-full h-8 relative overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full rounded-full transition-all duration-500 flex items-center justify-end pr-3"
                        style={{ width: `${percentage}%` }}
                      >
                        <span className="text-white font-bold text-sm">{data.sales}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Insights Box */}
        <div className="mt-8 bg-blue-50 border-l-4 border-blue-500 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <div className="bg-blue-100 p-2 rounded-lg flex-shrink-0">
              <Activity className="w-5 h-5 text-blue-700" strokeWidth={2.5} />
            </div>
            <div>
              <h4 className="font-bold text-blue-900 mb-2 uppercase tracking-wide text-sm">Analytics Insights</h4>
              <p className="text-sm text-blue-800 font-medium leading-relaxed">
                Your pharmacy is performing well with an 18.2% increase in revenue this month. 
                However, {analytics.low_stock_items} items are running low on stock and {analytics.expiring_soon} medicines 
                are expiring within 15 days. Consider restocking and rotating inventory to minimize waste.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}