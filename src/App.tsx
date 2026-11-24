/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  Menu,
  X,
  Compass,
  LayoutDashboard,
  GitBranch,
  Table2,
  Sigma,
  Network,
  Layers,
  PlayCircle,
  ShieldAlert,
  Scale,
  BookOpen,
  Info,
  Home,
} from 'lucide-react';
import { DemoExample, PageId } from './engine/types';
import { LandingPage } from './pages/LandingPage';
import { DashboardPage } from './pages/DashboardPage';
import { HierarchyPage } from './pages/HierarchyPage';
import { RecursiveDescentPage } from './pages/parsers/RecursiveDescentPage';
import { LL1ParserPage } from './pages/parsers/LL1ParserPage';
import { OPPParserPage } from './pages/parsers/OPPParserPage';
import { LRParserPage } from './pages/parsers/LRParserPage';
import { LRConceptPage } from './pages/parsers/LRConceptPage';
import { LROverviewPage } from './pages/LROverviewPage';
import { DemoExamplesPage } from './pages/DemoExamplesPage';
import { ErrorCorrectionPage } from './pages/ErrorCorrectionPage';
import { ComparisonPage } from './pages/ComparisonPage';
import { TheoryPage } from './pages/TheoryPage';
import { AboutPage } from './pages/AboutPage';

interface NavGroup {
  heading: string;
  items: Array<{
    id: PageId;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }>;
}

const SIDEBAR_GROUPS: NavGroup[] = [
  {
    heading: 'Overview',
    items: [
      { id: 'landing', label: 'Landing Page', icon: Home },
      { id: 'dashboard', label: 'Main Dashboard', icon: LayoutDashboard },
      { id: 'hierarchy', label: '3D Hierarchy Explorer', icon: Compass },
    ],
  },
  {
    heading: 'Top-Down Parsers',
    items: [
      { id: 'rd', label: 'Recursive Descent', icon: GitBranch },
      { id: 'll1', label: 'LL(1) Parser', icon: Table2 },
    ],
  },
  {
    heading: 'Bottom-Up Parsers',
    items: [
      { id: 'opp', label: 'Operator Precedence', icon: Sigma },
      { id: 'lr-overview', label: 'LR Parser Overview', icon: Layers },
      { id: 'lr0', label: 'LR(0) Parser', icon: Network },
    ],
  },
  {
    heading: 'Tools & Reference',
    items: [
      { id: 'demos', label: 'Demo Examples', icon: PlayCircle },
      { id: 'errors', label: 'Error Detection Lab', icon: ShieldAlert },
      { id: 'comparison', label: 'Parser Comparison', icon: Scale },
      { id: 'theory', label: 'Learning / Theory', icon: BookOpen },
      { id: 'about', label: 'About Project', icon: Info },
    ],
  },
];

function getInitialPage(): PageId {
  if (typeof window === 'undefined') return 'landing';
  const params = new URLSearchParams(window.location.search);
  const explicitPage = params.get('page') as PageId | null;
  if (explicitPage) return explicitPage;
  if (params.get('autostart') === '1') return 'dashboard';
  try {
    const saved = window.sessionStorage.getItem('pv3d_active_page') as PageId | null;
    if (saved) return saved;
  } catch {
    // ignore storage errors
  }
  return 'landing';
}

export default function App() {
  const [page, setPage] = useState<PageId>(getInitialPage);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [pendingDemo, setPendingDemo] = useState<DemoExample | null>(null);

  const navigate = useCallback((nextPage: PageId) => {
    setPage(nextPage);
    setMobileNavOpen(false);
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  const handleLaunchDemo = useCallback((demo: DemoExample) => {
    setPendingDemo(demo);
    setPage(demo.parser);
    setMobileNavOpen(false);
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  const clearPendingDemo = useCallback(() => {
    setPendingDemo(null);
  }, []);

  useEffect(() => {
    document.body.dataset.page = page;
    try {
      window.sessionStorage.setItem('pv3d_active_page', page);
    } catch {
      // ignore storage errors
    }
  }, [page]);

  const isLanding = page === 'landing';

  const renderPage = () => {
    switch (page) {
      case 'landing':
        return <LandingPage onNavigate={navigate} />;
      case 'dashboard':
        return <DashboardPage onNavigate={navigate} onLaunchDemo={handleLaunchDemo} />;
      case 'hierarchy':
        return <HierarchyPage onNavigate={navigate} />;
      case 'rd':
        return (
          <RecursiveDescentPage
            externalDemo={pendingDemo}
            onClearExternalDemo={clearPendingDemo}
          />
        );
      case 'll1':
        return (
          <LL1ParserPage
            externalDemo={pendingDemo}
            onClearExternalDemo={clearPendingDemo}
          />
        );
      case 'opp':
        return (
          <OPPParserPage
            externalDemo={pendingDemo}
            onClearExternalDemo={clearPendingDemo}
          />
        );
      case 'lr-overview':
        return <LROverviewPage onNavigate={navigate} />;
      case 'lr0':
        return (
          <LRParserPage
            variant="lr0"
            externalDemo={pendingDemo}
            onClearExternalDemo={clearPendingDemo}
          />
        );
      case 'slr1':
        return <LRConceptPage variant="slr1" onNavigate={navigate} />;
      case 'clr1':
        return <LRConceptPage variant="clr1" onNavigate={navigate} />;
      case 'lalr1':
        return <LRConceptPage variant="lalr1" onNavigate={navigate} />;
      case 'demos':
        return <DemoExamplesPage onLaunchDemo={handleLaunchDemo} />;
      case 'errors':
        return <ErrorCorrectionPage onLaunchDemo={handleLaunchDemo} />;
      case 'comparison':
        return <ComparisonPage onNavigate={navigate} />;
      case 'theory':
        return <TheoryPage onNavigate={navigate} />;
      case 'about':
        return <AboutPage onNavigate={navigate} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F1E8] text-[#2B1B22] flex flex-col">
      {/* Clean 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-40 h-16 bg-[#FFFDF9]/95 border-b border-[#E4D4C3] px-4 sm:px-6 flex items-center justify-between gap-8">
        {/* Zone 1: Single-line Brand Wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          {!isLanding && (
            <button
              type="button"
              onClick={() => setMobileNavOpen((v) => !v)}
              className="lg:hidden p-2 -ml-2 rounded-lg text-[#5A404B] hover:text-[#2B1B22] hover:bg-[#F3E7DB] cursor-pointer"
              aria-label={mobileNavOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileNavOpen}
            >
              {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          )}
          <button
            type="button"
            onClick={() => navigate('landing')}
            className="font-display font-bold text-lg tracking-tight text-[#2B1B22] hover:text-[#B42A60] transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            Parser Visualizer 3D
          </button>
        </div>

        {/* Zone 2: 5 concise single-line text navigation links */}
        <nav
          className="hidden md:flex items-center gap-6 text-sm font-medium text-[#5A404B]"
          aria-label="Primary navigation"
        >
          {(
            [
              { id: 'dashboard' as PageId, label: 'Dashboard' },
              { id: 'hierarchy' as PageId, label: '3D Hierarchy' },
              { id: 'demos' as PageId, label: 'Demos' },
              { id: 'comparison' as PageId, label: 'Compare' },
              { id: 'theory' as PageId, label: 'Theory' },
            ]
          ).map((link) => {
            const active = page === link.id;
            return (
              <button
                key={link.id}
                type="button"
                onClick={() => navigate(link.id)}
                className={`py-1 border-b-2 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  active
                    ? 'text-[#B42A60] border-[#C93B72] font-semibold'
                    : 'border-transparent hover:text-[#2B1B22] hover:border-[#DFB9C8]'
                }`}
              >
                {link.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: 1 Primary Action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={() => navigate(page === 'errors' ? 'hierarchy' : 'errors')}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#C93B72] text-white hover:bg-[#AD2B5D] transition-colors cursor-pointer whitespace-nowrap shrink-0 shadow-xs"
          >
            {page === 'errors' ? '3D Explorer' : 'Error Lab'}
          </button>
        </div>
      </header>

      {/* Main Content Layout */}
      {isLanding ? (
        <main className="flex-1 w-full max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8">
          {renderPage()}
        </main>
      ) : (
        <div className="flex-1 flex relative">
          {/* Desktop Persistent Left Navigation Rail */}
          <aside
            className="hidden lg:block w-68 shrink-0 border-r border-[#E4D4C3] bg-[#EFE5D8] px-3 py-5 overflow-y-auto"
            aria-label="Parser modules navigation"
          >
            <div className="space-y-6">
              {SIDEBAR_GROUPS.map((group) => (
                <div key={group.heading} className="space-y-1">
                  <div className="px-3 text-[11px] font-semibold text-[#7A5E69]">
                    {group.heading}
                  </div>
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const active = page === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => navigate(item.id)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                          active
                            ? 'bg-[#FCEAF1] text-[#8F1F4C] border border-[#E8B4C9] font-semibold'
                            : 'text-[#4C3640] border border-transparent hover:bg-[#F8F1E7] hover:text-[#2B1B22]'
                        }`}
                      >
                        <Icon
                          className={`w-4 h-4 shrink-0 ${
                            active ? 'text-[#C93B72]' : 'text-[#8B6C78]'
                          }`}
                        />
                        <span className="truncate">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </aside>

          {/* Mobile Drawer Navigation */}
          {mobileNavOpen && (
            <div className="lg:hidden fixed inset-0 z-50 flex">
              <div
                className="fixed inset-0 bg-[#2B1B22]/45"
                onClick={() => setMobileNavOpen(false)}
                aria-hidden="true"
              />
              <aside className="relative z-10 w-72 max-w-[85vw] bg-[#EFE5D8] border-r border-[#E4D4C3] p-4 overflow-y-auto space-y-5 shadow-xl">
                <div className="flex items-center justify-between border-b border-[#DFCCB8] pb-3">
                  <span className="font-display font-bold text-base text-[#2B1B22]">
                    Parser Modules
                  </span>
                  <button
                    type="button"
                    onClick={() => setMobileNavOpen(false)}
                    className="p-1.5 rounded-md text-[#6E535E] hover:text-[#2B1B22] cursor-pointer"
                    aria-label="Close module menu"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                {SIDEBAR_GROUPS.map((group) => (
                  <div key={group.heading} className="space-y-1">
                    <div className="px-2.5 text-[11px] font-semibold text-[#7A5E69]">
                      {group.heading}
                    </div>
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const active = page === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => navigate(item.id)}
                          className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                            active
                              ? 'bg-[#FCEAF1] text-[#8F1F4C] border border-[#E8B4C9] font-semibold'
                              : 'text-[#4C3640] hover:bg-[#F8F1E7] hover:text-[#2B1B22]'
                          }`}
                        >
                          <Icon className="w-4 h-4 shrink-0" />
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                ))}
              </aside>
            </div>
          )}

          {/* Active Module Main Canvas */}
          <main className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-6 max-w-[1280px] mx-auto w-full">
            {renderPage()}
          </main>
        </div>
      )}

      {/* Quiet Footer */}
      <footer className="border-t border-[#E4D4C3] bg-[#EFE5D8] px-6 py-4 text-xs text-[#6E535E] flex flex-wrap items-center justify-between gap-4">
        <span>Parser Visualizer 3D · Compiler Construction Interactive Platform</span>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigate('about')}
            className="hover:text-[#B42A60] transition-colors cursor-pointer"
          >
            About Project
          </button>
          <button
            type="button"
            onClick={() => navigate('theory')}
            className="hover:text-[#B42A60] transition-colors cursor-pointer"
          >
            Theory Guide
          </button>
          <button
            type="button"
            onClick={() => navigate('demos')}
            className="hover:text-[#B42A60] transition-colors cursor-pointer"
          >
            Demos
          </button>
        </div>
      </footer>
    </div>
  );
}
