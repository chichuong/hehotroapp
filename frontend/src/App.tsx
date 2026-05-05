import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import AuthGuard from "./components/AuthGuard";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import PropertyListPage from "./pages/PropertyListPage";
import PropertyDetailPage from "./pages/PropertyDetailPage";
import MapPage from "./pages/MapPage";
import FavoritesPage from "./pages/FavoritesPage";
import DSSProfilePage from "./pages/DSSProfilePage";
import AHPSetupPage from "./pages/AHPSetupPage";
import RankingPage from "./pages/RankingPage";
import ModelManagementPage from "./pages/ModelManagementPage";
import RecommendationsPage from "./pages/RecommendationsPage";
import ComparePage from "./pages/ComparePage";
import DashboardPage from "./pages/DashboardPage";
import InsightsPage from "./pages/InsightsPage";
import AdminOverviewPage from "./pages/AdminOverviewPage";
import ChatPage from "./pages/ChatPage";

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/properties" element={<PropertyListPage />} />
        <Route path="/properties/:id" element={<PropertyDetailPage />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/insights" element={<InsightsPage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/favorites" element={<FavoritesPage />} />
        <Route
          path="/compare"
          element={
            <AuthGuard>
              <ComparePage />
            </AuthGuard>
          }
        />
        <Route
          path="/dashboard"
          element={
            <AuthGuard>
              <DashboardPage />
            </AuthGuard>
          }
        />
        <Route
          path="/dss/profile"
          element={
            <AuthGuard>
              <DSSProfilePage />
            </AuthGuard>
          }
        />
        <Route
          path="/dss/ahp"
          element={
            <AuthGuard>
              <AHPSetupPage />
            </AuthGuard>
          }
        />
        <Route
          path="/dss/ranking"
          element={
            <AuthGuard>
              <RankingPage />
            </AuthGuard>
          }
        />
        <Route
          path="/dss/recommendations"
          element={
            <AuthGuard>
              <RecommendationsPage />
            </AuthGuard>
          }
        />
        <Route
          path="/admin/overview"
          element={
            <AuthGuard>
              <AdminOverviewPage />
            </AuthGuard>
          }
        />
        <Route
          path="/admin/models"
          element={
            <AuthGuard>
              <ModelManagementPage />
            </AuthGuard>
          }
        />
      </Routes>
    </Layout>
  );
}
