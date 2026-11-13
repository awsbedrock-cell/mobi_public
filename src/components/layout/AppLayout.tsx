import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { BottomNav } from './BottomNav'
import { MobileDrawer, Sidebar } from './Sidebar'
import { Topbar } from './Topbar'

export function AppLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [pathname])

  return (
    <div className="flex min-h-dvh">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenu={() => setDrawerOpen(true)} />
        <main className="mx-auto w-full max-w-[1500px] flex-1 px-3 pb-24 pt-4 sm:px-5 sm:pt-5 md:pb-8 lg:px-6">
          <Outlet />
        </main>
      </div>
      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <BottomNav onMore={() => setDrawerOpen(true)} />
    </div>
  )
}
