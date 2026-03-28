import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import Accounts from "@/pages/Accounts";
import AccountDetail from "@/pages/AccountDetail";
import Members from "@/pages/Members";
import MemberDetail from "@/pages/MemberDetail";
import Categories from "@/pages/Categories";
import ConnectionTemplates from "@/pages/ConnectionTemplates";
import ConnectionTemplateDetail from "@/pages/ConnectionTemplateDetail";
import SkillTemplates from "@/pages/SkillTemplates";
import SkillTemplateDetail from "@/pages/SkillTemplateDetail";

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: "/", element: <Dashboard /> },
      { path: "/accounts", element: <Accounts /> },
      { path: "/accounts/:id", element: <AccountDetail /> },
      { path: "/members", element: <Members /> },
      { path: "/members/:id", element: <MemberDetail /> },
      { path: "/backoffice/categories", element: <Categories /> },
      { path: "/backoffice/connection-templates", element: <ConnectionTemplates /> },
      { path: "/backoffice/connection-templates/:id", element: <ConnectionTemplateDetail /> },
      { path: "/backoffice/skill-templates", element: <SkillTemplates /> },
      { path: "/backoffice/skill-templates/:id", element: <SkillTemplateDetail /> },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
