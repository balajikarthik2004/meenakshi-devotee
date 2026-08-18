import { Suspense, lazy } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ToastProvider } from '@/components/ui/toast'
import { AppLayout, MinimalLayout, PublicLayout, RequireAuth } from '@/components/layout/layouts'
import { ScrollToTop } from '@/components/layout/ScrollToTop'
import { LoadingSkeleton } from '@/components/shared/states'

/**
 * Routes are lazy so the first paint ships only the homepage. The booking wizard,
 * calendar and receipt screens each land in their own chunk.
 */
const Home = lazy(() => import('@/pages/Home'))
const CalendarPage = lazy(() => import('@/pages/CalendarPage'))
const EventsIndex = lazy(() => import('@/pages/EventsIndex'))
const EventDetail = lazy(() => import('@/pages/EventDetail'))
const About = lazy(() => import('@/pages/About'))
const SignIn = lazy(() => import('@/pages/SignIn'))
const SignUp = lazy(() => import('@/pages/SignUp'))
const Dashboard = lazy(() => import('@/pages/Dashboard'))
const PujaCatalogue = lazy(() => import('@/pages/PujaCatalogue'))
const BookingFlow = lazy(() => import('@/pages/BookingFlow'))
const Donate = lazy(() => import('@/pages/Donate'))
const MembershipPage = lazy(() => import('@/pages/Membership'))
const Profile = lazy(() => import('@/pages/Profile'))
const MyPujas = lazy(() => import('@/pages/MyPujas'))
const MyDonations = lazy(() => import('@/pages/MyDonations'))
const MyReceipts = lazy(() => import('@/pages/MyReceipts'))
const Facility = lazy(() => import('@/pages/Facility'))
const DevGallery = lazy(() => import('@/pages/DevGallery'))
const NotFound = lazy(() => import('@/pages/NotFound'))

const RouteFallback = () => (
  <div className="mx-auto max-w-6xl px-6 py-10">
    <LoadingSkeleton variant="tiles" rows={3} />
  </div>
)

export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <ScrollToTop />
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            {/* Public */}
            <Route element={<PublicLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/calendar" element={<CalendarPage />} />
              <Route path="/events" element={<EventsIndex />} />
              <Route path="/events/:slug" element={<EventDetail />} />
              <Route path="/about" element={<About />} />
              <Route path="/dev" element={<DevGallery />} />
            </Route>

            {/* Auth */}
            <Route element={<MinimalLayout />}>
              <Route path="/signin" element={<SignIn />} />
              <Route path="/signup" element={<SignUp />} />
            </Route>

            {/* Devotee app */}
            <Route element={<RequireAuth />}>
              <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/puja" element={<PujaCatalogue />} />
                <Route path="/puja/yearly" element={<PujaCatalogue filter="yearly" />} />
                <Route path="/puja/monthly" element={<PujaCatalogue filter="monthly" />} />
                <Route path="/puja/one-time" element={<PujaCatalogue filter="one-time" />} />
                <Route path="/puja/abhishekam" element={<PujaCatalogue filter="abhishekam" />} />
                <Route path="/puja/book/:pujaId" element={<BookingFlow />} />
                <Route path="/donate" element={<Donate />} />
                <Route path="/membership" element={<MembershipPage />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/my/pujas" element={<MyPujas />} />
                <Route path="/my/donations" element={<MyDonations />} />
                <Route path="/my/receipts" element={<MyReceipts />} />
                <Route path="/facility" element={<Facility />} />
              </Route>
            </Route>

            <Route path="/home" element={<Navigate to="/" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ToastProvider>
  )
}
