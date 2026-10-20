import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Wallet,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  PieChart,
  Target,
  BarChart3,
  ArrowLeftRight,
  FileSpreadsheet,
  Bell,
  LayoutDashboard,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  CreditCard,
  Check,
  DollarSign,
  ChevronRight,
  Shield,
  Clock,
  Layers,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

export default function LandingPage() {
  const features = [
    {
      title: 'Expense Tracking',
      desc: 'Record, categorize, search, and manage daily expenses with real-time balance calculations.',
      icon: TrendingDown,
      iconColor: 'text-rose-500 bg-rose-500/10 border-rose-500/20',
      link: '/expenses',
    },
    {
      title: 'Income Management',
      desc: 'Track pocket money, scholarships, salaries, freelance earnings, and multiple cash flows.',
      icon: TrendingUp,
      iconColor: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
      link: '/income',
    },
    {
      title: 'Smart Budget Planning',
      desc: 'Set monthly budgets and category-wise spending limits with automatic progress monitoring.',
      icon: PieChart,
      iconColor: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
      link: '/budgets',
    },
    {
      title: 'Savings Goals',
      desc: 'Create financial targets, monitor savings contributions, and track milestones with visual progress bars.',
      icon: Target,
      iconColor: 'text-pink-500 bg-pink-500/10 border-pink-500/20',
      link: '/goals',
    },
    {
      title: 'Financial Analytics',
      desc: 'Understand spending patterns through interactive charts, category distributions, and trend analysis.',
      icon: BarChart3,
      iconColor: 'text-cyan-500 bg-cyan-500/10 border-cyan-500/20',
      link: '/analytics',
    },
    {
      title: 'Transaction History',
      desc: 'Search, filter, and review complete financial transactions across payment methods and dates.',
      icon: ArrowLeftRight,
      iconColor: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
      link: '/transactions',
    },
    {
      title: 'Financial Reports',
      desc: 'Generate and export comprehensive PDF statements and Excel XLSX spreadsheets for personal records.',
      icon: FileSpreadsheet,
      iconColor: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
      link: '/reports',
    },
    {
      title: 'Budget Alerts',
      desc: 'Receive timely warnings when category spending approaches or exceeds predefined limits.',
      icon: Bell,
      iconColor: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20',
      link: '/notifications',
    },
    {
      title: 'Personalized Dashboard',
      desc: 'View income, expenses, current balance, and savings in a centralized, intuitive command center.',
      icon: LayoutDashboard,
      iconColor: 'text-teal-500 bg-teal-500/10 border-teal-500/20',
      link: '/dashboard',
    },
    {
      title: 'Secure Account Management',
      desc: 'Manage your profile, password, multi-currency preference ($ / € / ₹ / £), and security credentials.',
      icon: ShieldCheck,
      iconColor: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20',
      link: '/profile',
    },
  ];

  const steps = [
    {
      num: '01',
      title: 'Create Your Account',
      desc: 'Sign up in under 30 seconds as a Student or Premium member and select your preferred reporting currency.',
    },
    {
      num: '02',
      title: 'Record Income & Expenses',
      desc: 'Quickly log daily purchases, salaries, freelance payouts, and assign categories and payment methods.',
    },
    {
      num: '03',
      title: 'Set Budgets & Savings Goals',
      desc: 'Define spending thresholds for Food, Commute, or Bills, and track targeted savings for major purchases.',
    },
    {
      num: '04',
      title: 'Review Financial Insights',
      desc: 'Access interactive charts, download monthly PDF/Excel statements, and make informed financial decisions.',
    },
  ];

  const benefits = [
    {
      title: 'Better Spending Awareness',
      desc: 'Pinpoint exactly where your money goes every day and eliminate unnecessary or impulse expenditures.',
    },
    {
      title: 'Organized Financial Records',
      desc: 'Keep all receipts, payments, and income streams archived cleanly in a searchable database.',
    },
    {
      title: 'Improved Budget Discipline',
      desc: 'Stay ahead of month-end crunches with automated threshold warnings before exceeding category caps.',
    },
    {
      title: 'Clear Savings Targets',
      desc: 'Watch your emergency funds and personal savings milestones grow with contribution timelines.',
    },
    {
      title: 'Convenient Financial Reports',
      desc: 'Export tax-ready, clean PDF statements and Excel workbooks with a single click anytime.',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-white scroll-smooth">
      {/* Top Navbar */}
      <header className="border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <NavLink to="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-md shadow-emerald-500/20">
                <Wallet className="w-5 h-5 text-slate-950 font-bold" />
              </div>
              <span className="font-bold text-xl tracking-tight text-white">
                BudgetBuddy
              </span>
            </NavLink>

            <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
              <a href="#" className="hover:text-white transition-colors">Home</a>
              <a href="#features" className="hover:text-white transition-colors">Features</a>
              <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
              <a href="#benefits" className="hover:text-white transition-colors">Benefits</a>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <NavLink
              to="/login"
              className="text-sm font-medium text-slate-300 hover:text-white px-3 py-1.5 transition-colors"
            >
              Sign In
            </NavLink>
            <NavLink
              to="/register"
              className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-sm transition-all shadow-md shadow-emerald-500/20"
            >
              Get Started
            </NavLink>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-20 lg:pt-28 lg:pb-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mb-8">
            <Sparkles className="w-4 h-4" />
            <span>Smart Personal Finance & Budget Planning Platform</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-tight">
            Take Control of Your Money. <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
              Build a Better Financial Future.
            </span>
          </h1>

          <p className="mt-6 text-base sm:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
            BudgetBuddy helps you track expenses, manage monthly budgets, set savings goals, and make smarter financial decisions.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <NavLink
              to="/register"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-base transition-all shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 group"
            >
              <span>Get Started Free</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </NavLink>

            <a
              href="#features"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white border border-slate-700/80 font-semibold text-base transition-colors flex items-center justify-center gap-2"
            >
              <span>Explore Features</span>
            </a>
          </div>

          {/* Financial Overview Preview (Illustrative Product Preview) */}
          <div className="mt-16 max-w-5xl mx-auto">
            <div className="bg-slate-900/90 rounded-2xl p-6 sm:p-8 border border-slate-800 shadow-2xl relative text-left">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 mb-6 border-b border-slate-800 gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-widest text-emerald-400 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                      Illustrative Product Preview
                    </span>
                    <span className="text-xs text-slate-400">Live Dashboard Experience</span>
                  </div>
                  <h2 className="text-xl font-bold text-white mt-1">Financial Command Center</h2>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Real-Time Database Sync</span>
                </div>
              </div>

              {/* Sample Metrics Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <div className="flex justify-between items-center text-xs text-slate-400 mb-2">
                    <span>Total Balance</span>
                    <Wallet className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="text-2xl font-bold text-white">$4,850.00</div>
                  <div className="text-[11px] text-emerald-400 flex items-center gap-1 mt-1">
                    <ArrowUpRight className="w-3 h-3" /> +12.4% this month
                  </div>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <div className="flex justify-between items-center text-xs text-slate-400 mb-2">
                    <span>Monthly Income</span>
                    <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-2xl font-bold text-emerald-400">$3,200.00</div>
                  <div className="text-[11px] text-slate-400 mt-1">Salary & Scholarships</div>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <div className="flex justify-between items-center text-xs text-slate-400 mb-2">
                    <span>Monthly Expenses</span>
                    <ArrowDownRight className="w-4 h-4 text-rose-400" />
                  </div>
                  <div className="text-2xl font-bold text-rose-400">$1,420.00</div>
                  <div className="text-[11px] text-slate-400 mt-1">Within planned limits</div>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <div className="flex justify-between items-center text-xs text-slate-400 mb-2">
                    <span>Savings Progress</span>
                    <Target className="w-4 h-4 text-purple-400" />
                  </div>
                  <div className="text-2xl font-bold text-purple-400">$1,780.00</div>
                  <div className="text-[11px] text-emerald-400 mt-1">89% of monthly target</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Ambient Gradient Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -z-10" />
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-slate-900/60 border-y border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Everything You Need to Manage Your Money
            </h2>
            <p className="mt-4 text-base sm:text-lg text-slate-400 leading-relaxed">
              Track expenses, plan budgets, build savings, and understand your financial habits — all in one place.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feat, idx) => {
              const Icon = feat.icon;
              return (
                <div
                  key={idx}
                  className="bg-slate-900 p-6 rounded-2xl border border-slate-800 hover:border-emerald-500/40 transition-all duration-200 flex flex-col justify-between group hover:-translate-y-1"
                >
                  <div className="space-y-3">
                    <div className={`w-12 h-12 rounded-xl border flex items-center justify-center ${feat.iconColor}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-bold text-white group-hover:text-emerald-300 transition-colors">
                      {feat.title}
                    </h3>
                    <p className="text-sm text-slate-400 leading-relaxed">
                      {feat.desc}
                    </p>
                  </div>

                  <div className="mt-5 pt-4 border-t border-slate-800 flex items-center justify-between text-xs font-semibold text-emerald-400">
                    <NavLink to={feat.link} className="flex items-center gap-1 hover:underline">
                      <span>Explore feature</span>
                      <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </NavLink>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl font-extrabold text-white tracking-tight">
            How BudgetBuddy Works
          </h2>
          <p className="mt-3 text-slate-400">
            Four simple steps to complete personal financial organization.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((st) => (
            <div key={st.num} className="bg-slate-900 p-6 rounded-2xl border border-slate-800 relative">
              <div className="text-3xl font-extrabold text-emerald-500/40 font-mono mb-3">
                {st.num}
              </div>
              <h3 className="text-base font-bold text-white mb-2">
                {st.title}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {st.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefits" className="py-20 bg-slate-900/40 border-y border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-3xl font-extrabold text-white tracking-tight">
              Designed for Real Financial Impact
            </h2>
            <p className="mt-3 text-slate-400">
              Transform the way you handle money with tangible everyday advantages.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {benefits.map((b, i) => (
              <div key={i} className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center flex-shrink-0 mt-0.5 border border-emerald-500/20">
                  <Check className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">{b.title}</h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">{b.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final Call to Action */}
      <section className="py-24 text-center max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-tr from-slate-900 to-slate-850 p-10 sm:p-14 rounded-3xl border border-slate-800 shadow-2xl relative overflow-hidden">
          <div className="relative z-10 space-y-4">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Start Managing Your Money Smarter Today.
            </h2>
            <p className="text-slate-300 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
              Join thousands of users who have streamlined their expenses, hit their savings goals, and gained financial peace of mind.
            </p>
            <div className="pt-4">
              <NavLink
                to="/register"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-base transition-all shadow-lg shadow-emerald-500/25"
              >
                <span>Create Your Free Account</span>
                <ArrowRight className="w-4 h-4" />
              </NavLink>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-950 py-12 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center font-bold text-slate-950">
              <Wallet className="w-4 h-4" />
            </div>
            <span className="font-bold text-base text-white">BudgetBuddy</span>
            <span className="text-xs text-slate-500 ml-2">Personal Budget & Expense Management</span>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs text-slate-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
            <a href="#benefits" className="hover:text-white transition-colors">Benefits</a>
            <NavLink to="/login" className="hover:text-white transition-colors">Sign In</NavLink>
            <NavLink to="/register" className="hover:text-white transition-colors">Sign Up</NavLink>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 pt-6 border-t border-slate-900 text-center text-xs text-slate-500">
          <p>&copy; {new Date().getFullYear()} BudgetBuddy Platform. All rights reserved. Secure JWT encrypted session management.</p>
        </div>
      </footer>
    </div>
  );
}
