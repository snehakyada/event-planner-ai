import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import AnimatedLogo from "./components/AnimatedLogo";
import {
  Calendar,
  DollarSign,
  Users,
  CheckCircle2,
  Clock,
  Sparkles,
  Plus,
  Trash2,
  LogOut,
  MapPin,
  Activity,
  FileText,
  Check,
  ChevronRight,
  User,
  Lock,
  PartyPopper,
  Compass,
  Loader2,
  PlusCircle,
  Filter,
  ArrowRight,
  Star,
  FileDown,
  Percent,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { EventConfig, ScheduleItem, ChecklistItem, VendorRecommendation } from "./types";

export default function App() {
  // Authentication state
  const [user, setUser] = useState<{ id: string; username: string } | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // Event planner states
  const [events, setEvents] = useState<EventConfig[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [generationStep, setGenerationStep] = useState(0);

  // New Event creation form state
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState("Wedding");
  const [newBudget, setNewBudget] = useState("");
  const [newGuestCount, setNewGuestCount] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newCurrency, setNewCurrency] = useState<"USD" | "INR">("USD");

  // Plan Interaction tabs and actions
  const [activeTab, setActiveTab] = useState<"schedule" | "checklist" | "vendors">("schedule");
  const [checklistFilter, setChecklistFilter] = useState<string>("all");
  const [newTaskText, setNewTaskText] = useState("");
  const [newTaskCategory, setNewTaskCategory] = useState("General");

  // Status banners / Notification messages
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Load auth state from localStorage on startup
  useEffect(() => {
    const savedToken = localStorage.getItem("eventplanner_token");
    const savedUser = localStorage.getItem("eventplanner_user");
    if (savedToken && savedUser) {
      setToken(savedToken);
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        // Clear corrupt data
        localStorage.removeItem("eventplanner_token");
        localStorage.removeItem("eventplanner_user");
      }
    }
  }, []);

  // Fetch events when token changes
  useEffect(() => {
    if (token) {
      fetchEvents();
    } else {
      setEvents([]);
      setSelectedEventId(null);
    }
  }, [token]);

  // Flash messages helper
  const showError = (msg: string) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(null), 6000);
  };

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  // API Calls
  const fetchEvents = async () => {
    if (!token) return;
    setLoadingEvents(true);
    try {
      const res = await fetch("/api/events", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setEvents(data);
        // Default select the first event if none is selected
        if (data.length > 0 && !selectedEventId) {
          setSelectedEventId(data[0].id);
        }
      } else {
        const err = await res.json();
        showError(err.error || "Failed to load events.");
      }
    } catch (e) {
      showError("Connection error. Could not reach server.");
    } finally {
      setLoadingEvents(false);
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      showError("Please fill out both username and password.");
      return;
    }

    const API_URL = import.meta.env.VITE_API_URL;
    const endpoint = authMode === "login"
    ? `${API_URL}/api/auth/login`
: `${API_URL}/api/auth/register`;

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        localStorage.setItem("eventplanner_token", data.token);
        localStorage.setItem("eventplanner_user", JSON.stringify(data.user));
        setToken(data.token);
        setUser(data.user);
        setUsername("");
        setPassword("");
        showSuccess(data.message);
      } else {
        showError(data.error || "Authentication failed.");
      }
    } catch (e) {
      showError("Connection error. Authentication failed.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("eventplanner_token");
    localStorage.removeItem("eventplanner_user");
    setToken(null);
    setUser(null);
    setEvents([]);
    setSelectedEventId(null);
    showSuccess("Logged out successfully.");
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newBudget || !newGuestCount || !newDate) {
      showError("Please fill out all fields for the event.");
      return;
    }

    const budgetNum = Number(newBudget);
    const guestNum = Number(newGuestCount);
    if (isNaN(budgetNum) || budgetNum <= 0) {
      showError("Budget must be a positive number.");
      return;
    }
    if (isNaN(guestNum) || guestNum <= 0) {
      showError("Guest count must be a positive number.");
      return;
    }

    try {
     const API_URL = import.meta.env.VITE_API_URL;
     const res = await fetch(`${API_URL}/api/events`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: newTitle,
          type: newType,
          budget: budgetNum,
          guestCount: guestNum,
          date: newDate,
          currency: newCurrency,
        }),
      });

      if (res.ok) {
        const created = await res.json();
        setEvents((prev) => [created, ...prev]);
        setSelectedEventId(created.id);
        // Clear form inputs
        setNewTitle("");
        setNewBudget("");
        setNewGuestCount("");
        setNewDate("");
        setNewCurrency("USD");
        showSuccess("Event configuration created!");
      } else {
        const err = await res.json();
        showError(err.error || "Failed to create event.");
      }
    } catch (e) {
      showError("Connection error. Failed to create event.");
    }
  };

  const handleDeleteEvent = async (eventId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this event? All planning data will be lost.")) {
      return;
    }

    try {
      const res = await fetch(`/api/events/${eventId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setEvents((prev) => prev.filter((e) => e.id !== eventId));
        if (selectedEventId === eventId) {
          const remaining = events.filter((e) => e.id !== eventId);
          setSelectedEventId(remaining.length > 0 ? remaining[0].id : null);
        }
        showSuccess("Event deleted successfully.");
      } else {
        const err = await res.json();
        showError(err.error || "Failed to delete event.");
      }
    } catch (err) {
      showError("Connection error. Failed to delete event.");
    }
  };

  const handleUpdateCurrency = async (eventId: string, currency: "USD" | "INR") => {
    try {
      const res = await fetch(`/api/events/${eventId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currency }),
      });

      if (res.ok) {
        const updated = await res.json();
        setEvents((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
        showSuccess(`Currency updated to ${currency}!`);
      } else {
        const err = await res.json();
        showError(err.error || "Failed to update currency.");
      }
    } catch (e) {
      showError("Connection error. Failed to update currency.");
    }
  };

  // Pulse through steps during AI generation
  const generationSteps = [
    "Establishing neural planner engine...",
    "Brainstorming perfect timeline milestones...",
    "Aligning caterers, venues and sound partners with your budget...",
    "Refining task checklists and finalizing planning dashboard...",
  ];

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isGeneratingPlan) {
      setGenerationStep(0);
      interval = setInterval(() => {
        setGenerationStep((prev) => {
          if (prev < generationSteps.length - 1) {
            return prev + 1;
          }
          return prev;
        });
      }, 3500);
    }
    return () => clearInterval(interval);
  }, [isGeneratingPlan]);

  const handleGeneratePlan = async () => {
    if (!selectedEventId) return;
    setIsGeneratingPlan(true);
    try {
      const res = await fetch(`/api/events/${selectedEventId}/generate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const updated = await res.json();
        setEvents((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
        showSuccess("AI Event Plan Generated Successfully!");
      } else {
        const err = await res.json();
        showError(err.error || "Failed to generate event plan.");
      }
    } catch (e) {
      showError("Connection error. AI generation failed.");
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  const handleToggleSchedule = async (itemId: string) => {
    if (!selectedEventId) return;
    try {
      const res = await fetch(`/api/events/${selectedEventId}/toggle-schedule`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ itemId }),
      });

      if (res.ok) {
        const updated = await res.json();
        setEvents((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
      }
    } catch (e) {
      showError("Failed to update schedule status.");
    }
  };

  const handleToggleChecklist = async (itemId: string) => {
    if (!selectedEventId) return;
    try {
      const res = await fetch(`/api/events/${selectedEventId}/toggle-checklist`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ itemId }),
      });

      if (res.ok) {
        const updated = await res.json();
        setEvents((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
      }
    } catch (e) {
      showError("Failed to update checklist status.");
    }
  };

  const handleAddCustomTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;

    try {
      const res = await fetch(`/api/events/${selectedEventId}/add-checklist-item`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          task: newTaskText,
          category: newTaskCategory,
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        setEvents((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
        setNewTaskText("");
        showSuccess("Custom task added!");
      } else {
        const err = await res.json();
        showError(err.error || "Failed to add checklist item.");
      }
    } catch (e) {
      showError("Failed to add custom task.");
    }
  };

  // Derived properties for current selected event
  const currentEvent = useMemo(() => {
    return events.find((e) => e.id === selectedEventId) || null;
  }, [events, selectedEventId]);

  // Checklist Categories
  const checklistCategories = useMemo(() => {
    if (!currentEvent || !currentEvent.plan) return [];
    const cats = currentEvent.plan.checklist.map((item) => item.category);
    return Array.from(new Set(cats));
  }, [currentEvent]);

  // Filtered Checklist items
  const filteredChecklist = useMemo(() => {
    if (!currentEvent || !currentEvent.plan) return [];
    if (checklistFilter === "all") return currentEvent.plan.checklist;
    return currentEvent.plan.checklist.filter((item) => item.category === checklistFilter);
  }, [currentEvent, checklistFilter]);

  // Calculation Metrics
  const metrics = useMemo(() => {
    if (!currentEvent || !currentEvent.plan) {
      return { schedulePct: 0, checklistPct: 0, totalVendorCost: 0, balance: 0 };
    }

    const { schedule, checklist, vendors } = currentEvent.plan;

    const scheduleDone = schedule.filter((s) => s.completed).length;
    const schedulePct = schedule.length ? Math.round((scheduleDone / schedule.length) * 100) : 0;

    const checklistDone = checklist.filter((c) => c.completed).length;
    const checklistPct = checklist.length ? Math.round((checklistDone / checklist.length) * 100) : 0;

    let totalVendorCost = 0;
    vendors.forEach((v) => {
      // Extract numeric value from cost string (e.g. "$1,500" -> 1500)
      const numericStr = v.estimatedCost.replace(/[^0-9]/g, "");
      const val = Number(numericStr);
      if (!isNaN(val)) {
        totalVendorCost += val;
      }
    });

    const balance = currentEvent.budget - totalVendorCost;

    return { schedulePct, checklistPct, totalVendorCost, balance };
  }, [currentEvent]);

  // Helper to format money according to the event currency
  const formatMoney = (amount: number) => {
    const symbol = currentEvent?.currency === "INR" ? "₹" : "$";
    const formatted = currentEvent?.currency === "INR"
      ? amount.toLocaleString("en-IN")
      : amount.toLocaleString("en-US");
    return `${symbol}${formatted}`;
  };

  const formatVendorCost = (costStr: string) => {
    const numericStr = costStr.replace(/[^0-9]/g, "");
    const val = Number(numericStr);
    if (!isNaN(val) && numericStr.length > 0) {
      return formatMoney(val);
    }
    return costStr;
  };

  // Export event data to a clean printable layout
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-linear-to-tr from-[#0b0f19] via-[#111827] to-[#1f1a3a] text-slate-100 font-sans flex flex-col antialiased relative overflow-x-hidden">
      {/* Decorative ambient glowing backdrops for Frosted Glass - Static to prevent browser layout shifts and scroll jumps */}
      <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-indigo-600/15 blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 left-1/4 w-96 h-96 rounded-full bg-purple-500/10 blur-[110px] pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-pink-600/15 blur-[120px] pointer-events-none" />

      {/* Toast Notification Area */}
      <AnimatePresence>
        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-red-600 text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 max-w-md w-11/12 border border-red-500"
          >
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span className="text-sm font-medium">{errorMsg}</span>
          </motion.div>
        )}
        {successMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 max-w-md w-11/12 border border-emerald-500"
          >
            <CheckCircle className="w-5 h-5 shrink-0" />
            <span className="text-sm font-medium">{successMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Bar */}
      <header className="bg-white/10 backdrop-blur-md border-b border-white/10 sticky top-0 z-40 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <AnimatedLogo size="sm" />
            <div>
              <span className="font-display font-bold text-xl tracking-tight bg-linear-to-r from-indigo-200 via-purple-200 to-pink-200 bg-clip-text text-transparent">
                Event Planner AI
              </span>
              <span className="hidden sm:inline-block ml-2 text-[10px] bg-white/10 text-slate-300 font-mono py-0.5 px-1.5 rounded uppercase font-semibold border border-white/5">
                Intelligence Engine v2.5
              </span>
            </div>
          </div>

          {user ? (
            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg py-1.5 px-3">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                <span className="text-xs font-semibold text-slate-200">
                  Planning: {user.username}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 text-xs font-medium text-slate-300 hover:text-red-400 hover:bg-white/5 py-1.5 px-3 rounded-lg border border-transparent hover:border-white/10 transition-all"
              >
                <LogOut className="w-4 h-4 text-red-400" />
                Logout
              </button>
            </div>
          ) : (
            <div className="text-xs font-medium text-slate-400">
              AI-Powered Event Planner
            </div>
          )}
        </div>
      </header>

      {/* Main Content Stage */}
      <main className="flex-1 flex flex-col justify-center relative z-10">
        {!user ? (
          /* Authentication Screen */
          <div className="w-full max-w-md mx-auto p-4 flex flex-col justify-center min-h-[calc(100vh-4rem)] relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="bg-white/10 backdrop-blur-xl p-8 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] border border-white/20"
            >
              <div className="text-center mb-8">
                <div className="inline-flex mb-6 drop-shadow-[0_0_15px_rgba(129,140,248,0.25)]">
                  <AnimatedLogo size="lg" />
                </div>
                <h1 className="font-display text-3xl font-extrabold text-transparent bg-clip-text bg-linear-to-r from-indigo-100 via-purple-100 to-white tracking-tight leading-tight">
                  Event Planner AI
                </h1>
                <p className="text-xs text-slate-300/90 mt-2 font-medium tracking-wide">
                  Design , celebrations and timelines using Event Planner AI
                </p>
              </div>

              {/* Tabs for Login / Register */}
              <div className="flex p-1 bg-black/20 backdrop-blur-sm rounded-xl mb-6 border border-white/5">
                <button
                  type="button"
                  onClick={() => setAuthMode("login")}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    authMode === "login"
                      ? "bg-white/15 text-white shadow-sm border border-white/10"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMode("register")}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    authMode === "register"
                      ? "bg-white/15 text-white shadow-sm border border-white/10"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Create Account
                </button>
              </div>

              <AnimatePresence mode="wait">
                <motion.form
                  key={authMode}
                  initial={{ opacity: 0, x: authMode === "login" ? -15 : 15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: authMode === "login" ? 15 : -15 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                  onSubmit={handleAuthSubmit}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Username
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-300/80" />
                      <input
                        type="text"
                        required
                        placeholder="planner123"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full bg-black/20 hover:bg-black/30 border border-white/15 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/35 focus:border-indigo-400 focus:bg-slate-950/60 transition-all duration-200"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-300/80" />
                      <input
                        type="password"
                        required
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-black/20 hover:bg-black/30 border border-white/15 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/35 focus:border-indigo-400 focus:bg-slate-950/60 transition-all duration-200"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-linear-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-sm font-semibold py-3 rounded-xl shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 border border-white/10 transition-all flex items-center justify-center gap-2 mt-2 cursor-pointer"
                  >
                    {authMode === "login" ? "Begin Planning" : "Register Planner"}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </motion.form>
              </AnimatePresence>

              <div className="text-center mt-6">
                <span className="text-xs text-slate-400">
                  {authMode === "login"
                    ? "New to the engine? "
                    : "Already registered? "}
                  <button
                    onClick={() => setAuthMode(authMode === "login" ? "register" : "login")}
                    className="text-indigo-300 font-bold hover:underline cursor-pointer"
                  >
                    {authMode === "login" ? "Create an account" : "Sign in instead"}
                  </button>
                </span>
              </div>
            </motion.div>
          </div>
        ) : (
          /* Main Workspace Stage */
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full print:p-0">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 print:block">
              
              {/* Left Column: Event Picker & Creator */}
              <div className="lg:col-span-4 flex flex-col gap-8 print:hidden">
                {/* Event Creator Form */}
                <div className="bg-white/15 backdrop-blur-xl p-6 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.2)] border border-white/15">
                  <div className="flex items-center gap-2 mb-4">
                    <PlusCircle className="w-5 h-5 text-indigo-400" />
                    <h2 className="font-display font-bold text-lg text-white">
                      Configure New Event
                    </h2>
                  </div>

                  <form onSubmit={handleCreateEvent} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Event Title
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Sarah's 10th Birthday Bash"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        className="w-full bg-black/20 hover:bg-black/35 border border-white/15 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/35 focus:border-indigo-400 focus:bg-slate-950/60 transition-all duration-200"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Event Type
                        </label>
                        <select
                          value={newType}
                          onChange={(e) => setNewType(e.target.value)}
                          className="w-full bg-black/20 hover:bg-black/35 border border-white/15 rounded-xl px-2.5 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/35 focus:border-indigo-400 focus:bg-slate-950/60 transition-all duration-200 [&>option]:bg-slate-900 [&>option]:text-white"
                        >
                          <option value="Wedding">Wedding</option>
                          <option value="Birthday Party">Birthday Party</option>
                          <option value="Corporate Event">Corporate Event</option>
                          <option value="Conference / Workshop">Workshop</option>
                          <option value="Anniversary">Anniversary</option>
                          <option value="Baby Shower">Baby Shower</option>
                          <option value="Graduation Party">Graduation</option>
                          <option value="Custom Gala">Custom Gala</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Event Date
                        </label>
                        <input
                          type="date"
                          required
                          value={newDate}
                          onChange={(e) => setNewDate(e.target.value)}
                          className="w-full bg-black/20 hover:bg-black/35 border border-white/15 rounded-xl px-2 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/35 focus:border-indigo-400 focus:bg-slate-950/60 transition-all duration-200 scheme:dark"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Currency
                        </label>
                        <select
                          value={newCurrency}
                          onChange={(e) => setNewCurrency(e.target.value as "USD" | "INR")}
                          className="w-full bg-black/20 hover:bg-black/35 border border-white/15 rounded-xl px-2.5 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/35 focus:border-indigo-400 focus:bg-slate-950/60 transition-all duration-200 [&>option]:bg-slate-900 [&>option]:text-white"
                        >
                          <option value="USD">USD ($)</option>
                          <option value="INR">INR (₹)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Guest Count
                        </label>
                        <input
                          type="number"
                          required
                          placeholder="80"
                          value={newGuestCount}
                          onChange={(e) => setNewGuestCount(e.target.value)}
                          className="w-full bg-black/20 hover:bg-black/35 border border-white/15 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/35 focus:border-indigo-400 focus:bg-slate-950/60 transition-all duration-200"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Budget ({newCurrency === "INR" ? "₹" : "$"})
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-indigo-300 text-sm font-semibold">
                          {newCurrency === "INR" ? "₹" : "$"}
                        </span>
                        <input
                          type="number"
                          required
                          placeholder={newCurrency === "INR" ? "500000" : "5000"}
                          value={newBudget}
                          onChange={(e) => setNewBudget(e.target.value)}
                          className="w-full bg-black/20 hover:bg-black/35 border border-white/15 rounded-xl pl-8 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/35 focus:border-indigo-400 focus:bg-slate-950/60 transition-all duration-200"
                        />
                      </div>
                    </div>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="submit"
                      className="w-full bg-linear-to-r from-indigo-500 via-purple-600 to-pink-600 hover:from-indigo-600 hover:to-pink-700 text-white font-bold text-xs py-3 rounded-xl transition-all border border-white/10 flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-indigo-500/20"
                    >
                      <Plus className="w-4 h-4" />
                      Add Event Profile
                    </motion.button>
                  </form>
                </div>

                {/* Event Selector List */}
                <div className="bg-white/10 backdrop-blur-xl p-6 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.2)] border border-white/15 flex-1 flex flex-col min-h-300px">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Compass className="w-5 h-5 text-indigo-400" />
                      <h2 className="font-display font-bold text-lg text-white">
                        My Event Profiles
                      </h2>
                    </div>
                    <span className="text-xs bg-white/10 text-slate-300 font-bold px-2 py-0.5 rounded-full border border-white/5">
                      {events.length}
                    </span>
                  </div>

                  {loadingEvents ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-8">
                      <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mb-2" />
                      <span className="text-xs text-slate-300">Loading planner databases...</span>
                    </div>
                  ) : events.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-white/10 rounded-xl px-4">
                      <Calendar className="w-10 h-10 text-slate-400 mb-3" />
                      <span className="text-sm font-semibold text-slate-300">No events found</span>
                      <p className="text-xs text-slate-400 mt-1">Configure your first event profiles using the form above to trigger AI blueprints.</p>
                    </div>
                  ) : (
                    <div className="space-y-2.5 overflow-y-auto max-h-400px flex-1 pr-1">
                      <AnimatePresence initial={false}>
                        {events.map((evt) => {
                          const isSelected = evt.id === selectedEventId;
                          return (
                            <motion.div
                              layout
                              key={evt.id}
                              initial={{ opacity: 0, y: 12 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, x: -50, transition: { duration: 0.2 } }}
                              whileHover={{ scale: 1.015, x: 2 }}
                              whileTap={{ scale: 0.985 }}
                              onClick={() => {
                                setSelectedEventId(evt.id);
                                setActiveTab("schedule");
                              }}
                              className={`group p-3.5 rounded-xl border text-left cursor-pointer transition-all flex items-center justify-between ${
                                isSelected
                                  ? "bg-white/20 border-white/30 shadow-md"
                                  : "bg-white/5 border-white/5 hover:bg-white/10"
                              }`}
                            >
                              <div className="min-w-0 flex-1">
                                <h3 className={`text-sm font-bold truncate ${isSelected ? "text-white" : "text-slate-300"}`}>
                                  {evt.title}
                                </h3>
                                <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                                  <span className="font-medium">{evt.type}</span>
                                  <span className="text-slate-500">•</span>
                                  <span>{evt.date}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                {evt.plan ? (
                                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-extrabold px-1.5 py-0.5 rounded uppercase">
                                    AI Ready
                                  </span>
                                ) : (
                                  <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold px-1.5 py-0.5 rounded uppercase">
                                    Config
                                  </span>
                                )}
                                <button
                                  onClick={(e) => handleDeleteEvent(evt.id, e)}
                                  className="text-slate-400 hover:text-red-400 p-1 rounded-lg hover:bg-white/10 group-hover:opacity-100 transition-all opacity-10 md:opacity-0 cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Dynamic Workspace */}
              <div className="lg:col-span-8 print:block">
                {currentEvent ? (
                  <div className="flex flex-col gap-6">
                    
                    {/* Active Event Core Info Board */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4 }}
                      className="bg-white/10 backdrop-blur-xl p-6 rounded-3xl shadow-[0_12px_40px_0_rgba(0,0,0,0.3)] border border-white/15 hover:border-indigo-500/20 transition-all duration-300"
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] bg-indigo-500/25 text-indigo-200 border border-indigo-400/25 font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                              {currentEvent.type}
                            </span>
                            <span className="text-slate-400 text-xs font-semibold tracking-wide">{currentEvent.date}</span>
                          </div>
                          <h1 className="font-display font-extrabold text-2xl md:text-3xl text-white tracking-tight mt-2.5">
                            {currentEvent.title}
                          </h1>
                        </div>
                        
                        <div className="flex items-center gap-2.5 print:hidden">
                          {currentEvent.plan && (
                            <motion.button
                              whileHover={{ scale: 1.03, y: -1 }}
                              whileTap={{ scale: 0.97 }}
                              onClick={handlePrint}
                              className="bg-white/10 hover:bg-white/15 text-white font-bold text-xs py-2.5 px-4 rounded-xl border border-white/10 transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                            >
                              <FileDown className="w-4 h-4 text-indigo-300" />
                              Print Blueprint
                            </motion.button>
                          )}
                          <motion.button
                            whileHover={{ scale: 1.03, y: -1, boxShadow: "0 10px 20px -5px rgba(129,140,248,0.4)" }}
                            whileTap={{ scale: 0.97 }}
                            onClick={handleGeneratePlan}
                            disabled={isGeneratingPlan}
                            className="bg-linear-to-r from-indigo-500 via-purple-600 to-pink-600 hover:from-indigo-600 hover:to-pink-700 text-white font-extrabold text-xs py-2.5 px-4 rounded-xl shadow-lg border border-white/10 transition-all flex items-center gap-1.5 cursor-pointer"
                          >
                            <Sparkles className="w-4 h-4 text-indigo-200" />
                            {currentEvent.plan ? "Re-Generate with AI" : "Generate Plan with AI"}
                          </motion.button>
                        </div>
                      </div>

                      {/* Info Cards Grid with Hover Scale and Accents */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 border-t border-white/10 pt-6">
                        <motion.div
                          whileHover={{ y: -3, scale: 1.02, backgroundColor: "rgba(255, 255, 255, 0.08)" }}
                          transition={{ type: "spring", stiffness: 300, damping: 20 }}
                          className="bg-white/5 p-4 rounded-2xl border border-white/10 flex flex-col justify-between transition-all"
                        >
                          <div className="flex items-center justify-between gap-1.5 mb-1.5 print:hidden">
                            <div className="flex items-center gap-1.5">
                              <DollarSign className="w-3.5 h-3.5 text-indigo-300" />
                              <span className="text-xs text-slate-400 font-bold tracking-wide">Total Budget</span>
                            </div>
                            <select
                              value={currentEvent.currency || "USD"}
                              onChange={(e) => handleUpdateCurrency(currentEvent.id, e.target.value as "USD" | "INR")}
                              className="text-[9px] bg-slate-950/80 border border-white/10 rounded-md px-1.5 py-0.5 text-indigo-300 font-extrabold focus:outline-none focus:border-indigo-400 hover:bg-slate-900 cursor-pointer transition-all shrink-0"
                            >
                              <option value="USD">USD ($)</option>
                              <option value="INR">INR (₹)</option>
                            </select>
                          </div>
                          <span className="text-xs text-slate-400 font-bold tracking-wide hidden print:block">Total Budget</span>
                          <span className="text-xl font-extrabold text-white font-mono leading-none tracking-tight">
                            {formatMoney(currentEvent.budget)}
                          </span>
                        </motion.div>

                        <motion.div
                          whileHover={{ y: -3, scale: 1.02, backgroundColor: "rgba(255, 255, 255, 0.08)" }}
                          transition={{ type: "spring", stiffness: 300, damping: 20 }}
                          className="bg-white/5 p-4 rounded-2xl border border-white/10 flex flex-col justify-between transition-all"
                        >
                          <div className="flex items-center gap-1.5 mb-2">
                            <Users className="w-3.5 h-3.5 text-indigo-300" />
                            <span className="text-xs text-slate-400 font-bold tracking-wide">Guest Target</span>
                          </div>
                          <span className="text-xl font-extrabold text-white font-mono leading-none tracking-tight">
                            {currentEvent.guestCount} guests
                          </span>
                        </motion.div>

                        <motion.div
                          whileHover={{ y: -3, scale: 1.02, backgroundColor: "rgba(255, 255, 255, 0.08)" }}
                          transition={{ type: "spring", stiffness: 300, damping: 20 }}
                          className="bg-white/5 p-4 rounded-2xl border border-white/10 flex flex-col justify-between transition-all"
                        >
                          <div className="flex items-center gap-1.5 mb-2">
                            <PartyPopper className="w-3.5 h-3.5 text-indigo-300" />
                            <span className="text-xs text-slate-400 font-bold tracking-wide">Allocated Vendors</span>
                          </div>
                          <span className="text-xl font-extrabold text-white font-mono leading-none tracking-tight">
                            {currentEvent.plan ? formatMoney(metrics.totalVendorCost) : formatMoney(0)}
                          </span>
                        </motion.div>

                        <motion.div
                          whileHover={{ y: -3, scale: 1.02, backgroundColor: "rgba(255, 255, 255, 0.08)" }}
                          transition={{ type: "spring", stiffness: 300, damping: 20 }}
                          className="bg-white/5 p-4 rounded-2xl border border-white/10 flex flex-col justify-between transition-all"
                        >
                          <div className="flex items-center gap-1.5 mb-2">
                            <Activity className="w-3.5 h-3.5 text-indigo-300" />
                            <span className="text-xs text-slate-400 font-bold tracking-wide">Unallocated Balance</span>
                          </div>
                          <span className={`text-xl font-extrabold font-mono leading-none tracking-tight ${metrics.balance < 0 ? "text-red-400" : "text-emerald-400"}`}>
                            {currentEvent.plan ? (metrics.balance < 0 ? `-${formatMoney(Math.abs(metrics.balance))}` : formatMoney(metrics.balance)) : "TBD"}
                          </span>
                        </motion.div>
                      </div>
                    </motion.div>

                    {/* AI Loading State Screen */}
                    {isGeneratingPlan ? (
                      <div className="bg-white/10 backdrop-blur-xl p-12 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.2)] border border-white/15 text-center flex flex-col items-center justify-center min-h-350px">
                        <div className="relative mb-6">
                          <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-400 rounded-full animate-spin"></div>
                          <Sparkles className="w-6 h-6 text-indigo-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                        </div>
                        <h3 className="font-display font-bold text-lg text-white">
                          AI Engine Consulting...
                        </h3>
                        <p className="text-sm text-slate-300 mt-2 max-w-sm">
                          Please wait. The system is assembling structural milestones, budget layouts, and local checklists.
                        </p>
                        
                        <div className="w-full max-w-xs bg-black/20 h-2 rounded-full overflow-hidden mt-6 border border-white/5">
                          <motion.div
                            initial={{ width: "5%" }}
                            animate={{ width: `${(generationStep + 1) * 25}%` }}
                            transition={{ duration: 0.5 }}
                            className="bg-linear-to-r from-indigo-500 to-purple-500 h-full"
                          />
                        </div>
                        
                        <span className="text-xs font-mono text-indigo-300 font-bold mt-3 animate-pulse">
                          {generationSteps[generationStep]}
                        </span>
                      </div>
                    ) : !currentEvent.plan ? (
                      /* Plan Empty State Prompt */
                      <div className="bg-linear-to-br from-indigo-950/40 via-purple-950/20 to-slate-900/40 backdrop-blur-xl p-12 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.2)] border border-white/15 text-center flex flex-col items-center justify-center min-h-350px">
                        <div className="bg-white/10 p-4 rounded-full shadow-inner border border-white/15 text-indigo-300 mb-4">
                          <Sparkles className="w-8 h-8" />
                        </div>
                        <h3 className="font-display font-extrabold text-xl text-white tracking-tight">
                          Generate AI Plan & Schedule
                        </h3>
                        <p className="text-sm text-slate-300 mt-2 max-w-md">
                          Click the button below to allow Gemini to analyze your budget ({formatMoney(currentEvent.budget)}) and guest list ({currentEvent.guestCount}) to write a custom timeline, checklists, and local vendor estimates.
                        </p>
                        
                        <button
                          onClick={handleGeneratePlan}
                          className="bg-linear-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold text-sm py-3 px-8 rounded-xl mt-6 border border-white/10 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all flex items-center gap-2 cursor-pointer"
                        >
                          <Sparkles className="w-4 h-4 text-indigo-200" />
                          Construct Event Blueprint
                        </button>
                      </div>
                    ) : (
                      /* Complete AI Planning Dashboard (Active Tab Workspace) */
                      <div className="space-y-6">
                        
                         {/* Interactive tab headers */}
                         <div className="bg-white/10 backdrop-blur-md p-1.5 rounded-2xl shadow-xl border border-white/10 flex relative print:hidden">
                           <button
                             onClick={() => setActiveTab("schedule")}
                             className="relative flex-1 py-3.5 text-xs font-black rounded-xl transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer overflow-hidden group"
                           >
                             {activeTab === "schedule" && (
                               <motion.div
                                 layoutId="activeTabIndicator"
                                 className="absolute inset-0 bg-white/15 border border-white/15 rounded-xl shadow-md"
                                 transition={{ type: "spring", stiffness: 380, damping: 30 }}
                               />
                             )}
                             <span className={`relative z-10 flex items-center justify-center gap-2 transition-colors duration-200 ${
                               activeTab === "schedule" ? "text-white" : "text-slate-400 group-hover:text-slate-200"
                             }`}>
                               <Clock className="w-4 h-4" />
                               Chronological Schedule
                               <span className={`text-[10px] py-0.5 px-2 rounded-full font-mono font-bold transition-all ${
                                 activeTab === "schedule" ? "bg-indigo-500/30 text-white border border-indigo-400/20" : "bg-black/30 text-slate-400"
                               }`}>
                                 {metrics.schedulePct}%
                               </span>
                             </span>
                           </button>

                           <button
                             onClick={() => setActiveTab("checklist")}
                             className="relative flex-1 py-3.5 text-xs font-black rounded-xl transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer overflow-hidden group"
                           >
                             {activeTab === "checklist" && (
                               <motion.div
                                 layoutId="activeTabIndicator"
                                 className="absolute inset-0 bg-white/15 border border-white/15 rounded-xl shadow-md"
                                 transition={{ type: "spring", stiffness: 380, damping: 30 }}
                               />
                             )}
                             <span className={`relative z-10 flex items-center justify-center gap-2 transition-colors duration-200 ${
                               activeTab === "checklist" ? "text-white" : "text-slate-400 group-hover:text-slate-200"
                             }`}>
                               <CheckCircle2 className="w-4 h-4" />
                               Coordination Checklist
                               <span className={`text-[10px] py-0.5 px-2 rounded-full font-mono font-bold transition-all ${
                                 activeTab === "checklist" ? "bg-indigo-500/30 text-white border border-indigo-400/20" : "bg-black/30 text-slate-400"
                               }`}>
                                 {metrics.checklistPct}%
                               </span>
                             </span>
                           </button>

                           <button
                             onClick={() => setActiveTab("vendors")}
                             className="relative flex-1 py-3.5 text-xs font-black rounded-xl transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer overflow-hidden group"
                           >
                             {activeTab === "vendors" && (
                               <motion.div
                                 layoutId="activeTabIndicator"
                                 className="absolute inset-0 bg-white/15 border border-white/15 rounded-xl shadow-md"
                                 transition={{ type: "spring", stiffness: 380, damping: 30 }}
                               />
                             )}
                             <span className={`relative z-10 flex items-center justify-center gap-2 transition-colors duration-200 ${
                               activeTab === "vendors" ? "text-white" : "text-slate-400 group-hover:text-slate-200"
                             }`}>
                               <Users className="w-4 h-4" />
                               Curated Vendors
                               <span className={`text-[10px] py-0.5 px-2 rounded-full font-mono font-bold transition-all ${
                                 activeTab === "vendors" ? "bg-indigo-500/30 text-white border border-indigo-400/20" : "bg-black/30 text-slate-400"
                               }`}>
                                 {currentEvent.plan.vendors.length}
                               </span>
                             </span>
                           </button>
                         </div>

                        <AnimatePresence mode="wait">
                          {/* TAB 1: Chronological Schedule Timeline */}
                          {activeTab === "schedule" && (
                            <motion.div
                              key="schedule"
                              initial={{ opacity: 0, y: 15 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -15 }}
                              transition={{ duration: 0.2 }}
                            >
                              <div className="bg-white/10 backdrop-blur-xl p-6 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.2)] border border-white/15 print:shadow-none print:border-none">
                                <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
                                  <div>
                                    <h3 className="font-display font-bold text-lg text-white">
                                      Chronological Schedule & Milestones
                                    </h3>
                                    <p className="text-xs text-slate-300">Day-of operations step-by-step timeline</p>
                                  </div>
                                  <span className="text-xs font-bold text-indigo-200 bg-indigo-500/20 border border-indigo-500/30 px-2.5 py-1 rounded-lg">
                                    {metrics.schedulePct}% Timeline Milestones Complete
                                  </span>
                                </div>

                                {/* Timeline Node List */}
                               <div className="relative ml-8 pl-10 space-y-8 before:absolute before:left-0 before:top-0 before:h-full before:w-before:w-0.5 before:bg-white/15">
                                  {currentEvent.plan.schedule.map((item, idx) => (
                                    <motion.div
                                      initial={{ opacity: 0, x: -10 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      transition={{ duration: 0.3, delay: idx * 0.04 }}
                                      key={item.id}
                                      className="relative group bg-white/0.02 hover:bg-white/0.05 p-3.5 rounded-2xl border border-transparent hover:border-white/5 transition-all duration-200"
                                    >
                                      {/* Milestone Icon dot */}
                                      <motion.button
                                        whileHover={{ scale: 1.15 }}
                                        whileTap={{ scale: 0.9 }}
                                        onClick={() => handleToggleSchedule(item.id)}
                                        className={`absolute -left-13 top-5 w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all z-10 cursor-pointer  ${
                                          item.completed
                                            ? "bg-indigo-500 border-indigo-400 text-white shadow-md shadow-indigo-500/25"
                                            : "bg-[#0b0f19] border-white/20 hover:border-indigo-400 text-transparent"
                                        }`}
                                      >
                                        <Check className="w-3 h-3 stroke-3" />
                                      </motion.button>

                                      <div className="print:block hidden absolute -left-34px top-1.5 w-3 h-3 bg-white/30 rounded-full" />

                                      <div>
                                        <div className="flex items-center gap-2">
                                         <span className="inline-flex items-center px-3 py-1 rounded-lg bg-indigo-500/20 border border-indigo-400/20 text-indigo-200 text-xs font-bold">
                                            {item.time}
                                          </span>
                                          <h4 className={`text-sm font-bold transition-all ${
                                            item.completed ? "text-slate-500 line-through" : "text-white"
                                          }`}>
                                            {item.title}
                                          </h4>
                                        </div>
                                        <p className={`text-xs mt-1 leading-relaxed ${item.completed ? "text-slate-500" : "text-slate-300"}`}>
                                          {item.description}
                                        </p>
                                      </div>
                                    </motion.div>
                                  ))}
                                </div>
                              </div>
                            </motion.div>
                          )}

                          {/* TAB 2: Action Checklist */}
                          {activeTab === "checklist" && (
                            <motion.div
                              key="checklist"
                              initial={{ opacity: 0, y: 15 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -15 }}
                              transition={{ duration: 0.2 }}
                            >
                              <div className="bg-white/10 backdrop-blur-xl p-6 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.2)] border border-white/15 print:shadow-none print:border-none space-y-6">
                                
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
                                  <div>
                                    <h3 className="font-display font-bold text-lg text-white">
                                      Coordination Checklist & Deliverables
                                    </h3>
                                    <p className="text-xs text-slate-300">Track milestones, contracts, and logistics</p>
                                  </div>
                                  
                                  {/* Category filtering */}
                                  <div className="flex items-center gap-1.5 shrink-0 print:hidden">
                                    <Filter className="w-3.5 h-3.5 text-slate-400" />
                                    <select
                                      value={checklistFilter}
                                      onChange={(e) => setChecklistFilter(e.target.value)}
                                      className="bg-white/10 border border-white/15 text-slate-200 text-xs font-bold rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-400 focus:bg-[#111827] [&>option]:bg-slate-900 [&>option]:text-white"
                                    >
                                      <option value="all">All Categories</option>
                                      {checklistCategories.map((c) => (
                                        <option key={c} value={c}>
                                          {c}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                </div>

                                {/* Add Custom Task Form */}
                                <form onSubmit={handleAddCustomTask} className="bg-white/5 p-4 rounded-xl border border-white/10 flex flex-col md:flex-row items-center gap-3 print:hidden">
                                  <div className="w-full md:flex-1">
                                    <input
                                      type="text"
                                      required
                                      placeholder="Type custom task (e.g. Confirm tablecloth linen counts)"
                                      value={newTaskText}
                                      onChange={(e) => setNewTaskText(e.target.value)}
                                      className="w-full bg-white/10 border border-white/15 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-400 focus:bg-white/15"
                                    />
                                  </div>
                                  <div className="w-full md:w-auto flex items-center gap-2">
                                    <select
                                      value={newTaskCategory}
                                      onChange={(e) => setNewTaskCategory(e.target.value)}
                                      className="bg-white/10 border border-white/15 text-slate-200 text-xs rounded-lg px-2.5 py-2 focus:outline-none focus:border-indigo-400 focus:bg-[#111827] [&>option]:bg-slate-900 [&>option]:text-white"
                                    >
                                      <option value="General">General</option>
                                      <option value="Preparation">Preparation</option>
                                      <option value="Decor">Decor</option>
                                      <option value="Vendors">Vendors</option>
                                      <option value="Logistics">Logistics</option>
                                    </select>
                                    <motion.button
                                      whileHover={{ scale: 1.05, boxShadow: "0 6px 20px -4px rgba(99,102,241,0.4)" }}
                                      whileTap={{ scale: 0.95 }}
                                      type="submit"
                                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs py-2 px-4 rounded-lg flex items-center gap-1 shrink-0 cursor-pointer shadow-md transition-colors"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                      Add Task
                                    </motion.button>
                                  </div>
                                </form>

                                {/* Checklist render */}
                                <div className="space-y-2.5">
                                  {filteredChecklist.length === 0 ? (
                                    <div className="text-center py-8 text-slate-400 text-xs border border-dashed border-white/10 rounded-xl">
                                      No tasks matching the filter.
                                    </div>
                                  ) : (
                                    filteredChecklist.map((item, idx) => (
                                      <motion.div
                                        layout
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.25, delay: idx * 0.02 }}
                                        whileHover={{ scale: 1.008, x: 2 }}
                                        key={item.id}
                                        className={`p-3.5 rounded-2xl border flex items-center justify-between transition-all duration-300 ${
                                          item.completed
                                            ? "bg-white/5 border-white/5"
                                            : "bg-white/10 border-white/15 hover:border-indigo-500/25 hover:bg-white/15 shadow-sm"
                                        }`}
                                      >
                                        <div className="flex items-center gap-3.5 min-w-0">
                                          <motion.button
                                            whileHover={{ scale: 1.15 }}
                                            whileTap={{ scale: 0.85 }}
                                            onClick={() => handleToggleChecklist(item.id)}
                                            className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all shrink-0 cursor-pointer ${
                                              item.completed
                                                ? "bg-indigo-500 border-indigo-400 text-white shadow-sm shadow-indigo-500/25"
                                                : "border-white/35 bg-slate-900 hover:border-indigo-400 text-transparent"
                                            }`}
                                          >
                                            <Check className="w-3 h-3 stroke-3" />
                                          </motion.button>
                                          <div className="min-w-0">
                                            <p className={`text-xs font-bold leading-snug transition-all duration-200 ${
                                              item.completed ? "text-slate-500 line-through font-medium" : "text-slate-200"
                                            }`}>
                                              {item.task}
                                            </p>
                                            <span className="text-[9px] text-indigo-300 font-extrabold tracking-wider uppercase mt-1 block">
                                              {item.category}
                                            </span>
                                          </div>
                                        </div>
                                        
                                        {item.completed && (
                                          <motion.span
                                            initial={{ scale: 0.8, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            className="text-[9px] bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 font-extrabold px-2 py-0.5 rounded-md uppercase shrink-0 ml-2"
                                          >
                                            Done
                                          </motion.span>
                                        )}
                                      </motion.div>
                                    ))
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          )}

                          {/* TAB 3: Curated Vendor Recommendations */}
                          {activeTab === "vendors" && (
                            <motion.div
                              key="vendors"
                              initial={{ opacity: 0, y: 15 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -15 }}
                              transition={{ duration: 0.2 }}
                            >
                              <div className="bg-white/10 backdrop-blur-xl p-6 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.2)] border border-white/15 print:shadow-none print:border-none space-y-6">
                                <div>
                                  <h3 className="font-display font-bold text-lg text-white">
                                    Curated Vendor Allocations & Recommendations
                                  </h3>
                                  <p className="text-xs text-slate-300">
                                    Budget-matched estimates to support successful planning
                                  </p>
                                </div>

                                {/* Alert Banner explaining allocations */}
                                <div className="bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-xl flex items-start gap-2.5">
                                  <Star className="w-5 h-5 text-indigo-300 shrink-0 mt-0.5 fill-indigo-500/20" />
                                  <div className="text-xs text-indigo-200">
                                    <span className="font-bold">Pro Planning Tip:</span> These simulated allocations are optimized by Gemini to fit perfectly inside your budget of <span className="font-mono font-bold">{formatMoney(currentEvent.budget)}</span>. Feel free to use the questions and tips inside the cards when evaluating real-world service contracts!
                                  </div>
                                </div>

                                {/* Vendor Card List */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {currentEvent.plan.vendors.map((vendor, idx) => (
                                    <motion.div
                                      key={idx}
                                      initial={{ opacity: 0, y: 15 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      transition={{ duration: 0.3, delay: idx * 0.05 }}
                                      whileHover={{ y: -3, scale: 1.01, boxShadow: "0 10px 25px -5px rgba(99,102,241,0.15)" }}
                                      className="bg-white/5 p-5 rounded-xl border border-white/10 flex flex-col justify-between hover:bg-white/10 hover:border-indigo-500/30 transition-all shadow-sm"
                                    >
                                      <div>
                                        <div className="flex items-start justify-between gap-2">
                                          <div>
                                            <span className="text-[10px] bg-white/10 text-slate-300 border border-white/5 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                                              {vendor.category}
                                            </span>
                                            <h4 className="font-display font-bold text-sm text-white mt-1.5">
                                              {vendor.name}
                                            </h4>
                                          </div>
                                          <div className="text-right">
                                            <span className="text-xs font-mono font-extrabold text-indigo-200 bg-indigo-500/20 border border-indigo-400/20 px-2 py-1 rounded block text-center">
                                              {formatVendorCost(vendor.estimatedCost)}
                                            </span>
                                            <div className="flex items-center justify-end gap-1 mt-1 text-amber-400">
                                              <Star className="w-3 h-3 fill-current" />
                                              <span className="text-[10px] font-bold text-slate-300">{vendor.rating}</span>
                                            </div>
                                          </div>
                                        </div>

                                        <p className="text-xs text-slate-300 leading-relaxed mt-3 border-t border-white/10 pt-2.5">
                                          {vendor.description}
                                        </p>
                                      </div>

                                      <div className="mt-4 pt-3 border-t border-white/10">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                                          Negotiation Questions & Tips
                                        </span>
                                        <ul className="space-y-1">
                                          {vendor.tips.map((tip, tipIdx) => (
                                            <li key={tipIdx} className="text-xs text-slate-300 flex items-start gap-1.5 leading-relaxed">
                                              <ChevronRight className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                                              <span>{tip}</span>
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    </motion.div>
                                  ))}
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}

                  </div>
                ) : (
                  /* Workspace Empty State */
                  <div className="bg-white/10 backdrop-blur-xl p-12 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.2)] border border-white/15 text-center flex flex-col items-center justify-center min-h-500px">
                    <PartyPopper className="w-12 h-12 text-slate-400 mb-4" />
                    <h2 className="font-display font-bold text-xl text-white">
                      No Active Event Selected
                    </h2>
                    <p className="text-sm text-slate-300 mt-1 max-w-sm">
                      Select an existing event profile from the left sidebar or configure a new profile above to begin coordinating.
                    </p>
                  </div>
                )}
              </div>

            </div>
          </div>
        )}
      </main>

      {/* Persistent footer */}
      <footer className="bg-black/40 border-t border-white/10 py-6 text-center text-xs text-slate-400 print:hidden mt-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p>© 2026 Event Planner AI</p>
        </div>
      </footer>

    </div>
  );
}
