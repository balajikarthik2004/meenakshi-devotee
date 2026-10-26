import { Suspense, lazy } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ToastProvider } from '@/components/ui/toast'
import {
  AppLayout,
  DonorLayout,
  OpenLayout,
  MinimalLayout,
  PublicLayout,
  RequireAuth,
  RequireDonor,
} from '@/components/layout/layouts'
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
const ProjectsIndex = lazy(() => import('@/pages/ProjectsIndex'))
const ProjectDetail = lazy(() => import('@/pages/ProjectDetail'))
const Cafeteria = lazy(() => import('@/pages/Cafeteria'))
const MyOrders = lazy(() => import('@/pages/MyOrders'))
const School = lazy(() => import('@/pages/School'))
const ClassDetail = lazy(() => import('@/pages/ClassDetail'))
const MyClasses = lazy(() => import('@/pages/MyClasses'))
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
const MyPledges = lazy(() => import('@/pages/MyPledges'))
const MyReceipts = lazy(() => import('@/pages/MyReceipts'))
const Facility = lazy(() => import('@/pages/Facility'))
const MyHalls = lazy(() => import('@/pages/MyHalls'))
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

            {/* Giving — open to a signed-in devotee and to a guest donor alike.
                `/donate` asks an unrecognised visitor for their details in place of
                bouncing them to sign-in; `/my/donations` needs one identity or the
                other, and `RequireDonor` accepts either. */}
            {/* Open to a guest and to a signed-in devotee alike, so each keeps the
                chrome it navigated from. The capital programme is public because it
                is part of the transparency promise, not something behind a sign-in —
                but a devotee who reaches it from the sidebar keeps the sidebar. */}
            <Route element={<OpenLayout />}>
              <Route path="/projects" element={<ProjectsIndex />} />
              <Route path="/projects/:slug" element={<ProjectDetail />} />
              {/* A visitor after darshan should be able to order a coffee without
                  first making an account. The order carries a name and a phone
                  number, which is all the counter needs to call it out. */}
              <Route path="/kitchen" element={<Cafeteria />} />
              <Route path="/my/orders" element={<MyOrders />} />
              {/* The school catalogue is public — a family deciding whether to join
                  should see the classes before being asked for an account. */}
              <Route path="/school" element={<School />} />
              <Route path="/school/:slug" element={<ClassDetail />} />
              <Route path="/my/classes" element={<MyClasses />} />
            </Route>

            <Route element={<DonorLayout />}>
              <Route path="/donate" element={<Donate />} />
              <Route element={<RequireDonor />}>
                <Route path="/my/donations" element={<MyDonations />} />
                {/* A pledge can be made as a guest, so reading it back is gated the
                    same way the giving history is — an identity of either kind. */}
                <Route path="/my/pledges" element={<MyPledges />} />
              </Route>
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
                <Route path="/membership" element={<MembershipPage />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/my/pujas" element={<MyPujas />} />
                <Route path="/my/receipts" element={<MyReceipts />} />
                <Route path="/facility" element={<Facility />} />
                <Route path="/my/halls" element={<MyHalls />} />
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
