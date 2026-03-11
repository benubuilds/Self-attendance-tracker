import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  addDays,
  subDays,
  addWeeks,
  subWeeks,
  isWeekend
} from 'date-fns';
import { 
  ChevronLeft, 
  ChevronRight, 
  Download, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Plane,
  Coffee,
  Calendar as CalendarIcon,
  Moon,
  Sun,
  History,
  Bell,
  BarChart,
  PartyPopper
} from 'lucide-react';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';

type AttendanceStatus = 'present' | 'absent' | 'half-day' | 'leave' | 'week-off' | 'holiday';

interface DayData {
  status?: AttendanceStatus;
  note?: string;
  isReminder?: boolean;
}

interface AttendanceData {
  [dateString: string]: DayData;
}

const STATUS_COLORS = {
  present: '#22c55e', // green-500
  absent: '#ef4444', // red-500
  'half-day': '#f97316', // orange-500
  leave: '#3b82f6', // blue-500
  'week-off': '#a855f7', // purple-500
  holiday: '#14b8a6', // teal-500
};

const STATUS_LABELS = {
  present: 'Present',
  absent: 'Absent',
  'half-day': 'Half Day',
  leave: 'Leave',
  'week-off': 'Week Off',
  holiday: 'Holiday',
};

export default function App() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [attendance, setAttendance] = useState<AttendanceData>({});
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'calendar' | 'history' | 'statistics'>('calendar');
  const [calendarView, setCalendarView] = useState<'month' | 'week' | 'day'>('month');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [noteInput, setNoteInput] = useState('');
  const [isReminderInput, setIsReminderInput] = useState(false);

  const handleClick = (day: Date) => {
    setSelectedDate(day);
    setIsModalOpen(true);
  };

  // Load from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem('attendanceData');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const migrated: AttendanceData = {};
        for (const key in parsed) {
          if (typeof parsed[key] === 'string') {
            migrated[key] = { status: parsed[key] as AttendanceStatus };
          } else {
            migrated[key] = parsed[key];
          }
        }
        setAttendance(migrated);
      } catch (e) {
        console.error('Failed to parse attendance data', e);
      }
    }
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setIsDarkMode(true);
    } else if (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setIsDarkMode(true);
    }
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  // Save to local storage on change
  useEffect(() => {
    localStorage.setItem('attendanceData', JSON.stringify(attendance));
  }, [attendance]);

  const handleNext = () => {
    if (calendarView === 'month') setCurrentDate(addMonths(currentDate, 1));
    else if (calendarView === 'week') setCurrentDate(addWeeks(currentDate, 1));
    else setCurrentDate(addDays(currentDate, 1));
  };

  const handlePrev = () => {
    if (calendarView === 'month') setCurrentDate(subMonths(currentDate, 1));
    else if (calendarView === 'week') setCurrentDate(subWeeks(currentDate, 1));
    else setCurrentDate(subDays(currentDate, 1));
  };

  useEffect(() => {
    if (selectedDate) {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      setNoteInput(attendance[dateStr]?.note || '');
      setIsReminderInput(attendance[dateStr]?.isReminder || false);
    }
  }, [selectedDate, attendance]);

  const handleSaveNote = () => {
    if (!selectedDate) return;
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    setAttendance((prev) => ({
      ...prev,
      [dateStr]: { ...prev[dateStr], note: noteInput, isReminder: isReminderInput },
    }));
  };

  const markAttendance = (status: AttendanceStatus) => {
    if (!selectedDate) return;
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    setAttendance((prev) => ({
      ...prev,
      [dateStr]: { ...prev[dateStr], status },
    }));
    setIsModalOpen(false);
    setSelectedDate(null);
  };

  const resetAttendance = () => {
    if (!selectedDate) return;
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    setAttendance((prev) => {
      const newData = { ...prev };
      delete newData[dateStr];
      return newData;
    });
    setNoteInput('');
    setIsReminderInput(false);
    setIsModalOpen(false);
    setSelectedDate(null);
  };

  const exportCSV = () => {
    const rows = [
      ['Date', 'Status', 'Note'],
      ...Object.entries(attendance).map(([date, data]: [string, DayData]) => [
        date, 
        data.status ? STATUS_LABELS[data.status] : '',
        data.note ? `"${data.note.replace(/"/g, '""')}"` : ''
      ])
    ];
    const csvContent = "data:text/csv;charset=utf-8," 
      + rows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "attendance_tracker.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Calculate statistics for the current month
  const stats = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    
    let present = 0;
    let absent = 0;
    let halfDay = 0;
    let leave = 0;
    let weekOff = 0;
    let holiday = 0;
    let totalDays = 0;

    let day = monthStart;
    while (day <= monthEnd) {
      const dateStr = format(day, 'yyyy-MM-dd');
      const dayData = attendance[dateStr];
      const status = dayData?.status;
      
      if (status) {
        totalDays++;
        if (status === 'present') present++;
        if (status === 'absent') absent++;
        if (status === 'half-day') halfDay++;
        if (status === 'leave') leave++;
        if (status === 'week-off') weekOff++;
        if (status === 'holiday') holiday++;
      }
      day = addDays(day, 1);
    }

    // Calculate percentage (Present + Half Day * 0.5) / (Total Days - Week Off - Holiday)
    const workingDays = totalDays - weekOff - holiday;
    const percentage = workingDays > 0 
      ? Math.round(((present + halfDay * 0.5) / workingDays) * 100) 
      : 0;

    return { totalDays, present, absent, halfDay, leave, weekOff, holiday, percentage };
  }, [currentDate, attendance]);

  // Calculate history stats
  const historyStats = useMemo(() => {
    const grouped: { [month: string]: any } = {};
    
    Object.entries(attendance).forEach(([dateStr, dayData]: [string, DayData]) => {
      const status = dayData.status;
      if (!status) return; // Skip if no status
      
      const date = new Date(dateStr);
      const monthKey = format(date, 'yyyy-MM');
      
      if (!grouped[monthKey]) {
        grouped[monthKey] = {
          month: format(date, 'MMMM yyyy'),
          present: 0, absent: 0, halfDay: 0, leave: 0, weekOff: 0, holiday: 0, totalDays: 0
        };
      }
      
      grouped[monthKey].totalDays++;
      if (status === 'present') grouped[monthKey].present++;
      if (status === 'absent') grouped[monthKey].absent++;
      if (status === 'half-day') grouped[monthKey].halfDay++;
      if (status === 'leave') grouped[monthKey].leave++;
      if (status === 'week-off') grouped[monthKey].weekOff++;
      if (status === 'holiday') grouped[monthKey].holiday++;
    });

    return Object.values(grouped).sort((a, b) => b.month.localeCompare(a.month)).map(stat => {
      const workingDays = stat.totalDays - stat.weekOff - stat.holiday;
      stat.percentage = workingDays > 0 
        ? Math.round(((stat.present + stat.halfDay * 0.5) / workingDays) * 100) 
        : 0;
      return stat;
    });
  }, [attendance]);

  const upcomingEvents = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return Object.entries(attendance)
      .filter(([dateStr, data]: [string, DayData]) => {
        if (!data.note && !data.isReminder) return false;
        const date = new Date(dateStr);
        return date >= today;
      })
      .sort(([dateA], [dateB]) => new Date(dateA).getTime() - new Date(dateB).getTime())
      .slice(0, 5); // Show top 5 upcoming
  }, [attendance]);

  const chartData = useMemo(() => {
    return [
      { name: 'Present', value: stats.present, color: STATUS_COLORS.present },
      { name: 'Absent', value: stats.absent, color: STATUS_COLORS.absent },
      { name: 'Half Day', value: stats.halfDay, color: STATUS_COLORS['half-day'] },
      { name: 'Leave', value: stats.leave, color: STATUS_COLORS.leave },
      { name: 'Week Off', value: stats.weekOff, color: STATUS_COLORS['week-off'] },
      { name: 'Holiday', value: stats.holiday, color: STATUS_COLORS.holiday },
    ].filter(item => item.value > 0);
  }, [stats]);

  const renderHeader = () => {
    let dateLabel = '';
    if (calendarView === 'month') {
      dateLabel = format(currentDate, 'MMMM yyyy');
    } else if (calendarView === 'week') {
      const start = startOfWeek(currentDate);
      const end = endOfWeek(currentDate);
      dateLabel = `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`;
    } else {
      dateLabel = format(currentDate, 'MMMM d, yyyy');
    }

    return (
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <div className="flex items-center gap-4">
          <button onClick={handlePrev} className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-700">
            <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
          <h2 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-gray-100 min-w-[160px] text-center">
            {dateLabel}
          </h2>
          <button onClick={handleNext} className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-700">
            <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
        </div>
        <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
          <button onClick={() => setCalendarView('month')} className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${calendarView === 'month' ? 'bg-white dark:bg-gray-600 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'}`}>Month</button>
          <button onClick={() => setCalendarView('week')} className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${calendarView === 'week' ? 'bg-white dark:bg-gray-600 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'}`}>Week</button>
          <button onClick={() => setCalendarView('day')} className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${calendarView === 'day' ? 'bg-white dark:bg-gray-600 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'}`}>Day</button>
        </div>
      </div>
    );
  };

  const renderDays = () => {
    if (calendarView === 'day') return null;
    
    const days = [];
    const startDate = startOfWeek(currentDate);

    for (let i = 0; i < 7; i++) {
      days.push(
        <div key={i} className="text-center font-bold text-xs uppercase tracking-wider text-gray-400 dark:text-gray-500 py-3">
          {format(addDays(startDate, i), 'EEE')}
        </div>
      );
    }
    return <div className="grid grid-cols-7 gap-2 sm:gap-3 mb-2">{days}</div>;
  };

  const renderCells = () => {
    let startDate, endDate;
    
    if (calendarView === 'month') {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(monthStart);
      startDate = startOfWeek(monthStart);
      endDate = endOfWeek(monthEnd);
    } else if (calendarView === 'week') {
      startDate = startOfWeek(currentDate);
      endDate = endOfWeek(currentDate);
    } else {
      startDate = currentDate;
      endDate = currentDate;
    }

    const days = [];
    let day = startDate;
    let formattedDate = '';

    while (day <= endDate) {
      formattedDate = format(day, 'd');
      const cloneDay = day;
      const dateStr = format(day, 'yyyy-MM-dd');
      const dayData = attendance[dateStr];
      let status = dayData?.status;
      const hasNote = !!dayData?.note;
      
      const isCurrentMonth = isSameMonth(day, currentDate);
      const isToday = isSameDay(day, new Date());
      const isSelected = selectedDate && isSameDay(day, selectedDate);

      let bgColor = 'bg-transparent';
      let textColor = isCurrentMonth ? 'text-gray-800 dark:text-gray-200' : 'text-gray-400 dark:text-gray-500';
      
      if (status === 'present') { bgColor = 'bg-green-50 dark:bg-green-900/20'; }
      else if (status === 'absent') { bgColor = 'bg-red-50 dark:bg-red-900/20'; }
      else if (status === 'half-day') { bgColor = 'bg-orange-50 dark:bg-orange-900/20'; }
      else if (status === 'leave') { bgColor = 'bg-blue-50 dark:bg-blue-900/20'; }
      else if (status === 'week-off') { bgColor = 'bg-purple-50 dark:bg-purple-900/20'; }
      else if (status === 'holiday') { bgColor = 'bg-teal-50 dark:bg-teal-900/20'; }

      days.push(
        <div
          key={day.toString()}
          onClick={() => handleClick(cloneDay)}
          onContextMenu={(e) => e.preventDefault()}
          style={{ WebkitTouchCallout: 'none' }}
          className={`
            select-none relative flex flex-col items-center p-2 sm:p-3 rounded-2xl cursor-pointer transition-all
            ${calendarView === 'month' ? 'aspect-square sm:aspect-auto sm:min-h-[110px]' : 'min-h-[150px]'}
            ${!isCurrentMonth && calendarView === 'month' ? 'opacity-40' : ''}
            ${bgColor}
            ${isSelected ? 'ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-gray-900 z-10' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}
          `}
        >
          <div className={`flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full mb-1 sm:mb-2 ${isToday ? 'bg-indigo-600 text-white shadow-md' : 'bg-transparent ' + textColor}`}>
            <span className="text-sm sm:text-base font-bold leading-none">
              {formattedDate}
            </span>
          </div>
          
          {status && (
            <div className="mt-auto flex justify-center w-full">
              {status === 'present' && <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-green-500" />}
              {status === 'absent' && <XCircle className="w-5 h-5 sm:w-6 sm:h-6 text-red-500" />}
              {status === 'half-day' && <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-orange-500" />}
              {status === 'leave' && <Plane className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500" />}
              {status === 'week-off' && <Coffee className="w-5 h-5 sm:w-6 sm:h-6 text-purple-500" />}
              {status === 'holiday' && <PartyPopper className="w-5 h-5 sm:w-6 sm:h-6 text-teal-500" />}
            </div>
          )}
          {(hasNote || dayData?.isReminder) && (
            <div className="absolute top-2 right-2 sm:top-3 sm:right-3 flex gap-1">
              {dayData?.isReminder && <Bell className="w-3 h-3 text-indigo-500 drop-shadow-sm" />}
              {hasNote && !dayData?.isReminder && <div className="w-2 h-2 bg-indigo-500 rounded-full shadow-sm mt-0.5"></div>}
            </div>
          )}
        </div>
      );
      day = addDays(day, 1);
    }
    
    const gridCols = calendarView === 'day' ? 'grid-cols-1' : 'grid-cols-7';
    return <div className={`grid ${gridCols} gap-2 sm:gap-3`}>{days}</div>;
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 font-sans text-gray-900 dark:text-gray-100 transition-colors duration-200">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-20 transition-colors duration-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight hidden sm:block">Self Attendance Tracker</h1>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
              <button
                onClick={() => setActiveTab('calendar')}
                className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'calendar' ? 'bg-white dark:bg-gray-600 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'}`}
              >
                <CalendarIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Calendar</span>
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'history' ? 'bg-white dark:bg-gray-600 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'}`}
              >
                <History className="w-4 h-4" />
                <span className="hidden sm:inline">History</span>
              </button>
              <button
                onClick={() => setActiveTab('statistics')}
                className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'statistics' ? 'bg-white dark:bg-gray-600 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'}`}
              >
                <BarChart className="w-4 h-4" />
                <span className="hidden sm:inline">Statistics</span>
              </button>
            </div>

            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            <button 
              onClick={exportCSV}
              className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors bg-gray-100 dark:bg-gray-700 hover:bg-indigo-50 dark:hover:bg-gray-600 px-3 py-2 rounded-md"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="mb-8 text-center sm:text-left">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-2">
            Self Attendance Tracker
          </h1>
          <p className="text-gray-500 dark:text-gray-400 font-medium">
            A simple and clean tool to track your daily attendance, manage leaves, and keep notes.
          </p>
        </div>

        {activeTab === 'calendar' && (
          <>
            {/* Summary Dashboard */}
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-3 sm:gap-4 mb-8">
              <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center transition-transform hover:-translate-y-1">
                <span className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider mb-1">Total</span>
                <span className="text-xl sm:text-2xl font-black text-gray-800 dark:text-gray-100">{stats.totalDays}</span>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 p-3 sm:p-4 rounded-2xl shadow-sm border border-green-200 dark:border-green-800/50 flex flex-col items-center justify-center transition-transform hover:-translate-y-1">
                <span className="text-[10px] sm:text-xs text-green-600 dark:text-green-400 font-bold uppercase tracking-wider mb-1">Present</span>
                <span className="text-xl sm:text-2xl font-black text-green-700 dark:text-green-500">{stats.present}</span>
              </div>
              <div className="bg-red-50 dark:bg-red-900/20 p-3 sm:p-4 rounded-2xl shadow-sm border border-red-200 dark:border-red-800/50 flex flex-col items-center justify-center transition-transform hover:-translate-y-1">
                <span className="text-[10px] sm:text-xs text-red-600 dark:text-red-400 font-bold uppercase tracking-wider mb-1">Absent</span>
                <span className="text-xl sm:text-2xl font-black text-red-700 dark:text-red-500">{stats.absent}</span>
              </div>
              <div className="bg-orange-50 dark:bg-orange-900/20 p-3 sm:p-4 rounded-2xl shadow-sm border border-orange-200 dark:border-orange-800/50 flex flex-col items-center justify-center transition-transform hover:-translate-y-1">
                <span className="text-[10px] sm:text-xs text-orange-600 dark:text-orange-400 font-bold uppercase tracking-wider mb-1">Half Day</span>
                <span className="text-xl sm:text-2xl font-black text-orange-700 dark:text-orange-500">{stats.halfDay}</span>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 sm:p-4 rounded-2xl shadow-sm border border-blue-200 dark:border-blue-800/50 flex flex-col items-center justify-center transition-transform hover:-translate-y-1">
                <span className="text-[10px] sm:text-xs text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider mb-1">Leave</span>
                <span className="text-xl sm:text-2xl font-black text-blue-700 dark:text-blue-500">{stats.leave}</span>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/20 p-3 sm:p-4 rounded-2xl shadow-sm border border-purple-200 dark:border-purple-800/50 flex flex-col items-center justify-center transition-transform hover:-translate-y-1">
                <span className="text-[10px] sm:text-xs text-purple-600 dark:text-purple-400 font-bold uppercase tracking-wider mb-1">Week Off</span>
                <span className="text-xl sm:text-2xl font-black text-purple-700 dark:text-purple-500">{stats.weekOff}</span>
              </div>
              <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-3 sm:p-4 rounded-2xl shadow-md flex flex-col items-center justify-center text-white col-span-3 sm:col-span-4 lg:col-span-1 transition-transform hover:-translate-y-1">
                <span className="text-[10px] sm:text-xs text-indigo-100 font-bold uppercase tracking-wider mb-1">Attendance</span>
                <span className="text-2xl sm:text-3xl font-black">{stats.percentage}%</span>
              </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
              {/* Calendar Section */}
              <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 sm:p-6">
                {renderHeader()}
                {renderDays()}
                {renderCells()}
              </div>

              {/* Sidebar / Chart */}
              <div className="space-y-8">
                {/* Upcoming Events */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Bell className="w-5 h-5 text-indigo-500" />
                    <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">Reminders & Events</h3>
                  </div>
                  {upcomingEvents.length > 0 ? (
                    <div className="space-y-3">
                      {upcomingEvents.map(([dateStr, data]) => (
                        <div key={dateStr} className={`flex flex-col p-3 rounded-xl border ${data.isReminder ? 'bg-indigo-50 border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-800/50' : 'bg-gray-50 border-gray-100 dark:bg-gray-900/50 dark:border-gray-700/50'}`}>
                          <div className="flex items-center justify-between mb-1">
                            <span className={`text-xs font-bold ${data.isReminder ? 'text-indigo-700 dark:text-indigo-400' : 'text-indigo-600 dark:text-indigo-400'}`}>
                              {format(new Date(dateStr), 'MMM d, yyyy')}
                            </span>
                            {data.isReminder && <Bell className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />}
                          </div>
                          <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                            {data.note || 'Reminder'}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                      No upcoming reminders or events.
                    </div>
                  )}
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                  <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">Distribution</h3>
                  {chartData.length > 0 ? (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                            stroke="none"
                          >
                            {chartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <RechartsTooltip 
                            contentStyle={{ 
                              borderRadius: '8px', 
                              border: 'none', 
                              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                              backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                              color: isDarkMode ? '#f3f4f6' : '#111827'
                            }}
                          />
                          <Legend verticalAlign="bottom" height={36} wrapperStyle={{ color: isDarkMode ? '#d1d5db' : '#374151' }}/>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-64 flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm">
                      No attendance data for this month
                    </div>
                  )}
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                  <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">Legend</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full bg-green-500"></div>
                      <span className="text-gray-600 dark:text-gray-300 text-sm">Present (Full Day)</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full bg-red-500"></div>
                      <span className="text-gray-600 dark:text-gray-300 text-sm">Absent</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full bg-orange-500"></div>
                      <span className="text-gray-600 dark:text-gray-300 text-sm">Half Day</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                      <span className="text-gray-600 dark:text-gray-300 text-sm">Leave (Approved)</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full bg-purple-500"></div>
                      <span className="text-gray-600 dark:text-gray-300 text-sm">Week Off</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
        
        {activeTab === 'history' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Attendance History</h2>
            {historyStats.length > 0 ? (
              <div className="grid gap-6">
                {historyStats.map((stat, idx) => (
                  <div key={idx} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                      <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">{stat.month}</h3>
                      <div className="bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 px-4 py-2 rounded-lg font-bold">
                        {stat.percentage}% Attendance
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
                      <div className="flex flex-col">
                        <span className="text-sm text-gray-500 dark:text-gray-400">Total</span>
                        <span className="text-lg font-semibold dark:text-gray-200">{stat.totalDays}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm text-green-600 dark:text-green-400">Present</span>
                        <span className="text-lg font-semibold dark:text-gray-200">{stat.present}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm text-red-600 dark:text-red-400">Absent</span>
                        <span className="text-lg font-semibold dark:text-gray-200">{stat.absent}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm text-orange-600 dark:text-orange-400">Half Day</span>
                        <span className="text-lg font-semibold dark:text-gray-200">{stat.halfDay}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm text-blue-600 dark:text-blue-400">Leave</span>
                        <span className="text-lg font-semibold dark:text-gray-200">{stat.leave}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm text-purple-600 dark:text-purple-400">Week Off</span>
                        <span className="text-lg font-semibold dark:text-gray-200">{stat.weekOff}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm text-teal-600 dark:text-teal-400">Holiday</span>
                        <span className="text-lg font-semibold dark:text-gray-200">{stat.holiday}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-12 text-center">
                <History className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">No history yet</h3>
                <p className="text-gray-500 dark:text-gray-400 mt-2">Start marking your attendance to see your history here.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'statistics' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Attendance Statistics</h2>
            {historyStats.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                  <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">Overall Attendance Breakdown</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Present', value: historyStats.reduce((acc, curr) => acc + curr.present, 0), color: STATUS_COLORS.present },
                            { name: 'Absent', value: historyStats.reduce((acc, curr) => acc + curr.absent, 0), color: STATUS_COLORS.absent },
                            { name: 'Half Day', value: historyStats.reduce((acc, curr) => acc + curr.halfDay, 0), color: STATUS_COLORS['half-day'] },
                            { name: 'Leave', value: historyStats.reduce((acc, curr) => acc + curr.leave, 0), color: STATUS_COLORS.leave },
                            { name: 'Week Off', value: historyStats.reduce((acc, curr) => acc + curr.weekOff, 0), color: STATUS_COLORS['week-off'] },
                            { name: 'Holiday', value: historyStats.reduce((acc, curr) => acc + curr.holiday, 0), color: STATUS_COLORS.holiday },
                          ].filter(item => item.value > 0)}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {
                            [
                              { name: 'Present', value: historyStats.reduce((acc, curr) => acc + curr.present, 0), color: STATUS_COLORS.present },
                              { name: 'Absent', value: historyStats.reduce((acc, curr) => acc + curr.absent, 0), color: STATUS_COLORS.absent },
                              { name: 'Half Day', value: historyStats.reduce((acc, curr) => acc + curr.halfDay, 0), color: STATUS_COLORS['half-day'] },
                              { name: 'Leave', value: historyStats.reduce((acc, curr) => acc + curr.leave, 0), color: STATUS_COLORS.leave },
                              { name: 'Week Off', value: historyStats.reduce((acc, curr) => acc + curr.weekOff, 0), color: STATUS_COLORS['week-off'] },
                              { name: 'Holiday', value: historyStats.reduce((acc, curr) => acc + curr.holiday, 0), color: STATUS_COLORS.holiday },
                            ].filter(item => item.value > 0).map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))
                          }
                        </Pie>
                        <RechartsTooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                  <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">Monthly Attendance Trends</h3>
                  <div className="space-y-4">
                    {historyStats.map((stat, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-300 w-24">{stat.month}</span>
                        <div className="flex-1 mx-4 h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden flex">
                          {stat.totalDays > 0 && (
                            <>
                              <div style={{ width: `${(stat.present / stat.totalDays) * 100}%` }} className="bg-green-500 h-full" title={`Present: ${stat.present}`}></div>
                              <div style={{ width: `${(stat.halfDay / stat.totalDays) * 100}%` }} className="bg-orange-500 h-full" title={`Half Day: ${stat.halfDay}`}></div>
                              <div style={{ width: `${(stat.leave / stat.totalDays) * 100}%` }} className="bg-blue-500 h-full" title={`Leave: ${stat.leave}`}></div>
                              <div style={{ width: `${(stat.absent / stat.totalDays) * 100}%` }} className="bg-red-500 h-full" title={`Absent: ${stat.absent}`}></div>
                              <div style={{ width: `${(stat.weekOff / stat.totalDays) * 100}%` }} className="bg-purple-500 h-full" title={`Week Off: ${stat.weekOff}`}></div>
                              <div style={{ width: `${(stat.holiday / stat.totalDays) * 100}%` }} className="bg-teal-500 h-full" title={`Holiday: ${stat.holiday}`}></div>
                            </>
                          )}
                        </div>
                        <span className="text-sm font-bold text-gray-800 dark:text-gray-100 w-12 text-right">{stat.percentage}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-12 text-center">
                <BarChart className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">No data available</h3>
                <p className="text-gray-500 dark:text-gray-400 mt-2">Start marking your attendance to see statistics here.</p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Action Modal */}
      {isModalOpen && selectedDate && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200 border border-gray-100 dark:border-gray-700">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
              <h3 className="font-bold text-gray-800 dark:text-gray-100">
                {format(selectedDate, 'EEEE, MMMM d, yyyy')}
              </h3>
              <button 
                onClick={() => {
                  setIsModalOpen(false);
                  setSelectedDate(null);
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 transition-colors"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-5 space-y-6">
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Status</label>
                <div className="grid grid-cols-3 gap-3">
                  <button 
                    onClick={() => markAttendance('present')}
                    className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all ${attendance[format(selectedDate, 'yyyy-MM-dd')]?.status === 'present' ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' : 'border-gray-100 dark:border-gray-700 hover:border-green-200 dark:hover:border-green-800 text-gray-600 dark:text-gray-300 hover:text-green-600'}`}
                  >
                    <CheckCircle2 className="w-6 h-6" />
                    <span className="font-bold text-xs">Present</span>
                  </button>
                  
                  <button 
                    onClick={() => markAttendance('absent')}
                    className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all ${attendance[format(selectedDate, 'yyyy-MM-dd')]?.status === 'absent' ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400' : 'border-gray-100 dark:border-gray-700 hover:border-red-200 dark:hover:border-red-800 text-gray-600 dark:text-gray-300 hover:text-red-600'}`}
                  >
                    <XCircle className="w-6 h-6" />
                    <span className="font-bold text-xs">Absent</span>
                  </button>
                  
                  <button 
                    onClick={() => markAttendance('half-day')}
                    className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all ${attendance[format(selectedDate, 'yyyy-MM-dd')]?.status === 'half-day' ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400' : 'border-gray-100 dark:border-gray-700 hover:border-orange-200 dark:hover:border-orange-800 text-gray-600 dark:text-gray-300 hover:text-orange-600'}`}
                  >
                    <Clock className="w-6 h-6" />
                    <span className="font-bold text-xs">Half Day</span>
                  </button>
                  
                  <button 
                    onClick={() => markAttendance('leave')}
                    className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all ${attendance[format(selectedDate, 'yyyy-MM-dd')]?.status === 'leave' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400' : 'border-gray-100 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-800 text-gray-600 dark:text-gray-300 hover:text-blue-600'}`}
                  >
                    <Plane className="w-6 h-6" />
                    <span className="font-bold text-xs">Leave</span>
                  </button>

                  <button 
                    onClick={() => markAttendance('week-off')}
                    className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all ${attendance[format(selectedDate, 'yyyy-MM-dd')]?.status === 'week-off' ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400' : 'border-gray-100 dark:border-gray-700 hover:border-purple-200 dark:hover:border-purple-800 text-gray-600 dark:text-gray-300 hover:text-purple-600'}`}
                  >
                    <Coffee className="w-6 h-6" />
                    <span className="font-bold text-xs">Week Off</span>
                  </button>

                  <button 
                    onClick={() => markAttendance('holiday')}
                    className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all ${attendance[format(selectedDate, 'yyyy-MM-dd')]?.status === 'holiday' ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400' : 'border-gray-100 dark:border-gray-700 hover:border-teal-200 dark:hover:border-teal-800 text-gray-600 dark:text-gray-300 hover:text-teal-600'}`}
                  >
                    <PartyPopper className="w-6 h-6" />
                    <span className="font-bold text-xs">Holiday</span>
                  </button>
                </div>
              </div>

              <div className="h-px bg-gray-100 dark:bg-gray-700 w-full"></div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Note & Reminder</label>
                  <label className="flex items-center gap-2 cursor-pointer" onClick={() => setIsReminderInput(!isReminderInput)}>
                    <div className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${isReminderInput ? 'bg-indigo-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                      <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${isReminderInput ? 'translate-x-5' : 'translate-x-1'}`} />
                    </div>
                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400">Reminder</span>
                  </label>
                </div>
                <div className="relative">
                  <textarea 
                    value={noteInput}
                    onChange={(e) => setNoteInput(e.target.value)}
                    placeholder="Add a quick note or reminder..."
                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-3 pb-12 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none resize-none h-28 text-gray-800 dark:text-gray-200"
                  />
                  <button
                    onClick={() => {
                      handleSaveNote();
                      setIsModalOpen(false);
                      setSelectedDate(null);
                    }}
                    className="absolute bottom-3 right-3 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
                  >
                    Save
                  </button>
                </div>
              </div>

              {(attendance[format(selectedDate, 'yyyy-MM-dd')]?.status || attendance[format(selectedDate, 'yyyy-MM-dd')]?.note || attendance[format(selectedDate, 'yyyy-MM-dd')]?.isReminder) && (
                <button 
                  onClick={resetAttendance}
                  className="w-full flex items-center justify-center gap-2 p-3 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition-colors border border-transparent hover:border-red-200 dark:hover:border-red-800"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="text-sm font-bold">Reset Day</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Footer Branding */}
      <footer className="w-full py-6 mt-auto text-center">
        <p className="text-sm text-gray-400 dark:text-gray-500 font-medium">Created by benubuilds</p>
      </footer>
    </div>
  );
}
