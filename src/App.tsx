import { useEffect } from "react"
import { createBrowserRouter, RouterProvider } from "react-router"
import AdminPage from "./AdminPage"
import HomePage from "./pages/HomePage"
import ArchivePage from "./pages/ArchivePage"
import NotFoundPage from "./pages/NotFoundPage"
import { archivePages } from "./data/club"
import trackVisit from "./lib/analytics"
import { updatePageMetadata } from "./seo"

const router = createBrowserRouter([
  { path: "/", Component: HomePage },
  { path: "/admin", Component: AdminPage },
  ...archivePages.map((page) => ({
    path: `/leadership/${page.slug}`,
    Component: () => <ArchivePage page={page} />,
  })),
  { path: "*", Component: NotFoundPage },
])

export default function App() {
  useEffect(() => {
    trackVisit()
  }, [])
  useEffect(() => {
    updatePageMetadata(router.state.location.pathname)
    return router.subscribe((state) =>
      updatePageMetadata(state.location.pathname),
    )
  }, [])
  return <RouterProvider router={router} />
}
