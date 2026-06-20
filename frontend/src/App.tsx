import { AnimatePresence, motion } from "framer-motion";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { CustomersPage } from "./pages/Customers";
import { CustomerDetailPage } from "./pages/CustomerDetail";
import { DashboardPage } from "./pages/Dashboard";
import { HeatmapPage } from "./pages/Heatmap";
import { InspectorPage } from "./pages/Inspector";

function Animated({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function App() {
  const location = useLocation();
  return (
    <AppShell>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Animated><DashboardPage /></Animated>} />
          <Route path="/heatmap" element={<Animated><HeatmapPage /></Animated>} />
          <Route path="/customers" element={<Animated><CustomersPage /></Animated>} />
          <Route
            path="/customers/:customerId"
            element={<Animated><CustomerDetailPage /></Animated>}
          />
          <Route path="/inspector" element={<Animated><InspectorPage /></Animated>} />
        </Routes>
      </AnimatePresence>
    </AppShell>
  );
}
