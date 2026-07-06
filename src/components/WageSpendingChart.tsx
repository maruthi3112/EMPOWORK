import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { WagePayment } from "../types";
import { Coins, TrendingUp, HelpCircle, Activity } from "lucide-react";

interface WageSpendingChartProps {
  wagePayments: WagePayment[];
}

interface DataPoint {
  dateStr: string;
  displayDate: string;
  paidAmount: number;
  pendingAmount: number;
  totalAmount: number;
  paidCount: number;
  pendingCount: number;
}

export default function WageSpendingChart({ wagePayments }: WageSpendingChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 320 });
  const [hoveredBar, setHoveredBar] = useState<DataPoint | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [chartMode, setChartMode] = useState<"stacked" | "paid-only">("stacked");

  // 1. Setup responsive resize observer
  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width } = entry.contentRect;
        setDimensions({ width: Math.max(width, 250), height: 320 });
      }
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // 2. Process data for last 30 days (ending June 30, 2026 based on local time)
  const chartData = React.useMemo(() => {
    const dataPoints: DataPoint[] = [];
    const baseDate = new Date("2026-06-30");

    for (let i = 29; i >= 0; i--) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() - i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      const dateStr = `${yyyy}-${mm}-${dd}`;

      // Format as "Jun 15"
      const displayDate = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

      dataPoints.push({
        dateStr,
        displayDate,
        paidAmount: 0,
        pendingAmount: 0,
        totalAmount: 0,
        paidCount: 0,
        pendingCount: 0,
      });
    }

    // Populate data
    wagePayments.forEach((p) => {
      const dp = dataPoints.find((d) => d.dateStr === p.date);
      if (dp) {
        if (p.status === "paid") {
          dp.paidAmount += p.amount;
          dp.paidCount += 1;
        } else {
          dp.pendingAmount += p.amount;
          dp.pendingCount += 1;
        }
        dp.totalAmount = dp.paidAmount + dp.pendingAmount;
      }
    });

    return dataPoints;
  }, [wagePayments]);

  const stats = React.useMemo(() => {
    const totalPaid = chartData.reduce((sum, d) => sum + d.paidAmount, 0);
    const totalPending = chartData.reduce((sum, d) => sum + d.pendingAmount, 0);
    const maxDay = chartData.reduce((max, d) => (d.totalAmount > max.totalAmount ? d : max), chartData[0] || { totalAmount: 0, displayDate: "N/A" });
    return { totalPaid, totalPending, maxDay };
  }, [chartData]);

  // 3. Render D3 Chart inside svgRef
  useEffect(() => {
    if (!svgRef.current || chartData.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear previous drawing

    const margin = { top: 25, right: 20, bottom: 40, left: 55 };
    const width = dimensions.width - margin.left - margin.right;
    const height = dimensions.height - margin.top - margin.bottom;

    const chartGroup = svg
      .append("g")
      .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // X scale
    const x = d3.scaleBand()
      .domain(chartData.map((d) => d.displayDate))
      .range([0, width])
      .padding(0.25);

    // Y scale
    const maxVal = d3.max<DataPoint, number>(chartData, (d) => 
      chartMode === "stacked" ? d.totalAmount : d.paidAmount
    ) || 1000;
    
    const y = d3.scaleLinear()
      .domain([0, maxVal * 1.15]) // 15% extra headroom
      .nice()
      .range([height, 0]);

    // Grid lines (horizontal)
    chartGroup.append("g")
      .attr("class", "grid-lines text-slate-100")
      .call(
        d3.axisLeft(y)
          .tickSize(-width)
          .tickFormat(() => "")
      )
      .selectAll("line")
      .attr("stroke", "#f1f5f9")
      .attr("stroke-dasharray", "3,3");

    // X Axis
    const xAxis = d3.axisBottom(x)
      .tickValues(
        chartData
          .filter((_, idx) => idx % 4 === 0 || idx === chartData.length - 1) // Show fewer ticks
          .map((d) => d.displayDate)
      );

    chartGroup.append("g")
      .attr("transform", `translate(0, ${height})`)
      .call(xAxis)
      .call(g => g.select(".domain").attr("stroke", "#e2e8f0"))
      .selectAll("text")
      .attr("class", "text-[10px] font-mono text-slate-500 font-medium")
      .attr("dy", "1em");

    // Y Axis
    chartGroup.append("g")
      .call(d3.axisLeft(y).ticks(6).tickFormat((v) => `₹${v}`))
      .call(g => g.select(".domain").attr("stroke", "none"))
      .selectAll("text")
      .attr("class", "text-[10px] font-mono text-slate-500 font-bold");

    // Bars
    const barGroups = chartGroup.selectAll<SVGGElement, DataPoint>(".bar-group")
      .data(chartData)
      .enter()
      .append("g")
      .attr("class", "bar-group cursor-pointer");

    // Render Paid portion (base bar)
    barGroups.append("rect")
      .attr("x", (d: any) => x(d.displayDate) || 0)
      .attr("y", height) // start animated from bottom
      .attr("width", x.bandwidth())
      .attr("height", 0)
      .attr("fill", "url(#paid-gradient)")
      .attr("rx", 3)
      .transition()
      .duration(800)
      .attr("y", (d: any) => y(d.paidAmount))
      .attr("height", (d: any) => height - y(d.paidAmount));

    // Render Pending portion (stacked bar on top)
    if (chartMode === "stacked") {
      barGroups.append("rect")
        .attr("x", (d: any) => x(d.displayDate) || 0)
        .attr("y", (d: any) => y(d.paidAmount))
        .attr("width", x.bandwidth())
        .attr("height", 0)
        .attr("fill", "url(#pending-gradient)")
        .attr("rx", 3)
        .transition()
        .duration(800)
        .attr("y", (d: any) => y(d.totalAmount))
        .attr("height", (d: any) => y(d.paidAmount) - y(d.totalAmount));
    }

    // Highlight overlay for hover interactions
    barGroups.append("rect")
      .attr("x", (d: any) => (x(d.displayDate) || 0) - 2)
      .attr("y", 0)
      .attr("width", x.bandwidth() + 4)
      .attr("height", height)
      .attr("fill", "transparent")
      .on("mouseenter", (event, d) => {
        setHoveredBar(d);
        const [mx, my] = d3.pointer(event);
        setTooltipPos({ 
          x: mx + margin.left, 
          y: my + margin.top - 15 
        });
      })
      .on("mousemove", (event) => {
        const [mx, my] = d3.pointer(event);
        setTooltipPos({ 
          x: mx + margin.left, 
          y: my + margin.top - 15 
        });
      })
      .on("mouseleave", () => {
        setHoveredBar(null);
      });

  }, [chartData, dimensions, chartMode]);

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs flex flex-col space-y-4">
      
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-3">
        <div>
          <span className="text-[9px] font-black uppercase tracking-wider text-indigo-600 flex items-center gap-1">
            <Activity className="w-3 h-3 text-indigo-500 animate-pulse" />
            Cash Flow Analytics (D3-Powered)
          </span>
          <h3 className="font-black text-xs text-slate-900 uppercase tracking-tight mt-1 flex items-center">
            <Coins className="w-4 h-4 mr-1.5 text-slate-950" />
            Wage Distribution Over Last 30 Days
          </h3>
          <p className="text-[10px] text-slate-500 mt-0.5">
            Identify seasonal labor spend, pending clearances, and daily workforce allocations.
          </p>
        </div>

        {/* Legend & Toggle Controls */}
        <div className="flex items-center space-x-3 text-[10px] font-bold uppercase tracking-wider">
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded bg-emerald-600 block border border-emerald-700"></span>
            <span className="text-slate-600">Paid (₹)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded bg-amber-500 block border border-amber-600 border-dashed"></span>
            <span className="text-slate-600">Pending (₹)</span>
          </div>

          <div className="bg-slate-100 p-0.5 rounded border border-slate-200 flex space-x-1">
            <button
              onClick={() => setChartMode("stacked")}
              className={`px-2 py-1 text-[9px] font-black rounded uppercase transition ${
                chartMode === "stacked" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Stacked
            </button>
            <button
              onClick={() => setChartMode("paid-only")}
              className={`px-2 py-1 text-[9px] font-black rounded uppercase transition ${
                chartMode === "paid-only" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Paid Only
            </button>
          </div>
        </div>
      </div>

      {/* Mini Insights Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 border border-slate-200 rounded p-3 text-xs font-mono">
        <div className="space-y-0.5">
          <span className="text-[9px] text-slate-400 uppercase block font-bold">Total Disbursed (30d)</span>
          <span className="text-sm font-black text-emerald-700 uppercase">₹{stats.totalPaid.toLocaleString()}</span>
        </div>
        <div className="space-y-0.5">
          <span className="text-[9px] text-slate-400 uppercase block font-bold">Total Pending Sync</span>
          <span className="text-sm font-black text-amber-600 uppercase">₹{stats.totalPending.toLocaleString()}</span>
        </div>
        <div className="space-y-0.5">
          <span className="text-[9px] text-slate-400 uppercase block font-bold">Peak Spending Day</span>
          <span className="text-sm font-black text-slate-900 uppercase">
            {stats.maxDay.totalAmount > 0 ? (
              <>₹{stats.maxDay.totalAmount} <span className="text-[10px] text-slate-500 font-medium font-sans">({stats.maxDay.displayDate})</span></>
            ) : "No activity"}
          </span>
        </div>
      </div>

      {/* SVG Canvas wrapper with absolute tooltip support */}
      <div ref={containerRef} className="relative w-full overflow-hidden">
        <svg 
          ref={svgRef} 
          width={dimensions.width} 
          height={dimensions.height}
          className="overflow-visible select-none"
        >
          {/* SVG Gradients Definition */}
          <defs>
            {/* Elegant Emerald-Green Gradient for Paid portion */}
            <linearGradient id="paid-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#047857" />
            </linearGradient>

            {/* Amber Orange Striped Gradient for Pending portion */}
            <linearGradient id="pending-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#d97706" stopOpacity="0.85" />
            </linearGradient>
          </defs>
        </svg>

        {/* Custom React Interactive HTML Tooltip */}
        {hoveredBar && (
          <div
            className="absolute z-15 bg-slate-900 text-white rounded p-3 text-[10px] shadow-lg border border-slate-700 pointer-events-none transition-transform duration-75 space-y-1.5"
            style={{
              left: `${Math.min(tooltipPos.x, dimensions.width - 150)}px`,
              top: `${Math.max(tooltipPos.y - 100, 10)}px`,
              transform: "translate(-50%, -50%)",
            }}
          >
            <div className="font-bold border-b border-slate-800 pb-1 text-slate-300 font-mono">
              {hoveredBar.displayDate}, 2026
            </div>
            <div className="space-y-0.5 font-sans">
              <div className="flex justify-between gap-4">
                <span>Total spent:</span>
                <b className="text-white">₹{hoveredBar.totalAmount}</b>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-emerald-400">Paid amount:</span>
                <b className="text-emerald-400">₹{hoveredBar.paidAmount} ({hoveredBar.paidCount} txn)</b>
              </div>
              {chartMode === "stacked" && (
                <div className="flex justify-between gap-4">
                  <span className="text-amber-400">Pending sync:</span>
                  <b className="text-amber-400">₹{hoveredBar.pendingAmount} ({hoveredBar.pendingCount} txn)</b>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
