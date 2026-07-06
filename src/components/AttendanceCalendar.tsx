import React, { useState } from "react";
import { ChevronLeft, ChevronRight, CheckCircle, Clock, AlertTriangle, Calendar, Info, QrCode } from "lucide-react";
import { AttendanceRecord } from "../types";
import { motion, AnimatePresence } from "motion/react";

interface AttendanceCalendarProps {
  attendance: AttendanceRecord[];
}

export default function AttendanceCalendar({ attendance }: AttendanceCalendarProps) {
  // Use local time from context: 2026-07-01
  const [currentDate, setCurrentDate] = useState(new Date(2026, 6, 1)); // July 2026
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();

  // Helper to format date as YYYY-MM-DD
  const formatDateString = (day: number) => {
    const yyyy = year;
    const mm = String(month + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDate(null);
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDate(null);
  };

  // Generate blank spaces for the first week alignment
  const blanks = Array(firstDayIndex).fill(null);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const calendarCells = [...blanks, ...days];

  // Group attendance records by date
  const attendanceByDate: Record<string, AttendanceRecord> = {};
  attendance.forEach((rec) => {
    attendanceByDate[rec.date] = rec;
  });

  // Calculate consistency statistics
  const currentMonthRecords = attendance.filter((rec) => {
    const recDate = new Date(rec.date);
    return recDate.getFullYear() === year && recDate.getMonth() === month;
  });

  const workedCount = currentMonthRecords.filter((r) => r.status === "approved").length;
  const pendingCount = currentMonthRecords.filter((r) => r.status === "pending_approval").length;
  const missedCount = currentMonthRecords.filter((r) => r.status === "rejected").length;

  const selectedRecord = selectedDate ? attendanceByDate[selectedDate] : null;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs font-sans">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div>
          <h3 className="font-black text-xs text-slate-900 uppercase tracking-wider flex items-center">
            <Calendar className="w-4 h-4 mr-1.5 text-amber-500" />
            Attendance Consistency Calendar
          </h3>
          <p className="text-[10px] text-slate-500 mt-0.5">Visual record of shifts worked, pending, or missed</p>
        </div>

        {/* Month Navigator */}
        <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded border border-slate-200">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-1 hover:bg-white rounded transition-all text-slate-600 hover:text-slate-900 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-[11px] font-black uppercase text-slate-800 tracking-tight px-2 w-24 text-center">
            {monthNames[month]} {year}
          </span>
          <button
            type="button"
            onClick={handleNextMonth}
            className="p-1 hover:bg-white rounded transition-all text-slate-600 hover:text-slate-900 cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Monthly Metrics Roll */}
      <div className="grid grid-cols-3 gap-2 py-3 border-b border-slate-100">
        <div className="bg-emerald-50/50 border border-emerald-100 p-2 rounded text-center">
          <span className="text-[9px] font-bold text-emerald-800 uppercase block tracking-wider">Worked</span>
          <span className="text-sm font-black text-emerald-600">{workedCount} Days</span>
        </div>
        <div className="bg-amber-50/50 border border-amber-100 p-2 rounded text-center">
          <span className="text-[9px] font-bold text-amber-800 uppercase block tracking-wider">Pending</span>
          <span className="text-sm font-black text-amber-600">{pendingCount} Days</span>
        </div>
        <div className="bg-rose-50/50 border border-rose-100 p-2 rounded text-center">
          <span className="text-[9px] font-bold text-rose-800 uppercase block tracking-wider">Missed / Rejected</span>
          <span className="text-sm font-black text-rose-600">{missedCount} Days</span>
        </div>
      </div>

      {/* Weekday Labels */}
      <div className="grid grid-cols-7 gap-1 text-center py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-50">
        <span>Su</span>
        <span>Mo</span>
        <span>Tu</span>
        <span>We</span>
        <span>Th</span>
        <span>Fr</span>
        <span>Sa</span>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1.5 pt-2.5">
        {calendarCells.map((day, idx) => {
          if (day === null) {
            return <div key={`blank-${idx}`} className="aspect-square bg-slate-50/20 rounded-md" />;
          }

          const dateStr = formatDateString(day);
          const record = attendanceByDate[dateStr];
          const isSelected = selectedDate === dateStr;
          const isToday = dateStr === "2026-07-01"; // Constant context day

          let statusClass = "bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100";
          let dotColor = "";

          if (record) {
            if (record.status === "approved") {
              statusClass = "bg-emerald-500 text-white border-emerald-600 font-bold hover:bg-emerald-600";
              dotColor = "bg-emerald-200";
            } else if (record.status === "pending_approval") {
              statusClass = "bg-amber-500 text-slate-950 border-amber-600 font-bold hover:bg-amber-600";
              dotColor = "bg-amber-100";
            } else if (record.status === "rejected") {
              statusClass = "bg-red-500 text-white border-red-600 font-bold hover:bg-red-600";
              dotColor = "bg-red-200";
            }
          }

          return (
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
              key={`day-${day}`}
              type="button"
              onClick={() => setSelectedDate(dateStr)}
              className={`aspect-square rounded-lg flex flex-col items-center justify-center text-xs relative border transition-all cursor-pointer ${statusClass} ${
                isSelected ? "ring-2 ring-indigo-600 ring-offset-1 z-10" : ""
              } ${isToday ? "border-indigo-600 text-indigo-700" : ""}`}
            >
              <span className="relative z-10">{day}</span>
              {isToday && (
                <span className="absolute bottom-1 text-[8px] font-black tracking-tight leading-none uppercase text-indigo-800 scale-75">
                  Today
                </span>
              )}
              {record && !isToday && (
                <span className={`w-1.5 h-1.5 rounded-full absolute bottom-1.5 ${dotColor}`} />
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Selected Day Context details panel */}
      <AnimatePresence mode="wait">
        {selectedDate && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-4 p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                Selected: {new Date(selectedDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </span>
              <button
                type="button"
                onClick={() => setSelectedDate(null)}
                className="text-[9px] font-bold text-slate-400 hover:text-slate-600 uppercase tracking-tight"
              >
                Close
              </button>
            </div>

            {selectedRecord ? (
              <div className="space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-tight flex items-center flex-wrap gap-1.5">
                      {selectedRecord.jobTitle}
                      {selectedRecord.qrVerified && (
                        <span className="bg-amber-100 text-amber-800 text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded flex items-center border border-amber-200">
                          <QrCode className="w-2 h-2 mr-0.5 text-amber-600 shrink-0" /> QR
                        </span>
                      )}
                    </h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Shift: {selectedRecord.checkInTime} to {selectedRecord.checkOutTime || "Active"}
                    </p>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${
                      selectedRecord.status === "approved"
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                        : selectedRecord.status === "pending_approval"
                        ? "bg-amber-50 text-amber-800 border-amber-200"
                        : "bg-rose-50 text-rose-800 border-rose-200"
                    }`}
                  >
                    {selectedRecord.status === "approved" && "Worked / Paid"}
                    {selectedRecord.status === "pending_approval" && "Pending Approval"}
                    {selectedRecord.status === "rejected" && "Rejected / Missed"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 bg-white p-2 rounded border border-slate-100 text-[10px]">
                  <div>
                    <span className="text-slate-400 block font-semibold uppercase tracking-tight">Hours Logged</span>
                    <span className="text-xs font-black text-slate-800">
                      {selectedRecord.hoursWorked !== undefined ? `${selectedRecord.hoursWorked} hrs` : "N/A"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-semibold uppercase tracking-tight">Wage Credit</span>
                    <span className="text-xs font-black text-emerald-600">₹{selectedRecord.wageEarned}</span>
                  </div>
                </div>

                {selectedRecord.notes && (
                  <p className="text-[10px] text-slate-600 bg-white p-2 rounded border border-slate-100 italic">
                    "{selectedRecord.notes}"
                  </p>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-2 text-slate-500 py-1">
                <Info className="w-4 h-4 text-slate-400 shrink-0" />
                <p className="text-[11px]">No check-in shift was logged on this day.</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
