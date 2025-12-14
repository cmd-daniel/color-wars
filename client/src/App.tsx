import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import LobbyPage from "@/pages/LobbyPage";
import RoomPage from "@/pages/RoomPage";
import "./App.css";
import ErrorBoundary from "./components/ErrorBoundary";


const router = createBrowserRouter([
  {
    errorElement: <ErrorBoundary />,
    children: [
      {
        index: true,
        element: <LobbyPage />,
      },
      {
        path: "/room/:roomId",
        element: <RoomPage />,
      },
    ],
  },
]);

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <RouterProvider router={router} />
    </ThemeProvider>
  );
}

export default App;
